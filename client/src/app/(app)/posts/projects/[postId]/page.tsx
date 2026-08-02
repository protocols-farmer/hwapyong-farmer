// src/app/(app)/computer/[postId]/page.tsx

import ProjectDetails from "@/components/pages/posts/projects/ProjectDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <div>
      <ProjectDetails postId={postId} />
    </div>
  );
}
