//src/db/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from "../config/env.js";

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

export const mediaStorage = cloudinary;

export const verifyCloudinary = async (): Promise<void> => {
  try {
    await cloudinary.api.ping();
    console.log("🥹  Cloudinary configuration loaded and authenticated.");
  } catch (err) {
    console.error(
      "[cloudinary.verifyCloudinary] Cloudinary unreachable on startup (network drop or invalid keys)",
      err,
    );
    console.warn(
      "⚠️  WARNING: Backend is starting, but image uploads will fail until network to Cloudinary is restored.",
    );
  }
};
