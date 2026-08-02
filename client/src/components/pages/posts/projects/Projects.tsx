//src/components/pages/posts/projects/Projects.tsx
"use client";

import React, { useMemo, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import PostCard from "../PostCard";
import CornerFlourish from "@/components/shared/CornerFlourish";
import FilterSection from "../FilterSection";
import { Star, Shapes, AlertTriangle } from "lucide-react";
import {
  useGetFilteredPostsQuery,
  useGetAllTagsQuery,
} from "@/lib/features/posts/postsApiSlice";

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
      <div className="h-5 w-16 bg-primary/20" />
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

const tabs = [
  { key: "serious", label: "Serious Projects", icon: Star },
  { key: "random", label: "Random Projects", icon: Shapes },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function Projects() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get("tab") as TabKey) || "serious";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const searchQuery = searchParams.get("q") || "";

  const activeTagsString = searchParams.get("tag") || "";
  const selectedTags = useMemo(
    () => (activeTagsString ? activeTagsString.split(",") : []),
    [activeTagsString],
  );

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

  const setSortBy = useCallback(
    (val: "date" | "title") => updateURL("sortBy", val, false),
    [updateURL],
  );

  const setSortOrder = useCallback(
    (val: "ASC" | "DESC") => updateURL("sortOrder", val, false),
    [updateURL],
  );

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      const params = new URLSearchParams();
      params.set("tab", tab);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const {
    data: activeData,
    isLoading,
    isFetching,
    isError,
  } = useGetFilteredPostsQuery({
    page,
    q: searchQuery || null,
    category: "projects",
    subcategory: activeTab,
    tag: activeTagsString || null,
    sortBy,
    sortOrder,
  });

  const { data: contextualTagsData } = useGetAllTagsQuery({
    category: "projects",
    subcategory: activeTab,
  });

  const isPageLoading = isLoading || isFetching;
  const filteredPosts = activeData?.posts || [];
  const allAvailableTags = contextualTagsData?.tags || [];

  return (
    <section className="p-3 lg:p-6 min-h-screen flex flex-col gap-6 bg-background text-foreground">
      <header className="relative border-3 border-double p-3 flex flex-col gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <div className=" text-primary">
          <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit uppercase">
            Projects :
          </h4>
        </div>
        <p className="border-l-3 border-double pl-3 text-xs font-bold">
          What I built. Some serious, some from the tutorial trenches.
        </p>
      </header>

      <div className="flex gap-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = isActive && activeData ? activeData.total : "—";

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "relative border-3 border-double p-3 flex items-center gap-2 transition-all flex-1",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-card hover:text-primary",
              )}
            >
              <CornerFlourish
                className={cn(
                  "-top-1 -left-1",
                  isActive ? "text-primary-foreground" : "text-primary",
                )}
              />
              <CornerFlourish
                className={cn(
                  "-bottom-1 -right-1 rotate-180",
                  isActive ? "text-primary-foreground" : "text-primary",
                )}
              />

              <tab.icon className="h-4 w-4" />
              <span className="text-sm font-bold uppercase">{tab.label}</span>
              <span
                className={cn(
                  "text-xs font-bold border-3 border-double px-2 py-0.5 ml-auto",
                  isActive
                    ? "border-primary-foreground text-primary-foreground"
                    : "border-primary text-primary",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <FilterSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTags={selectedTags}
        toggleTag={toggleTag}
        allAvailableTags={allAvailableTags}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        clearAllFilters={() =>
          router.push(`${pathname}?tab=${activeTab}`, { scroll: false })
        }
      />

      {isError ? (
        <div className="border-3 border-double border-destructive p-4 flex items-center gap-2 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <span className="text-xs font-bold text-destructive">
            Failed to load projects. Please check your connection and try again.
          </span>
        </div>
      ) : (
        <>
          {!isPageLoading && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold border-3 border-double px-2 py-1 uppercase">
                {filteredPosts.length}{" "}
                {filteredPosts.length === 1 ? "project" : "projects"}
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

          {!isPageLoading && filteredPosts.length === 0 && (
            <div className="p-3 border-3 border-double text-center flex flex-col gap-3 items-center font-bold">
              <p className="text-sm">No projects found.</p>
              <p className="text-xs">
                Try different keywords or switch to the other tab.
              </p>
            </div>
          )}

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
