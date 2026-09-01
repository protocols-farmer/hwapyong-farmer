// Must always match the `avatar_url` column's DEFAULT in schema.sql.
// deleteAccount uses this to distinguish "still using the shared stock
// avatar" (never delete from Cloudinary — every other user may still be
// using it) from "a real personal upload" (safe to delete). If you ever
// change the default avatar image, update BOTH this constant and the
// schema.sql DEFAULT clause together.
export const DEFAULT_AVATAR_URL =
  "https://res.cloudinary.com/dhr9zmb3i/image/upload/v1782116959/portfolio/p8f5k0lhoukdzptxy6fj.jpg";
