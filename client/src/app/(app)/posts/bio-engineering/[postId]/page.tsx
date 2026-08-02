// src/app/(app)/computer/[postId]/page.tsx

import BiologyDetails from "@/components/pages/posts/biology/BiologyDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <div>
      <BiologyDetails postId={postId} />
    </div>
  );
}
