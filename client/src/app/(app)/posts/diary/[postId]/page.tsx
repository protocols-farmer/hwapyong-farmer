//src/app/(app)/posts/diary/[postId]/page.tsx

import DiaryDetails from "@/components/pages/posts/diary/DiaryDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <div>
      <DiaryDetails postId={postId} />
    </div>
  );
}
