//src/features/posts/posts.controller.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "node:stream/consumers";
import Busboy from "busboy";
import { postsService } from "./posts.service.js";
import { mediaStorage } from "../../db/cloudinary.js";
import { redisClient } from "../../db/redis.js";
import type { CreatePostDTO, UpdatePostDTO, Post } from "./posts.types.js";
import { verifyAccessToken } from "../auth/verifyAccessToken.js";

const ACCESS_TOKEN_SECRET = process.env["ACCESS_TOKEN_SECRET"];

if (!ACCESS_TOKEN_SECRET) {
  process.stderr.write("FATAL ERROR: ACCESS_TOKEN_SECRET is not defined.\n");
  process.exit(1);
}

const URL_REGEX = /^https?:\/\/([\w\d\-_]+\.)+\.?[\w\d\-_]+(\/.*)?$/i;
const GITHUB_REGEX =
  /^https?:\/\/(www\.)?github\.com\/[\w\-]+\/[\w\-.]+(\/[\w\-./?=&%#]*)?$/i;
const IMAGE_REGEX = /\.(jpeg|jpg|gif|png|webp|avif|svg)(\?.*)?(#.*)?$/i;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const postsController = {
  async uploadMedia(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const verifyResult = await verifyAccessToken(
        req.headers.authorization,
        ACCESS_TOKEN_SECRET as string,
        "uploadMedia",
      );
      if (!verifyResult.ok) {
        res.statusCode = verifyResult.statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(verifyResult.body));
        return;
      }
      const decoded = verifyResult.decoded;

      if (process.env["NODE_ENV"] !== "development") {
        try {
          const uploadLimitKey = `ratelimit:upload:${decoded.id}`;
          const uploadsCount = await redisClient.incr(uploadLimitKey);

          if (uploadsCount === 1) {
            await redisClient.expire(uploadLimitKey, 3600);
          }

          if (uploadsCount > 10) {
            res.statusCode = 429;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error:
                  "Upload limit exceeded. Maximum 10 media uploads per hour to prevent storage abuse.",
              }),
            );
            return;
          }
        } catch (err: any) {
          process.stderr.write(
            `[uploadMedia] Redis Error: ${err.message}\nStack: ${err.stack}\n`,
          );
        }
      }

      const MAX_POST_MEDIA_UPLOAD_BYTES = 5 * 1024 * 1024;
      const bb = Busboy({
        headers: req.headers,
        limits: { files: 1, fileSize: MAX_POST_MEDIA_UPLOAD_BYTES },
      });

      req.on("aborted", () => {
        process.stderr.write(
          `[uploadMedia] Client aborted connection midway. Destroying stream to clear memory.\n`,
        );
        req.unpipe(bb);
      });

      let fileProcessed = false;

      bb.on("file", (_name, file, info) => {
        fileProcessed = true;
        file.on("limit", () => {
          process.stderr.write(
            `[uploadMedia] File exceeded max size of ${MAX_POST_MEDIA_UPLOAD_BYTES} bytes. Aborting upload.\n`,
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
          res.end(JSON.stringify({ error: "Only images allowed" }));
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
          // AVIF/AVIS files don't have a simple 4-byte magic number — they're
          // an ISO base media container with an "ftyp" box at byte 4 and a
          // brand name ("avif"/"avis") right after it.
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
            // File ended before we ever accumulated 12 bytes — too small to
            // be a real image in any supported format. Reject rather than
            // letting an unvalidated blob reach Cloudinary.
            file.destroy(new Error("INVALID_MAGIC_NUMBER"));
          }
        });

        file.on("error", (err: any) => {
          process.stderr.write(
            `[uploadMedia] Busboy File Error: ${err.message}\nStack: ${err.stack}\n`,
          );
          if (err.message === "INVALID_MAGIC_NUMBER" && !res.writableEnded) {
            res.statusCode = 415;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Spoofed file type detected" }));
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
              process.stderr.write(
                `[uploadMedia] Cloudinary Callback Error: ${error.message}\n`,
              );
              if (!res.writableEnded) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: `Network/Upload failed: ${error.message}`,
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
          process.stderr.write(
            `[uploadMedia] FATAL STREAM CRASH PREVENTED: ${err.message}\nStack: ${err.stack}\n`,
          );
          if (!res.writableEnded) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: `Upload connection lost: ${err.message}`,
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
          res.end(JSON.stringify({ error: "No file uploaded" }));
        }
      });

      req.pipe(bb);
    } catch (err: any) {
      process.stderr.write(
        `[uploadMedia] CRITICAL FATAL ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
    }
  },

  async getAllPosts(
    _req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    try {
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = 12;

      const results = await postsService.getAllPosts(page, limit);

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          posts: results.rows,
          total: results.totalCount,
          page: page,
          totalPages: Math.ceil(results.totalCount / limit),
        }),
      );
    } catch (err: any) {
      process.stderr.write(
        `[getAllPosts] ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
    }
  },

  async getPost(
    _req: IncomingMessage,
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
      const results = await postsService.getPost(postId);
      if (results.rows.length === 0) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Post not found" }));
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ post: results.rows[0] }));
    } catch (err: any) {
      process.stderr.write(
        `[getPost] ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
    }
  },

  async getFilteredPosts(
    _req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    try {
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = 12;

      const searchQuery = url.searchParams.get("q") || null;
      const category = url.searchParams.get("category") || null;
      const subcategory = url.searchParams.get("subcategory") || null;

      const tagString = url.searchParams.get("tag");
      let tagsArray: string[] | null = null;
      if (tagString) {
        tagsArray = tagString
          .split(",")
          .map((t) => t.trim())
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
        sortBy,
        sortOrder,
        null,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          posts: results.rows,
          total: results.totalCount,
          page: page,
          totalPages: Math.ceil(results.totalCount / limit),
        }),
      );
    } catch (err: any) {
      process.stderr.write(
        `[getFilteredPosts] ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
    }
  },

  async createPost(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const verifyResult = await verifyAccessToken(
        req.headers.authorization,
        ACCESS_TOKEN_SECRET as string,
        "createPost",
      );
      if (!verifyResult.ok) {
        res.statusCode = verifyResult.statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(verifyResult.body));
        return;
      }
      const decoded = verifyResult.decoded;

      if (decoded.role !== "admin" && decoded.role !== "super_admin") {
        process.stderr.write(
          `[createPost] Forbidden: user=${decoded.id} role=${decoded.role} attempted to create a post.\n`,
        );
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: "Forbidden: Only admins can create posts." }),
        );
        return;
      }
      let data: CreatePostDTO;
      try {
        data = (await json(req)) as CreatePostDTO;
      } catch (err: any) {
        process.stderr.write(`[createPost] JSON Parse Error: ${err.message}\n`);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: `Invalid JSON format: ${err.message}` }),
        );
        return;
      }

      if (!data.title || data.title.length < 5 || data.title.length > 150) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Title must be 5-150 characters." }));
        return;
      }
      if (
        !data.short_description ||
        data.short_description.length < 10 ||
        data.short_description.length > 300
      ) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({ error: "Description must be 10-300 characters." }),
        );
        return;
      }
      if (
        !data.main_content ||
        data.main_content.length < 50 ||
        data.main_content.length > 15000
      ) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({ error: "Content must be 50-15,000 characters." }),
        );
        return;
      }

      if (data.thumbnail && data.thumbnail.length > 2048) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({ error: "Thumbnail URL too long (max 2048)." }),
        );
        return;
      }
      if (data.thumbnail && !URL_REGEX.test(data.thumbnail)) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({ error: "Thumbnail must be a valid image URL." }),
        );
        return;
      }
      if (data.thumbnail && !IMAGE_REGEX.test(data.thumbnail)) {
        res.statusCode = 400;
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
          res.end(
            JSON.stringify({
              error: "Invalid or too long image URL in gallery.",
            }),
          );
          return;
        }
        if (uniquePostImageUrls.has(url)) {
          res.statusCode = 400;
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
        res.end(JSON.stringify({ error: "Provide between 1 and 5 tags." }));
        return;
      }
      const uniqueTags = new Set<string>();
      for (const tag of data.tags) {
        const cleaned = tag.trim();
        if (
          cleaned.includes(" ") ||
          cleaned.length < 2 ||
          cleaned.length > 25 ||
          uniqueTags.has(cleaned.toLowerCase())
        ) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: "Tags must be unique, 2-25 chars, and no spaces.",
            }),
          );
          return;
        }
        uniqueTags.add(cleaned.toLowerCase());
      }

      if (
        data.external_link &&
        (data.external_link.length > 2048 ||
          !URL_REGEX.test(data.external_link))
      ) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid or too long external URL." }));
        return;
      }

      if (
        data.github_link &&
        (data.github_link.length > 2048 || !GITHUB_REGEX.test(data.github_link))
      ) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            error:
              "Invalid GitHub link. Expected: github.com/username/reponame or the error is due to too long GitHub URL.",
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
          res.end(
            JSON.stringify({ error: "Subcategory required for projects." }),
          );
          return;
        }
        if (data.subcategory === "serious" && !data.github_link) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: "Serious projects must have a GitHub link.",
            }),
          );
          return;
        }
      } else if (data.subcategory) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            error: "Subcategory is only allowed for projects.",
          }),
        );
        return;
      }

      if (process.env["NODE_ENV"] !== "development") {
        try {
          const createLimitKey = `ratelimit:createpost:${decoded.id}`;
          const createsCount = await redisClient.incr(createLimitKey);
          if (createsCount === 1) {
            await redisClient.expire(createLimitKey, 3600);
          }
          if (createsCount > 5) {
            res.statusCode = 429;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error:
                  "Creation limit exceeded. Maximum 5 posts per hour to prevent database abuse.",
              }),
            );
            return;
          }
        } catch (err: any) {
          process.stderr.write(
            `[createPost] Redis Error: ${err.message}\nStack: ${err.stack}\n`,
          );
        }
      }
      const result = await postsService.createPost({
        ...data,
        author_id: decoded.id,
      });
      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ message: "Post created", post: result.rows[0] }),
      );
    } catch (err: any) {
      process.stderr.write(
        `[createPost] CRITICAL ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
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
      const verifyResult = await verifyAccessToken(
        req.headers.authorization,
        ACCESS_TOKEN_SECRET as string,
        "updatePost",
      );
      if (!verifyResult.ok) {
        res.statusCode = verifyResult.statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(verifyResult.body));
        return;
      }
      const decoded = verifyResult.decoded;

      const existing = await postsService.getPost(postId);
      if (existing.rows.length === 0) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Post not found" }));
        return;
      }

      const post = existing.rows[0] as Post;

      if (post.author_id !== decoded.id && decoded.role !== "super_admin") {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Forbidden: You are not the author or a Super Admin.",
          }),
        );
        return;
      }

      let incomingData: UpdatePostDTO;
      try {
        incomingData = (await json(req)) as UpdatePostDTO;
      } catch (err: any) {
        process.stderr.write(`[updatePost] JSON Parse Error: ${err.message}\n`);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ error: `Invalid JSON format: ${err.message}` }),
        );
        return;
      }

      if (
        incomingData.title &&
        (incomingData.title.length < 5 || incomingData.title.length > 150)
      ) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid title length." }));
        return;
      }

      if (
        incomingData.main_content &&
        (incomingData.main_content.length < 50 ||
          incomingData.main_content.length > 15000)
      ) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({ error: "Content must be 50-15,000 characters." }),
        );
        return;
      }

      if (
        incomingData.thumbnail &&
        (incomingData.thumbnail.length > 2048 ||
          !URL_REGEX.test(incomingData.thumbnail) ||
          !IMAGE_REGEX.test(incomingData.thumbnail))
      ) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({ error: "Invalid or too long thumbnail URL." }),
        );
        return;
      }
      if (incomingData.post_images) {
        const uniqueUpdatedImageUrls = new Set<string>();
        for (const url of incomingData.post_images) {
          if (
            url &&
            (url.length > 2048 ||
              !URL_REGEX.test(url) ||
              !IMAGE_REGEX.test(url))
          ) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                error: "Invalid or too long image URL in gallery.",
              }),
            );
            return;
          }
          if (url && uniqueUpdatedImageUrls.has(url)) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({ error: "Duplicate image URL in gallery." }),
            );
            return;
          }
          if (url) uniqueUpdatedImageUrls.add(url);
        }
      }

      if (incomingData.tags) {
        const unique = new Set<string>();
        for (const t of incomingData.tags) {
          if (
            t.includes(" ") ||
            t.length < 2 ||
            t.length > 25 ||
            unique.has(t.toLowerCase())
          ) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid or duplicate tags." }));
            return;
          }
          unique.add(t.toLowerCase());
        }
      }

      if (
        incomingData.github_link &&
        (incomingData.github_link.length > 2048 ||
          !GITHUB_REGEX.test(incomingData.github_link))
      ) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            error:
              "Invalid GitHub link. Expected: github.com/username/reponame or the error is due to too long GitHub link.",
          }),
        );
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
          res.end(
            JSON.stringify({ error: "Subcategory required for projects." }),
          );
          return;
        }
        if (finalSubcategory === "serious" && !finalGithubLink) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: "Serious projects must have a GitHub link.",
            }),
          );
          return;
        }
      } else if (finalSubcategory) {
        res.statusCode = 400;
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
        res.end(JSON.stringify({ error: "No valid fields." }));
        return;
      }

      const values = keys.map((k) => (incomingData as any)[k]);
      const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");

      const result = await postsService.updatePost(setClause, [
        ...values,
        postId,
      ]);
      if (result.rows.length === 0) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Post not found" }));
        return;
      }
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
        } catch (cloudinaryErr: any) {
          process.stderr.write(
            `[updatePost] Cloudinary cleanup failed for replaced image=${imageUrl} post=${postId}: ${cloudinaryErr.message}\nStack: ${cloudinaryErr.stack}\n`,
          );
        }
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ message: "Post updated", post: result.rows[0] }),
      );
    } catch (err: any) {
      process.stderr.write(
        `[updatePost] CRITICAL ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
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
      const verifyResult = await verifyAccessToken(
        req.headers.authorization,
        ACCESS_TOKEN_SECRET as string,
        "deletePost",
      );
      if (!verifyResult.ok) {
        res.statusCode = verifyResult.statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(verifyResult.body));
        return;
      }
      const decoded = verifyResult.decoded;

      const existing = await postsService.getPost(postId);
      if (existing.rows.length === 0) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Post not found" }));
        return;
      }

      const post = existing.rows[0] as Post;

      if (post.author_id !== decoded.id && decoded.role !== "super_admin") {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Forbidden: You are not the author or a Super Admin.",
          }),
        );
        return;
      }

      const result = await postsService.deletePost(postId);
      if (result.rowCount === 0) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Post not found" }));
        return;
      }
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
        } catch (cloudinaryErr: any) {
          process.stderr.write(
            `[deletePost] Cloudinary cleanup failed for image=${imageUrl} post=${postId}: ${cloudinaryErr.message}\nStack: ${cloudinaryErr.stack}\n`,
          );
        }
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Post deleted" }));
    } catch (err: any) {
      process.stderr.write(
        `[deletePost] CRITICAL ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
  },

  async getOwnPosts(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    try {
      const verifyResult = await verifyAccessToken(
        req.headers.authorization,
        ACCESS_TOKEN_SECRET as string,
        "getOwnPosts",
      );
      if (!verifyResult.ok) {
        res.statusCode = verifyResult.statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(verifyResult.body));
        return;
      }
      const decoded = verifyResult.decoded;

      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = 12;

      const searchQuery = url.searchParams.get("q") || null;
      const category = url.searchParams.get("category") || null;
      const subcategory = url.searchParams.get("subcategory") || null;

      const tagString = url.searchParams.get("tag");
      let tagsArray: string[] | null = null;
      if (tagString) {
        tagsArray = tagString
          .split(",")
          .map((t) => t.trim())
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
        sortBy,
        sortOrder,
        decoded.id,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          posts: results.rows,
          total: results.totalCount,
          page: page,
          totalPages: Math.ceil(results.totalCount / limit),
        }),
      );
    } catch (err: any) {
      process.stderr.write(
        `[getOwnPosts] CRITICAL ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
  },

  async getSuperAdminSeriousProjects(
    _req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    try {
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = 12;

      const results = await postsService.getSuperAdminSeriousProjects(
        page,
        limit,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          posts: results.rows,
          total: results.totalCount,
          page: page,
          totalPages: Math.ceil(results.totalCount / limit),
        }),
      );
    } catch (err: any) {
      process.stderr.write(
        `[getSuperAdminSeriousProjects] ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
    }
  },

  async getSuperAdminDiary(
    _req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    try {
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = 12;

      const results = await postsService.getSuperAdminDiary(page, limit);

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          posts: results.rows,
          total: results.totalCount,
          page: page,
          totalPages: Math.ceil(results.totalCount / limit),
        }),
      );
    } catch (err: any) {
      process.stderr.write(
        `[getSuperAdminDiary] ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
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
      const isMine = url.searchParams.get("mine") === "true";
      let authorId: string | null = null;

      if (isMine) {
        const verifyResult = await verifyAccessToken(
          req.headers.authorization,
          ACCESS_TOKEN_SECRET as string,
          "getTags",
        );
        if (!verifyResult.ok) {
          res.statusCode = verifyResult.statusCode;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(verifyResult.body));
          return;
        }
        authorId = verifyResult.decoded.id;
      }

      const tagsList = await postsService.getAllUniqueTags(
        category,
        subcategory,
        authorId,
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ tags: tagsList }));
    } catch (err: any) {
      process.stderr.write(
        `[getTags] ERROR: ${err.message}\nStack: ${err.stack}\n`,
      );
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
    }
  },
};
