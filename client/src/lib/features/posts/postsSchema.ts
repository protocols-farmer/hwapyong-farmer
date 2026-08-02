//src/lib/features/posts/postsSchema.ts
import { z } from "zod";

const URL_REGEX = /^(https?:\/\/)?([\w\d\-_]+\.)+\.?[\w\d\-_]+(\/.*)?$/i;
const GITHUB_REGEX =
  /^(https?:\/\/)?(www\.)?github\.com\/[\w\d\-_]+\/[\w\d\-_]+.*$/i;

const IMAGE_REGEX = /\.(jpeg|jpg|gif|png|webp|avif|svg)(\?.*)?(#.*)?$/i;

export const postSchema = z
  .object({
    category: z.enum(
      ["bio-engineering", "computer-science", "projects", "diary"],
      {
        message: "Please select a valid category.",
      },
    ),
    subcategory: z
      .enum(["serious", "random"], {
        message: "Please select a valid subcategory.",
      })
      .nullable()
      .optional(),

    thumbnail: z
      .string()
      .max(2048, "Thumbnail URL too long (max 2048).")
      .refine((url) => !url || URL_REGEX.test(url), {
        message: "Thumbnail must be a valid image URL.",
      })

      .refine((url) => !url || IMAGE_REGEX.test(url), {
        message: "Thumbnail must be a valid image URL.",
      }),

    post_images: z
      .array(
        z
          .string()
          .max(2048, "Invalid or too long image URL in gallery.")
          .refine((url) => !url || IMAGE_REGEX.test(url), {
            message: "Invalid or too long image URL in gallery.",
          }),
      )
      .min(1, "Provide between 1 and 5 images.")
      .max(5, "Provide between 1 and 5 images."),

    title: z
      .string()
      .min(5, "Title must be 5-150 characters.")
      .max(150, "Title must be 5-150 characters."),

    short_description: z
      .string()
      .min(10, "Description must be 10-300 characters.")
      .max(300, "Description must be 10-300 characters."),

    main_content: z
      .string()
      .min(50, "Content must be 50-15,000 characters.")
      .max(15000, "Content must be 50-15,000 characters."),

    tags: z
      .array(
        z
          .string()
          .min(2, "Tags must be unique, 2-25 chars, and no spaces.")
          .max(25, "Tags must be unique, 2-25 chars, and no spaces.")
          .refine(
            (s) => !s.includes(" "),
            "Tags must be unique, 2-25 chars, and no spaces.",
          ),
      )
      .min(1, "Provide between 1 and 5 tags.")
      .max(5, "Provide between 1 and 5 tags.")
      .refine(
        (items) =>
          new Set(items.map((i) => i.toLowerCase())).size === items.length,
        {
          message: "Tags must be unique, 2-25 chars, and no spaces.",
        },
      ),

    external_link: z
      .string()
      .max(2048, "Invalid or too long external URL.")
      .refine((url) => !url || URL_REGEX.test(url), {
        message: "Invalid or too long external URL.",
      })
      .nullable()
      .optional()
      .or(z.literal("")),

    github_link: z
      .string()
      .max(
        2048,
        "Invalid GitHub link. Expected: github.com/username/reponame or the error is due to too long GitHub URL.",
      )
      .refine((url) => !url || GITHUB_REGEX.test(url), {
        message:
          "Invalid GitHub link. Expected: github.com/username/reponame or the error is due to too long GitHub URL.",
      })
      .nullable()
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.category === "projects" && !data.subcategory) return false;
      if (data.category !== "projects" && data.subcategory) return false;
      return true;
    },
    {
      message: "Subcategory required for projects.",
      path: ["subcategory"],
    },
  )
  .refine(
    (data) => {
      if (data.category === "projects" && data.subcategory === "serious") {
        return !!data.github_link && GITHUB_REGEX.test(data.github_link);
      }
      return true;
    },
    {
      message: "Serious projects must have a GitHub link.",
      path: ["github_link"],
    },
  );
