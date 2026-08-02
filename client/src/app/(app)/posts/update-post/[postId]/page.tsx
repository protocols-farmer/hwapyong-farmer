// src/app/(app)/posts/update/[postId]/page.tsx
import UpdatePost from "@/components/pages/posts/UpdatePost";

export default async function Page({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <div>
      <UpdatePost postId={postId} />
    </div>
  );
}
