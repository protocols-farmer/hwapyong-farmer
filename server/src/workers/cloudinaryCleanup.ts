//src/workers/cloudinaryCleanup.ts
import { pool } from "../db/psql.js";
import { redisClient } from "../db/redis.js";
import { mediaStorage } from "../db/cloudinary.js";

let consecutiveFailures = 0;

const extractPublicIdFromUrl = (url: string): string | null => {
  if (!url || !url.includes("cloudinary.com")) return null;
  const partsAfterUpload = url.split("/upload/");
  const afterUploadRaw = partsAfterUpload[1];
  if (partsAfterUpload.length !== 2 || !afterUploadRaw) return null;
  const afterUpload = afterUploadRaw.replace(/^v\d+\//, "");
  return afterUpload.replace(/\.[^/.]+$/, "");
};

const CLOUDINARY_FOLDERS_TO_RECONCILE = ["hwapyong/profile", "hwapyong/posts"];

// Anything uploaded more recently than this is left alone, even if it looks
// orphaned right now — someone may be mid-flow (uploaded an image but hasn't
// clicked "Save"/"Create Post" yet).
const ORPHAN_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export const startCloudinaryCleanupWorker = () => {
  const isDryRun = process.env["CLOUDINARY_CLEANUP_DRY_RUN"] !== "false";

  console.log(
    `🧹  Starting Background Cloudinary Orphan Cleanup Worker (Redis-Locked)${isDryRun ? " [DRY RUN MODE]" : ""}...`,
  );
  if (isDryRun) {
    console.log(
      "🧹  Dry run mode is ON — orphans will be LOGGED but not deleted. Set CLOUDINARY_CLEANUP_DRY_RUN=false once you've reviewed a cycle of logs and are confident in the results.",
    );
  }

  const CLEANUP_INTERVAL = 1000 * 60 * 60 * 6; // every 6 hours

  const runCleanupCycle = async () => {
    try {
      let lockAcquired: string | null | unknown = null;

      try {
        lockAcquired = await redisClient.set(
          "cron:cloudinary-cleanup-lock",
          "locked",
          { nx: true, ex: 900 },
        );
      } catch (redisErr) {
        consecutiveFailures++;
        process.stderr.write(
          `[CRON_REDIS_DOWN] Cloudinary cleanup: Redis lock acquisition failed (consecutive failures=${consecutiveFailures}). Cycle skipped. err=${(redisErr as Error).message}\nStack: ${(redisErr as Error).stack}\n`,
        );
        return;
      }

      if (!lockAcquired) {
        consecutiveFailures = 0;
        return;
      }

      try {
        const avatarUrlsResult = await pool.query(
          "SELECT avatar_url FROM users WHERE avatar_url IS NOT NULL;",
        );
        const postImageResult = await pool.query(
          "SELECT thumbnail, post_images FROM posts;",
        );

        const inUsePublicIds = new Set<string>();

        for (const row of avatarUrlsResult.rows) {
          const publicId = extractPublicIdFromUrl(row.avatar_url);
          if (publicId) inUsePublicIds.add(publicId);
        }

        for (const row of postImageResult.rows) {
          const thumbnailPublicId = extractPublicIdFromUrl(row.thumbnail);
          if (thumbnailPublicId) inUsePublicIds.add(thumbnailPublicId);

          const galleryUrls: string[] = row.post_images || [];
          for (const galleryUrl of galleryUrls) {
            const galleryPublicId = extractPublicIdFromUrl(galleryUrl);
            if (galleryPublicId) inUsePublicIds.add(galleryPublicId);
          }
        }

        let totalHandled = 0;

        for (const folder of CLOUDINARY_FOLDERS_TO_RECONCILE) {
          let nextCursor: string | undefined = undefined;

          do {
            const listResult: any = await mediaStorage.api.resources({
              type: "upload",
              prefix: folder,
              max_results: 500,
              next_cursor: nextCursor,
            });

            for (const resource of listResult.resources || []) {
              const isOrphan = !inUsePublicIds.has(resource.public_id);
              const uploadedAt = new Date(resource.created_at).getTime();
              const isPastGracePeriod =
                Date.now() - uploadedAt > ORPHAN_GRACE_PERIOD_MS;

              if (isOrphan && isPastGracePeriod) {
                if (isDryRun) {
                  console.log(
                    `🧹  [DRY RUN] Would delete orphaned asset: ${resource.public_id} (uploaded ${resource.created_at})`,
                  );
                  totalHandled++;
                } else {
                  try {
                    await mediaStorage.uploader.destroy(resource.public_id);
                    totalHandled++;
                  } catch (destroyErr) {
                    process.stderr.write(
                      `[CloudinaryCleanup] Failed to destroy orphan public_id=${resource.public_id}: ${(destroyErr as Error).message}\nStack: ${(destroyErr as Error).stack}\n`,
                    );
                  }
                }
              }
            }

            nextCursor = listResult.next_cursor;
          } while (nextCursor);
        }

        console.log(
          `🧹  Cloudinary cleanup cycle complete. ${isDryRun ? "Would have deleted" : "Deleted"} ${totalHandled} orphaned asset(s).`,
        );
        consecutiveFailures = 0;
      } catch (cycleErr) {
        consecutiveFailures++;
        process.stderr.write(
          `[CRON_CLOUDINARY_FAIL] Cloudinary cleanup cycle failed (consecutive failures=${consecutiveFailures}): ${(cycleErr as Error).message}\nStack: ${(cycleErr as Error).stack}\n`,
        );
      }
    } finally {
      setTimeout(runCleanupCycle, CLEANUP_INTERVAL);
    }
  };

  setTimeout(runCleanupCycle, CLEANUP_INTERVAL);
};
