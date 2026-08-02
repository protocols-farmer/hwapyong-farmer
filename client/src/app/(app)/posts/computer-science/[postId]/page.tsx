//src/app/(app)/computer/[postId]/page.tsx

import ComputerDetails from "@/components/pages/posts/computer/ComputerDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <div>
      <ComputerDetails postId={postId} />
    </div>
  );
}
