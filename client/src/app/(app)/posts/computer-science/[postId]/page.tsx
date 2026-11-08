// src/app/(app)/posts/computer-science/[postId]/page.tsx
import type { Metadata } from "next";
import ComputerDetails from "@/components/pages/posts/computer/ComputerDetails";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  if (!apiUrl) return { title: "Computer Science" };

  try {
    const res = await fetch(
      `${apiUrl}/posts/getone/${encodeURIComponent(postId)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return { title: "Computer Science" };
    const data = await res.json();
    if (data?.post) {
      return {
        title: data.post.title,
        description: data.post.short_description,
      };
    }
  } catch (err) {
    console.error(
      "[computer-science.generateMetadata] Metadata fetch failed",
      err,
    );
  }
  return { title: "Computer Science" };
}

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
