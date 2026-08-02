//src/db/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env["CLOUDINARY_CLOUD_NAME"]!,
  api_key: process.env["CLOUDINARY_API_KEY"]!,
  api_secret: process.env["CLOUDINARY_API_SECRET"]!,
  secure: true,
});

export const mediaStorage = cloudinary;

export const verifyCloudinary = async (): Promise<void> => {
  const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];

  if (!cloudName || !apiKey || !apiSecret) {
    const errorBody = JSON.stringify({
      level: "FATAL",
      message: "🫩  Missing Cloudinary configuration",
      missing_fields: {
        cloudName: !cloudName,
        apiKey: !apiKey,
        apiSecret: !apiSecret,
      },
      timestamp: new Date().toISOString(),
    });

    process.stderr.write(errorBody + "\n");
    throw new Error("FATAL: Cloudinary environment variables are not set.");
  }

  try {
    await cloudinary.api.ping();
    console.log("🥹  Cloudinary configuration loaded and authenticated.");
  } catch (err: any) {
    const errorBody = JSON.stringify({
      level: "WARNING",
      message:
        "🫩  Cloudinary unreachable on startup (Network drop or invalid keys)",
      error: err.message || "Invalid Cloudinary credentials or network issue.",
      timestamp: new Date().toISOString(),
    });

    process.stderr.write(errorBody + "\n");
    process.stderr.write(
      "⚠️  WARNING: Backend is starting, but image uploads will fail until network to Cloudinary is restored.\n",
    );
  }
};
