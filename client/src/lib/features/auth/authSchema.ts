//src/lib/features/auth/authSchema.ts
import { z } from "zod";

const imageExtensions = /\.(jpeg|jpg|gif|png|webp|avif|svg)(\?.*)?(#.*)?$/i;

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(20, "Username cannot exceed 20 characters."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(50, "Password cannot exceed 50 characters."),
});

export const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters.")
      .max(20, "Username cannot exceed 20 characters."),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters.")
      .max(50, "Password cannot exceed 50 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const updateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(20, "Username cannot exceed 20 characters.")
    .optional(),

  profileTitle: z
    .string()
    .max(100, "Profile title cannot exceed 100 characters.")
    .optional()

    .transform((val) => (!val || val.trim() === "" ? "Member" : val.trim())),

  avatarUrl: z
    .string()
    .max(2048, "Avatar URL cannot exceed 2048 characters.")
    .trim()
    .or(z.literal(""))
    .optional()
    .refine(
      (val) => {
        if (!val) return true;

        const isValidUrl = z.string().url().safeParse(val).success;
        const isImageUrl = imageExtensions.test(val);

        return isValidUrl && isImageUrl;
      },
      {
        message:
          "Please enter a valid image URL ending in .jpg, .png, .gif, .avif, .svg, etc.",
      },
    ),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters.")
      .max(50, "New password cannot exceed 50 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });
