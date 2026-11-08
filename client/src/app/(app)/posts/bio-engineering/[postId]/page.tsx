// src/app/(app)/posts/bio-engineering/[postId]/page.tsx
import type { Metadata } from "next";
import BiologyDetails from "@/components/pages/posts/biology/BiologyDetails";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  if (!apiUrl) return { title: "Bio-engineering" };

  try {
    const res = await fetch(
      `${apiUrl}/posts/getone/${encodeURIComponent(postId)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return { title: "Bio-engineering" };
    const data = await res.json();
    if (data?.post) {
      return {
        title: data.post.title,
        description: data.post.short_description,
      };
    }
  } catch (err) {
    console.error(
      "[bio-engineering.generateMetadata] Metadata fetch failed",
      err,
    );
  }
  return { title: "Bio-engineering" };
}

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
