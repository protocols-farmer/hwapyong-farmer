//src/components/layouts/sidebar/sideBarCards/CategoryCard.tsx
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Dna,
  Files,
  FlaskConical,
  Star,
  Shapes,
  AlertTriangle,
} from "lucide-react";
import { useGetFilteredPostsQuery } from "@/lib/features/posts/postsApiSlice";

export default function CategoryCard() {
  const pathname = usePathname();

  const {
    data: allData,
    isLoading: lAll,
    isError: eAll,
  } = useGetFilteredPostsQuery({});
  const {
    data: csData,
    isLoading: lCs,
    isError: eCs,
  } = useGetFilteredPostsQuery({ category: "computer-science" });
  const {
    data: bioData,
    isLoading: lBio,
    isError: eBio,
  } = useGetFilteredPostsQuery({ category: "bio-engineering" });
  const {
    data: diaryData,
    isLoading: lDiary,
    isError: eDiary,
  } = useGetFilteredPostsQuery({ category: "diary" });
  const {
    data: projSeriousData,
    isLoading: lProjS,
    isError: eProjS,
  } = useGetFilteredPostsQuery({
    category: "projects",
    subcategory: "serious",
  });
  const {
    data: projRandomData,
    isLoading: lProjR,
    isError: eProjR,
  } = useGetFilteredPostsQuery({ category: "projects", subcategory: "random" });

  const isLoading = lAll || lCs || lBio || lDiary || lProjS || lProjR;
  const isError = eAll || eCs || eBio || eDiary || eProjS || eProjR;

  const projSeriousCount = projSeriousData?.total || 0;
  const projRandomCount = projRandomData?.total || 0;
  const projTotal = projSeriousCount + projRandomCount;

  const categories = [
    {
      title: "All posts",
      icon: Files,
      href: "/posts/all-posts",
      count: allData?.total || 0,
      detail: "simple",
    },
    {
      title: "Projects",
      icon: FlaskConical,
      href: "/posts/projects",
      count: projTotal,
      detail: {
        serious: projSeriousCount,
        random: projRandomCount,
      },
    },
    {
      title: "Computer Science",
      icon: Monitor,
      href: "/posts/computer-science",
      count: csData?.total || 0,
      detail: "simple",
    },
    {
      title: "Bio-engineering",
      icon: Dna,
      href: "/posts/bio-engineering",
      count: bioData?.total || 0,
      detail: "simple",
    },
    {
      title: "Diary",
      icon: Dna,
      href: "/posts/diary",
      count: diaryData?.total || 0,
      detail: "simple",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {categories.map((cat, i) => {
        const isActive = pathname === cat.href;

        return (
          <Link
            href={cat.href}
            key={i}
            className={cn(
              " border-3 border-double hover:bg-card/70  transition-all duration-300 p-3 flex flex-col gap-3 ",
              isActive && "bg-card  ",
            )}
          >
            <div className="flex gap-1 items-center  text-primary ">
              <cat.icon className="h-5 w-5" />
              <h3>{cat.title}</h3>
            </div>

            <div className="p-3 border-3 border-double text-xs">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-1">
                  <span className="animate-pulse">Syncing...</span>
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center gap-1 py-1 text-destructive font-bold">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Error syncing</span>
                </div>
              ) : typeof cat.detail === "string" ? (
                <div className="flex justify-between">
                  <div className="flex gap-1 items-center text-primary">
                    <Files className="h-3 w-3" />
                    <span>Posts :</span>
                  </div>
                  <span className="font-bold">{cat.count}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <div className="flex gap-1 items-center text-primary">
                      <Star className="h-3 w-3" />
                      <span>Serious :</span>
                    </div>
                    <span className="font-bold">{cat.detail.serious}</span>
                  </div>

                  <div className="flex justify-between mt-1">
                    <div className="flex gap-1 items-center text-primary">
                      <Shapes className="h-3 w-3" />
                      <span>Random :</span>
                    </div>
                    <span className="font-bold">{cat.detail.random}</span>
                  </div>
                </>
              )}
            </div>

            <Button
              asChild
              variant="outline"
              className="border-3 border-double rounded-none w-full pointer-events-none"
            >
              <span>Enter Room</span>
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
