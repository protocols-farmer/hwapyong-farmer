// src/app/(app)/posts/diary/[postId]/page.tsx
import type { Metadata } from "next";
import DiaryDetails from "@/components/pages/posts/diary/DiaryDetails";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  if (!apiUrl) return { title: "Diary" };

  try {
    const res = await fetch(
      `${apiUrl}/posts/getone/${encodeURIComponent(postId)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return { title: "Diary" };
    const data = await res.json();
    if (data?.post) {
      return {
        title: data.post.title,
        description: data.post.short_description,
      };
    }
  } catch (err) {
    console.error("[diary.generateMetadata] Metadata fetch failed", err);
  }
  return { title: "Diary" };
}

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
