//src/components/pages/posts/MyPosts/MyPosts.tsx
"use client";

import React, { useMemo, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import PostCard from "../PostCard";
import CornerFlourish from "@/components/shared/CornerFlourish";
import FilterSection from "../FilterSection";
import { AlertTriangle } from "lucide-react";
import {
  useGetMyPostsQuery,
  useGetAllTagsQuery,
} from "@/lib/features/posts/postsApiSlice";
import AuthGuard from "@/components/shared/AuthGuard";

const CardSkeleton = () => (
  <div className="border-3 border-double bg-card flex flex-col gap-3 p-3 justify-between animate-pulse">
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video border-3 border-double bg-background flex items-center justify-center">
        <span className="text-xs font-bold">Loading...</span>
      </div>
      <div className="h-4 w-3/4 bg-primary/20 mt-4" />
      <div className="h-2.5 w-full bg-primary/10" />
    </div>
    <div className="w-full h-10 border-3 border-double bg-background" />
  </div>
);

const EmptyState = () => (
  <div className="p-6 border-3 border-double text-center flex flex-col gap-3 items-center bg-card">
    <p className="text-sm font-bold text-primary">
      No protocols found matching your criteria.
    </p>
    <p className="text-xs font-bold">
      You haven't created any posts yet, or they don't match your active
      filters.
    </p>
  </div>
);

function MyPostsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const searchQuery = searchParams.get("q") || "";

  const activeTagsString = searchParams.get("tag") || "";
  const selectedTags = useMemo(
    () => (activeTagsString ? activeTagsString.split(",") : []),
    [activeTagsString],
  );

  const activeCategory = searchParams.get("category") || "";
  const sortBy = (searchParams.get("sortBy") as "date" | "title") || "date";
  const sortOrder = (searchParams.get("sortOrder") as "ASC" | "DESC") || "DESC";

  const updateURL = useCallback(
    (key: string, value: string | null, resetPage: boolean = true) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);

      if (resetPage) params.set("page", "1");

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const toggleTag = useCallback(
    (tag: string) => {
      let newTags = [...selectedTags];
      if (newTags.includes(tag)) {
        newTags = newTags.filter((t) => t !== tag);
      } else {
        newTags.push(tag);
      }
      updateURL("tag", newTags.length > 0 ? newTags.join(",") : null);
    },
    [selectedTags, updateURL],
  );

  const setSearchQuery = useCallback(
    (val: string) => updateURL("q", val),
    [updateURL],
  );

  const setSelectedCategory = useCallback(
    (val: string) => updateURL("category", val),
    [updateURL],
  );

  const setSortBy = useCallback(
    (val: "date" | "title") => updateURL("sortBy", val, false),
    [updateURL],
  );

  const setSortOrder = useCallback(
    (val: "ASC" | "DESC") => updateURL("sortOrder", val, false),
    [updateURL],
  );

  const {
    data: activeData,
    isLoading,
    isFetching,
    isError,
  } = useGetMyPostsQuery({
    page,
    q: searchQuery || null,
    category: activeCategory !== "all" ? activeCategory : null,
    tag: activeTagsString || null,
    sortBy,
    sortOrder,
  });

  const {
    data: contextualTagsData,
    isLoading: isTagsLoading,
    isError: isTagsError,
  } = useGetAllTagsQuery({
    category: activeCategory !== "all" ? activeCategory : null,
    mine: true,
  });

  const isPageLoading = isLoading || isFetching;
  const filteredPosts = activeData?.posts || [];
  const allAvailableTags = contextualTagsData?.tags || [];

  return (
    <section className="p-3 lg:p-6 min-h-screen flex flex-col gap-6 bg-background text-foreground">
      <header className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <div className=" text-primary">
          <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit ">
            My Posts :
          </h4>
        </div>
        <p className="border-l-3 border-double pl-3 font-bold text-xs">
          Manage and monitor your personal protocol entries.
        </p>
      </header>

      <FilterSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTags={selectedTags}
        toggleTag={toggleTag}
        allAvailableTags={allAvailableTags}
        showCategoryFilter={true}
        allCategories={[
          "computer-science",
          "bio-engineering",
          "diary",
          "projects",
        ]}
        selectedCategory={activeCategory}
        setSelectedCategory={setSelectedCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        clearAllFilters={() => router.push(pathname, { scroll: false })}
        isTagsLoading={isTagsLoading}
        isTagsError={isTagsError}
      />

      {isError ? (
        <div className="border-3 border-double border-destructive p-4 flex items-center gap-2 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <span className="text-xs font-bold text-destructive">
            Failed to establish connection to your posts.
          </span>
        </div>
      ) : (
        <>
          {!isPageLoading && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold border-3 border-double px-2 py-1 ">
                {filteredPosts.length}{" "}
                {filteredPosts.length === 1 ? "entry" : "entries"} found
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {isPageLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))
              : filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
          </div>

          {!isPageLoading && filteredPosts.length === 0 && <EmptyState />}

          {activeData && activeData.totalPages > 1 && (
            <div className="flex items-center justify-between border-3 border-double p-3 mt-4">
              <p className="text-xs font-bold opacity-70">
                Showing Page {activeData.page} of {activeData.totalPages} (
                {activeData.total} total posts)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1 || isPageLoading}
                  onClick={() =>
                    updateURL("page", String(Math.max(1, page - 1)), false)
                  }
                  className="border-3 border-double px-3 py-1 text-xs font-bold hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-colors"
                >
                  Prev
                </button>
                <button
                  disabled={page === activeData.totalPages || isPageLoading}
                  onClick={() => updateURL("page", String(page + 1), false)}
                  className="border-3 border-double px-3 py-1 text-xs font-bold hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function MyPosts() {
  return (
    <AuthGuard
      message="Access denied. Please provide credentials to access security and profile settings."
      level="critical"
    >
      <MyPostsContent />
    </AuthGuard>
  );
}
