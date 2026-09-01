//src/lib/utils/postPermissions.ts
import { Post } from "@/lib/features/posts/postsTypes";

interface CurrentUserForPermissions {
  id: string;
  role: string;
}

export function canManagePost(
  currentUser: CurrentUserForPermissions | null | undefined,
  post: Post | null | undefined,
): boolean {
  if (!currentUser || !post) return false;
  return (
    currentUser.id === post.author_id || currentUser.role === "super_admin"
  );
}
