//src/features/posts/posts.controller.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "node:stream/consumers";
import crypto from "node:crypto";
import Busboy from "busboy";
import { postsService } from "./posts.service.js";
import { mediaStorage } from "../../db/cloudinary.js";
import { verifySession } from "../auth/verifySession.js";
import type {
  CreatePostDTO,
  UpdatePostDTO,
  Post,
  PostCategory,
} from "./posts.types.js";

const URL_REGEX = /^https?:\/\/([\w\d\-_]+\.)+\.?[\w\d\-_]+(\/.*)?$/i;
const GITHUB_REGEX =
  /^https?:\/\/(www\.)?github\.com\/[\w\-]+\/[\w\-.]+(\/[\w\-./?=&%#]*)?$/i;
const IMAGE_REGEX = /\.(jpeg|jpg|gif|png|webp|avif|svg)(\?.*)?(#.*)?$/i;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_CATEGORIES: PostCategory[] = [
  "bio-engineering",
  "computer-science",
  "projects",
  "diary",
];

export const postsController = {
  async uploadMedia(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const verifyResult = await verifySession(
        req.headers.authorization,
        "uploadMedia",
      );
      if (!verifyResult.ok) {
        res.statusCode = verifyResult.statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(verifyResult.body));
        return;
      }

      const MAX_POST_MEDIA_UPLOAD_BYTES = 5 * 1024 * 1024;
      const bb = Busboy({
        headers: req.headers,
        limits: { files: 1, fileSize: MAX_POST_MEDIA_UPLOAD_BYTES },
      });

      req.on("aborted", () => {
        console.warn(
          "[posts.controller.uploadMedia] Client aborted upload connection midway.",
        );
        req.unpipe(bb);
      });

      let fileProcessed = false;

      bb.on("file", (_name, file, info) => {
        fileProcessed = true;
        file.on("limit", () => {
          console.warn(
            `[posts.controller.uploadMedia] File exceeded max size of ${MAX_POST_MEDIA_UPLOAD_BYTES} bytes.`,
          );
          if (!res.writableEnded) {
            res.statusCode = 413;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ error: "Image exceeds the 5MB size limit." }),
            );
          }
        });

        if (!info.mimeType.startsWith("image/")) {
          res.statusCode = 415;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Only images allowed." }));
          file.resume();
          return;
        }

        let magicNumberBuffer = Buffer.alloc(0);
        let magicNumberChecked = false;

        file.on("data", function checkMagic(chunk) {
          magicNumberBuffer = Buffer.concat([magicNumberBuffer, chunk]);
          if (magicNumberBuffer.length < 12) return;

          magicNumberChecked = true;

          const hex = magicNumberBuffer.toString("hex", 0, 4).toUpperCase();
          const signatures: Record<string, string> = {
            "89504E47": "png",
            FFD8FF: "jpg",
            "47494638": "gif",
            "52494646": "webp",
          };
          const isValidBySignature = Object.keys(signatures).some((sig) =>
            hex.startsWith(sig),
          );
          const ftypBox = magicNumberBuffer.toString("ascii", 4, 8);
          const avifBrand = magicNumberBuffer.toString("ascii", 8, 12);
          const isValidAvif =
            ftypBox === "ftyp" && ["avif", "avis"].includes(avifBrand);
          const isValid = isValidBySignature || isValidAvif;
          if (!isValid) {
            file.destroy(new Error("INVALID_MAGIC_NUMBER"));
          }
          file.removeListener("data", checkMagic);
        });

        file.on("end", () => {
          if (!magicNumberChecked) {
            file.destroy(new Error("INVALID_MAGIC_NUMBER"));
          }
        });

        file.on("error", (err: any) => {
          console.error(
            "[posts.controller.uploadMedia] Busboy file stream error",
            err,
          );
          if (err.message === "INVALID_MAGIC_NUMBER" && !res.writableEnded) {
            res.statusCode = 415;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Spoofed file type detected." }));
          }
        });

        const uploadStream = mediaStorage.uploader.upload_stream(
          {
            folder: "hwapyong/posts",
            resource_type: "auto",
            allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
            timeout: 60000,
          },
          (error, result) => {
            if (error) {
              console.error(
                "[posts.controller.uploadMedia] Cloudinary upload callback error",
                error,
              );
              if (!res.writableEnded) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: "Failed to upload media to storage.",
                  }),
                );
              }
              return;
            }
            if (result && !res.writableEnded) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ url: result.secure_url }));
            }
          },
        );

        uploadStream.on("error", (err: any) => {
          console.error(
            "[posts.controller.uploadMedia] Cloudinary upload stream error",
            err,
          );
          if (!res.writableEnded) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Upload connection lost during processing.",
              }),
            );
          }
        });

        file.pipe(uploadStream);
      });

      bb.on("finish", () => {
        if (!fileProcessed && !res.writableEnded) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "No file uploaded." }));
        }
      });

      req.pipe(bb);
    } catch (err) {
      console.error(
        "[posts.controller.uploadMedia] Unexpected error in uploadMedia",
        err,
      );
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Failed to process media upload." }));
      }
    }
  },

  async getPost(
    req: IncomingMessage,
    res: ServerResponse,
    identifier: string,
  ): Promise<void> {
    try {
      const cleanedId = decodeURIComponent(identifier).trim();
      const isUuid = UUID_REGEX.test(cleanedId);
      const isSlug =
        cleanedId.length >= 3 &&
        cleanedId.length <= 120 &&
        SLUG_REGEX.test(cleanedId);

      if (!isUuid && !isSlug) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid post identifier format." }));
        return;
      }

      const results = await postsService.getPost(cleanedId);
      if (results.rows.length === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Post not found." }));
        return;
      }

      const post = results.rows[0] as Post;

      if (!post.is_published) {
        const verifyResult = await verifySession(
          req.headers.authorization,
          "getPostDraft",
        );
        if (!verifyResult.ok) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Post not found." }));
          return;
        }
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ post }));
    } catch (err) {
      console.error("[posts.controller.getPost] Failed to fetch post", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to fetch post." }));
    }
  },

  async getFilteredPosts(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    try {
      const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
      const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
      const limit = 12;

      const searchQuery = url.searchParams.get("q") || null;
      const category = url.searchParams.get("category") || null;
      const subcategory = url.searchParams.get("subcategory") || null;
      const featuredOnly = url.searchParams.get("featured") === "true";

      const requestedDrafts = url.searchParams.get("include_drafts") === "true";
      let includeDrafts = false;
      if (requestedDrafts) {
        const verifyResult = await verifySession(
          req.headers.authorization,
          "getFilteredPostsDrafts",
        );
        if (verifyResult.ok) {
          includeDrafts = true;
        }
      }

      const tagString = url.searchParams.get("tag");
      let tagsArray: string[] | null = null;
      if (tagString) {
        tagsArray = tagString
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
      }

      const sortBy = url.searchParams.get("sortBy") || "date";
      const sortOrder =
        url.searchParams.get("sortOrder")?.toUpperCase() === "ASC"
          ? "ASC"
          : "DESC";

      const results = await postsService.getFilteredPosts(
        page,
        limit,
        searchQuery,
        category,
        subcategory,
        tagsArray,
        featuredOnly,
        includeDrafts,
        sortBy,
        sortOrder,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          posts: results.rows,
          total: results.totalCount,
          page,
          totalPages: Math.ceil(results.totalCount / limit),
        }),
      );
    } catch (err) {
      console.error(
        "[posts.controller.getFilteredPosts] Failed to filter posts",
        err,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to fetch posts." }));
    }
  },

  async createPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const verifyResult = await verifySession(
        req.headers.authorization,
        "createPost",
      );
      if (!verifyResult.ok) {
        res.statusCode = verifyResult.statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(verifyResult.body));
        return;
      }

      let data: CreatePostDTO;
      try {
        data = (await json(req)) as CreatePostDTO;
      } catch (err) {
        console.error("[posts.controller.createPost] JSON parse failed", err);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid JSON format." }));
        return;
      }

      const trimmedTitle = data.title?.trim() || "";
      if (trimmedTitle.length < 5 || trimmedTitle.length > 150) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Title must be 5-150 characters." }));
        return;
      }

      const trimmedDescription = data.short_description?.trim() || "";
      if (trimmedDescription.length < 10 || trimmedDescription.length > 300) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Description must be 10-300 characters." }),
        );
        return;
      }

      if (
        !data.main_content ||
        data.main_content.length < 50 ||
        data.main_content.length > 40000
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Content must be 50-40,000 characters." }),
        );
        return;
      }

      if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid post category." }));
        return;
      }

      if (
        !data.thumbnail ||
        data.thumbnail.length > 2048 ||
        !URL_REGEX.test(data.thumbnail) ||
        !IMAGE_REGEX.test(data.thumbnail)
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Thumbnail must be a valid image URL." }),
        );
        return;
      }

      if (
        !Array.isArray(data.post_images) ||
        data.post_images.length < 1 ||
        data.post_images.length > 5
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Provide between 1 and 5 images." }));
        return;
      }

      const uniquePostImageUrls = new Set<string>();
      for (const url of data.post_images) {
        if (
          !url ||
          url.length > 2048 ||
          !URL_REGEX.test(url) ||
          !IMAGE_REGEX.test(url)
        ) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Invalid or too long image URL in gallery.",
            }),
          );
          return;
        }
        if (uniquePostImageUrls.has(url)) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Duplicate image URL in gallery." }));
          return;
        }
        uniquePostImageUrls.add(url);
      }

      if (
        !Array.isArray(data.tags) ||
        data.tags.length < 1 ||
        data.tags.length > 5
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Provide between 1 and 5 tags." }));
        return;
      }

      const normalizedTags: string[] = [];
      const uniqueTags = new Set<string>();
      for (const tag of data.tags) {
        const cleaned = String(tag || "")
          .trim()
          .toLowerCase();
        if (
          cleaned.includes(" ") ||
          cleaned.length < 2 ||
          cleaned.length > 25 ||
          uniqueTags.has(cleaned)
        ) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Tags must be unique, 2-25 chars, and no spaces.",
            }),
          );
          return;
        }
        uniqueTags.add(cleaned);
        normalizedTags.push(cleaned);
      }

      if (
        data.external_link &&
        (data.external_link.length > 2048 ||
          !URL_REGEX.test(data.external_link))
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid or too long external URL." }));
        return;
      }

      if (
        data.github_link &&
        (data.github_link.length > 2048 || !GITHUB_REGEX.test(data.github_link))
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Invalid GitHub link. Expected: github.com/username/reponame.",
          }),
        );
        return;
      }

      if (data.category === "projects") {
        if (
          !data.subcategory ||
          !["serious", "random"].includes(data.subcategory)
        ) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: "Subcategory required for projects." }),
          );
          return;
        }
        if (data.subcategory === "serious" && !data.github_link) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Serious projects must have a GitHub link.",
            }),
          );
          return;
        }
      } else if (data.subcategory) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Subcategory is only allowed for projects.",
          }),
        );
        return;
      }

      if (
        data.is_published !== undefined &&
        typeof data.is_published !== "boolean"
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "is_published must be a boolean." }));
        return;
      }

      if (data.featured !== undefined && typeof data.featured !== "boolean") {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "featured must be a boolean." }));
        return;
      }

      let baseSlug = "";
      if (data.slug !== undefined && data.slug !== null && data.slug !== "") {
        const providedSlug = data.slug.trim().toLowerCase();
        if (
          providedSlug.length < 3 ||
          providedSlug.length > 100 ||
          !SLUG_REGEX.test(providedSlug)
        ) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error:
                "Slug must be 3-100 characters of lowercase letters, numbers, and hyphens.",
            }),
          );
          return;
        }
        baseSlug = providedSlug;
      } else {
        const generated = trimmedTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80)
          .replace(/-+$/g, "");
        baseSlug =
          generated.length >= 3
            ? generated
            : `post-${crypto.randomBytes(3).toString("hex")}`;
      }

      let createdPost: Post | null = null;
      let candidateSlug = baseSlug;

      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const result = await postsService.createPost({
            ...data,
            title: trimmedTitle,
            short_description: trimmedDescription,
            tags: normalizedTags,
            slug: candidateSlug,
          });
          createdPost = result.rows[0] as Post;
          break;
        } catch (insertErr: any) {
          if (insertErr?.code === "23505" && attempt < 5) {
            const randomSuffix = crypto.randomBytes(3).toString("hex");
            candidateSlug = `${baseSlug.slice(0, 80)}-${randomSuffix}`;
            continue;
          }
          throw insertErr;
        }
      }

      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Post created", post: createdPost }));
    } catch (err) {
      console.error("[posts.controller.createPost] Failed to create post", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to create post." }));
    }
  },

  async updatePost(
    req: IncomingMessage,
    res: ServerResponse,
    postId: string,
  ): Promise<void> {
    try {
      if (!UUID_REGEX.test(postId)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid post id format." }));
        return;
      }

      const verifyResult = await verifySession(
        req.headers.authorization,
        "updatePost",
      );
      if (!verifyResult.ok) {
        res.statusCode = verifyResult.statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(verifyResult.body));
        return;
      }

      const existing = await postsService.getPost(postId);
      if (existing.rows.length === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Post not found." }));
        return;
      }

      const post = existing.rows[0] as Post;

      let incomingData: UpdatePostDTO;
      try {
        incomingData = (await json(req)) as UpdatePostDTO;
      } catch (err) {
        console.error("[posts.controller.updatePost] JSON parse failed", err);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid JSON format." }));
        return;
      }

      if (incomingData.category !== undefined) {
        if (!VALID_CATEGORIES.includes(incomingData.category)) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Invalid post category." }));
          return;
        }
      }

      if (incomingData.title !== undefined) {
        const trimmedTitle = incomingData.title.trim();
        if (trimmedTitle.length < 5 || trimmedTitle.length > 150) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Title must be 5-150 characters." }));
          return;
        }
        incomingData.title = trimmedTitle;
      }

      if (incomingData.short_description !== undefined) {
        const trimmedDesc = incomingData.short_description.trim();
        if (trimmedDesc.length < 10 || trimmedDesc.length > 300) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Description must be 10-300 characters.",
            }),
          );
          return;
        }
        incomingData.short_description = trimmedDesc;
      }

      if (
        incomingData.main_content !== undefined &&
        (incomingData.main_content.length < 50 ||
          incomingData.main_content.length > 40000)
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Content must be 50-40,000 characters." }),
        );
        return;
      }

      if (
        incomingData.thumbnail !== undefined &&
        (!incomingData.thumbnail ||
          incomingData.thumbnail.length > 2048 ||
          !URL_REGEX.test(incomingData.thumbnail) ||
          !IMAGE_REGEX.test(incomingData.thumbnail))
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Invalid or too long thumbnail URL." }),
        );
        return;
      }

      if (incomingData.post_images !== undefined) {
        if (
          !Array.isArray(incomingData.post_images) ||
          incomingData.post_images.length < 1 ||
          incomingData.post_images.length > 5
        ) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Provide between 1 and 5 images." }));
          return;
        }
        const uniqueUpdatedImageUrls = new Set<string>();
        for (const url of incomingData.post_images) {
          if (
            !url ||
            url.length > 2048 ||
            !URL_REGEX.test(url) ||
            !IMAGE_REGEX.test(url)
          ) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Invalid or too long image URL in gallery.",
              }),
            );
            return;
          }
          if (uniqueUpdatedImageUrls.has(url)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ error: "Duplicate image URL in gallery." }),
            );
            return;
          }
          uniqueUpdatedImageUrls.add(url);
        }
      }

      if (incomingData.tags !== undefined) {
        if (
          !Array.isArray(incomingData.tags) ||
          incomingData.tags.length < 1 ||
          incomingData.tags.length > 5
        ) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Provide between 1 and 5 tags." }));
          return;
        }
        const unique = new Set<string>();
        const cleanedTags: string[] = [];
        for (const t of incomingData.tags) {
          const cleaned = String(t || "")
            .trim()
            .toLowerCase();
          if (
            cleaned.includes(" ") ||
            cleaned.length < 2 ||
            cleaned.length > 25 ||
            unique.has(cleaned)
          ) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Tags must be unique, 2-25 chars, and no spaces.",
              }),
            );
            return;
          }
          unique.add(cleaned);
          cleanedTags.push(cleaned);
        }
        incomingData.tags = cleanedTags;
      }

      if (
        incomingData.external_link !== undefined &&
        incomingData.external_link !== null &&
        incomingData.external_link !== ""
      ) {
        if (
          incomingData.external_link.length > 2048 ||
          !URL_REGEX.test(incomingData.external_link)
        ) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: "Invalid or too long external URL." }),
          );
          return;
        }
      }

      if (
        incomingData.github_link !== undefined &&
        incomingData.github_link !== null &&
        incomingData.github_link !== ""
      ) {
        if (
          incomingData.github_link.length > 2048 ||
          !GITHUB_REGEX.test(incomingData.github_link)
        ) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error:
                "Invalid GitHub link. Expected: github.com/username/reponame.",
            }),
          );
          return;
        }
      }

      if (
        incomingData.is_published !== undefined &&
        typeof incomingData.is_published !== "boolean"
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "is_published must be a boolean." }));
        return;
      }

      if (
        incomingData.featured !== undefined &&
        typeof incomingData.featured !== "boolean"
      ) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "featured must be a boolean." }));
        return;
      }

      const finalCategory = incomingData.category || post.category;
      const finalSubcategory =
        incomingData.subcategory !== undefined
          ? incomingData.subcategory
          : post.subcategory;
      const finalGithubLink =
        incomingData.github_link !== undefined
          ? incomingData.github_link
          : post.github_link;

      if (finalCategory === "projects") {
        if (
          !finalSubcategory ||
          !["serious", "random"].includes(finalSubcategory)
        ) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: "Subcategory required for projects." }),
          );
          return;
        }
        if (finalSubcategory === "serious" && !finalGithubLink) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Serious projects must have a GitHub link.",
            }),
          );
          return;
        }
      } else if (finalSubcategory) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Subcategory is only allowed for projects.",
          }),
        );
        return;
      }

      const ALLOWED = [
        "category",
        "subcategory",
        "is_published",
        "featured",
        "thumbnail",
        "post_images",
        "title",
        "short_description",
        "main_content",
        "tags",
        "external_link",
        "github_link",
      ];

      const keys = Object.keys(incomingData).filter((k) => ALLOWED.includes(k));
      if (keys.length === 0) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "No valid fields provided." }));
        return;
      }

      const values = keys.map((k) => {
        const val = (incomingData as any)[k];
        if ((k === "external_link" || k === "github_link") && val === "") {
          return null;
        }
        return val;
      });
      const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");

      const result = await postsService.updatePost(setClause, [
        ...values,
        postId,
      ]);
      if (result.rows.length === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Post not found." }));
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ message: "Post updated", post: result.rows[0] }),
      );

      const oldImageUrls = [post.thumbnail, ...(post.post_images || [])];
      const newImageUrls = [
        incomingData.thumbnail !== undefined
          ? incomingData.thumbnail
          : post.thumbnail,
        ...(incomingData.post_images !== undefined
          ? incomingData.post_images
          : post.post_images || []),
      ];
      const removedImageUrls = oldImageUrls.filter(
        (url) => url && !newImageUrls.includes(url),
      );

      for (const imageUrl of removedImageUrls) {
        if (!imageUrl || !imageUrl.includes("cloudinary.com")) continue;
        try {
          const urlPartsAfterUpload = imageUrl.split("/upload/");
          const afterUploadRaw = urlPartsAfterUpload[1];
          if (urlPartsAfterUpload.length === 2 && afterUploadRaw) {
            const afterUpload = afterUploadRaw.replace(/^v\d+\//, "");
            const publicId = afterUpload.replace(/\.[^/.]+$/, "");
            await mediaStorage.uploader.destroy(publicId);
          }
        } catch (cloudinaryErr) {
          console.error(
            `[posts.controller.updatePost] Cloudinary cleanup failed for image=${imageUrl} post=${postId}`,
            cloudinaryErr,
          );
        }
      }
    } catch (err) {
      console.error("[posts.controller.updatePost] Failed to update post", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to update post." }));
    }
  },

  async deletePost(
    req: IncomingMessage,
    res: ServerResponse,
    postId: string,
  ): Promise<void> {
    try {
      if (!UUID_REGEX.test(postId)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid post id format." }));
        return;
      }

      const verifyResult = await verifySession(
        req.headers.authorization,
        "deletePost",
      );
      if (!verifyResult.ok) {
        res.statusCode = verifyResult.statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(verifyResult.body));
        return;
      }

      const existing = await postsService.getPost(postId);
      if (existing.rows.length === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Post not found." }));
        return;
      }

      const post = existing.rows[0] as Post;

      const result = await postsService.deletePost(postId);
      if (result.rowCount === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Post not found." }));
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Post deleted" }));

      const allImageUrlsToClean = [post.thumbnail, ...(post.post_images || [])];
      for (const imageUrl of allImageUrlsToClean) {
        if (!imageUrl || !imageUrl.includes("cloudinary.com")) continue;
        try {
          const urlPartsAfterUpload = imageUrl.split("/upload/");
          const afterUploadRaw = urlPartsAfterUpload[1];
          if (urlPartsAfterUpload.length === 2 && afterUploadRaw) {
            const afterUpload = afterUploadRaw.replace(/^v\d+\//, "");
            const publicId = afterUpload.replace(/\.[^/.]+$/, "");
            await mediaStorage.uploader.destroy(publicId);
          }
        } catch (cloudinaryErr) {
          console.error(
            `[posts.controller.deletePost] Cloudinary cleanup failed for image=${imageUrl} post=${postId}`,
            cloudinaryErr,
          );
        }
      }
    } catch (err) {
      console.error("[posts.controller.deletePost] Failed to delete post", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to delete post." }));
    }
  },

  async getTags(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    try {
      const category = url.searchParams.get("category") || null;
      const subcategory = url.searchParams.get("subcategory") || null;
      const requestedDrafts = url.searchParams.get("include_drafts") === "true";

      let includeDrafts = false;
      if (requestedDrafts) {
        const verifyResult = await verifySession(
          req.headers.authorization,
          "getTagsDrafts",
        );
        if (verifyResult.ok) {
          includeDrafts = true;
        }
      }

      const tagsList = await postsService.getAllUniqueTags(
        category,
        subcategory,
        includeDrafts,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ tags: tagsList }));
    } catch (err) {
      console.error("[posts.controller.getTags] Failed to fetch tags", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Failed to fetch tags." }));
    }
  },
};
