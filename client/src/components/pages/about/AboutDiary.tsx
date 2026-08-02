//src/components/pages/about/AboutDiary.tsx
"use client";

import React, { useState } from "react";
import CornerFlourish from "@/components/shared/CornerFlourish";
import PostCard from "@/components/pages/posts/PostCard";
import { useGetSuperAdminDiaryQuery } from "@/lib/features/posts/postsApiSlice";

const CardSkeleton = () => (
  <div className="relative border-3 border-double bg-card flex flex-col gap-3 p-3 justify-between h-full animate-pulse">
    <CornerFlourish className="-top-1 -left-1" />
    <CornerFlourish className="-top-1 -right-1 rotate-90" />
    <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
    <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

    <div className="flex flex-col gap-3">
      <div className="relative aspect-video border-3 border-double bg-background flex items-center justify-center">
        <span className="text-xs font-bold">Loading...</span>
      </div>
      <div className="flex gap-1">
        <div className="w-10 h-10 border-3 border-double bg-background" />
        <div className="flex flex-col gap-1 justify-center">
          <div className="h-3 w-24 bg-primary/20" />
          <div className="h-2 w-16 bg-primary/10" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-3/4 bg-primary/20" />
        <div className="h-2.5 w-full bg-primary/10" />
        <div className="h-2.5 w-5/6 bg-primary/10" />
      </div>
      <div className="flex flex-wrap gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-3 border-double bg-background h-6 w-12"
          />
        ))}
      </div>
    </div>
    <div className="w-full h-10 border-3 border-double bg-background" />
  </div>
);

export default function AboutDiary() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGetSuperAdminDiaryQuery(page);
  const diaryEntries = data?.posts || [];

  return (
    <div className="relative border-3 border-double p-3 flex flex-col gap-3">
      <CornerFlourish className="-top-1 -left-1" />
      <CornerFlourish className="-top-1 -right-1 rotate-90" />
      <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
      <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

      <div className="flex gap-1 items-center text-primary">
        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
          My Diary :
        </h4>
      </div>

      <p className="border-l-3 border-double pl-3  font-bold">
        Personal journals and unfiltered thoughts.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : diaryEntries.map((post) => <PostCard key={post.id} post={post} />)}
      </div>

      {!isLoading && diaryEntries.length === 0 && (
        <div className="p-3 border-3 border-double text-center flex flex-col gap-3 items-center">
          <p className="text-sm font-bold">No diary entries yet.</p>
          <p className="text-xs font-bold">The journey is just beginning.</p>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-3 border-double p-3 mt-2">
          <p className="text-xs font-bold opacity-70">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-3 border-double px-3 py-1 text-xs font-bold hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-colors"
            >
              Prev
            </button>
            <button
              disabled={page === data.totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="border-3 border-double px-3 py-1 text-xs font-bold hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
