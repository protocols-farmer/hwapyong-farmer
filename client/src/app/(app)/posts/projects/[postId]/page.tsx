// src/app/(app)/posts/projects/[postId]/page.tsx
import type { Metadata } from "next";
import ProjectDetails from "@/components/pages/posts/projects/ProjectDetails";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  if (!apiUrl) return { title: "Projects" };

  try {
    const res = await fetch(
      `${apiUrl}/posts/getone/${encodeURIComponent(postId)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return { title: "Projects" };
    const data = await res.json();
    if (data?.post) {
      return {
        title: data.post.title,
        description: data.post.short_description,
      };
    }
  } catch (err) {
    console.error("[projects.generateMetadata] Metadata fetch failed", err);
  }
  return { title: "Projects" };
}

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
