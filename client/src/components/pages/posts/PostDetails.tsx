//src/components/pages/posts/PostDetails.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import CornerFlourish from "@/components/shared/CornerFlourish";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  useGetPostQuery,
  useDeletePostMutation,
} from "@/lib/features/posts/postsApiSlice";
import { formatDistanceToNow } from "date-fns";

const SmartImage = ({
  src,
  alt,
  isAvatar,
  priority,
  className,
}: {
  src: string;
  alt: string;
  isAvatar?: boolean;
  priority?: boolean;
  className?: string;
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);
  const fallbackSrc = isAvatar
    ? "/avatar-fallback.png"
    : "/project-fallback.png";

  const currentSrc = hasError ? fallbackSrc : src;
  const isCloudinary = currentSrc.includes("cloudinary.com");
  return (
    <div
      className={cn(
        "relative overflow-hidden w-full h-full",
        isAvatar && "border-3 border-double",
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 animate-pulse flex items-center justify-center border-3 border-double bg-background">
          {!isAvatar && <span className="text-xs font-bold">Loading...</span>}
        </div>
      )}
      <Image
        src={currentSrc}
        alt={alt || "Media asset"}
        fill
        priority={priority}
        quality={75}
        decoding="async"
        unoptimized={isCloudinary}
        sizes={isAvatar ? "40px" : "(max-width: 1200px) 100vw, 80vw"}
        className={cn(
          "object-cover object-center transition-opacity duration-500",
          isLoading ? "opacity-0" : "opacity-100",
          className,
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
};

const DetailsSkeleton = () => (
  <div className="flex flex-col gap-6 animate-pulse">
    <div className="h-12 w-full border-3 border-double bg-background" />
    <div className="relative h-[25vh] sm:h-[35vh] lg:h-[40vh] w-full border-3 border-double bg-background flex items-center justify-center">
      <span className="text-xs font-bold">Loading...</span>
    </div>
    <div className="flex gap-3 w-full">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-16 w-24 border-3 border-double bg-background shrink-0"
        />
      ))}
    </div>
    <div className="h-24 w-full border-3 border-double bg-background mt-4" />
    <div className="h-64 w-full border-3 border-double bg-background mt-4" />
  </div>
);

const categoryRoutes: Record<string, string> = {
  "computer-science": "/posts/computer-science",
  "bio-engineering": "/posts/bio-engineering",
  projects: "/posts/projects",
  diary: "/posts/diary",
};

const categoryNames: Record<string, string> = {
  "computer-science": "Computer Science",
  "bio-engineering": "Bio-engineering",
  projects: "Projects",
  diary: "Diary",
};

export default function PostDetails({ postId }: { postId: string }) {
  const router = useRouter();
  const { user: currentUser } = useSelector((state: any) => state.auth);
  const { data, isLoading: isQueryLoading, isError } = useGetPostQuery(postId);
  const post = data?.post;
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const canManagePost =
    currentUser &&
    (currentUser.id === post?.author_id || currentUser.role === "super_admin");

  const handleDelete = async () => {
    try {
      await deletePost(postId).unwrap();
      const redirectUrl = post?.category
        ? categoryRoutes[post.category]
        : "/posts/all-posts";
      router.push(redirectUrl);
    } catch (err) {
      alert("Failed to delete post. Please try again.");
    }
  };

  const AUTHOR_NAME = post?.author_name || "protocols_farmer";
  const AUTHOR_TITLE = post?.author_title || "Member";
  const AUTHOR_AVATAR =
    post?.author_avatar ||
    "https://res.cloudinary.com/dhr9zmb3i/image/upload/v1772941590/cat_kw8xmu.jpg";

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => setCurrent(api.selectedScrollSnap() + 1));
  }, [api]);

  if (isQueryLoading) {
    return (
      <section className="p-3 lg:p-6 min-h-screen flex flex-col gap-6 bg-background text-foreground">
        <DetailsSkeleton />
      </section>
    );
  }

  if (isError || !post) {
    return (
      <section className="p-3 lg:p-6 min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <div className="border-3 border-double p-6 flex flex-col gap-3 text-center w-full max-w-md">
          <h1 className="text-xl font-bold text-primary">Post Not Found</h1>
          <p className="text-sm">
            The requested post could not be found or has been deleted.
          </p>
          <Button
            asChild
            variant="outline"
            className="border-3 border-double rounded-none mt-3"
          >
            <Link href="/posts/all-posts">Return to All Posts</Link>
          </Button>
        </div>
      </section>
    );
  }

  const returnUrl = categoryRoutes[post.category] || "/posts/all-posts";
  const returnLabel = categoryNames[post.category] || "All Posts";

  return (
    <section className="p-3 lg:p-6 min-h-screen flex flex-col gap-6 bg-background text-foreground">
      {/* --- HEADER --- */}
      <header className="relative border-3 border-double p-3 flex flex-wrap items-center justify-between gap-3">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-bold text-primary">Post Details :</h4>
          <span className="bg-primary text-primary-foreground font-bold p-1 text-xs border-double border-3">
            {post.category}
          </span>
          {post.subcategory && (
            <span
              className={cn(
                "font-bold p-1 text-xs border-3 border-double",
                post.subcategory === "serious"
                  ? "bg-primary text-primary-foreground"
                  : "border-primary text-primary",
              )}
            >
              {post.subcategory}
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-3 border-double rounded-none h-8 text-xs"
          >
            <Link href={returnUrl}> {returnLabel}</Link>
          </Button>

          {canManagePost && (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-3 border-double rounded-none h-8 text-xs"
              >
                <Link href={`/posts/update-post/${post.id}`}>Update</Link>
              </Button>
              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="outline"
                size="sm"
                className="border-3 border-double border-destructive text-destructive rounded-none h-8 text-xs"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </header>

      {/* --- IMAGES CAROUSEL --- */}
      {post.post_images && post.post_images.length > 0 && (
        <div className="relative border-3 border-double p-3 flex flex-col gap-3">
          <CornerFlourish className="-top-1 -left-1" />
          <CornerFlourish className="-top-1 -right-1 rotate-90" />
          <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
          <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

          <div className="flex justify-between items-center">
            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
              Images :
            </h4>
            <span className="text-xs font-bold border-3 border-double p-1">
              {current} / {count || post.post_images.length}
            </span>
          </div>

          <div className="w-full group">
            <Carousel
              setApi={setApi}
              className="w-full border-3 border-double bg-background"
            >
              <CarouselContent>
                {post.post_images.map((img: string, index: number) => (
                  <CarouselItem key={index}>
                    <div className="relative h-[25vh] sm:h-[35vh] lg:h-[40vh] w-full">
                      <SmartImage
                        src={img}
                        alt={`Image ${index + 1}`}
                        priority={index === 0}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 rounded-none border-3 border-double bg-background text-primary hover:bg-primary hover:text-primary-foreground transition-all h-8 w-8" />
              <CarouselNext className="right-2 rounded-none border-3 border-double bg-background text-primary hover:bg-primary hover:text-primary-foreground transition-all h-8 w-8" />
            </Carousel>
          </div>

          {/* Thumbnail strip */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary w-full">
            {post.post_images.map((img: string, index: number) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "relative h-16 w-24 shrink-0 transition-all duration-300",
                  index === current - 1
                    ? "border-3 border-double border-primary"
                    : "border-3 border-double border-transparent hover:border-primary/50",
                )}
              >
                <SmartImage src={img} alt={`Thumbnail ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- POST CONTENT --- */}
      <div className="relative border-3 border-double p-3 flex flex-col gap-6">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        {/* Author + Dates */}
        <div className="flex flex-col gap-3 pb-3 border-b-3 border-double">
          <div className="flex justify-between flex-wrap gap-3">
            {/* MATCHED FLEX ITEMS-BASELINE ALIGNMENT HERE */}
            <div className="flex gap-2 items-center">
              <div className="relative w-10 h-10 shrink-0">
                <SmartImage src={AUTHOR_AVATAR} alt={AUTHOR_NAME} isAvatar />
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <p className="text-primary flex items-baseline gap-2 line-clamp-1">
                  <span className="font-bold text-sm truncate">
                    {AUTHOR_NAME}
                  </span>
                  <span className="text-xs font-bold opacity-80 truncate">
                    {AUTHOR_TITLE}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col text-xs font-bold text-left sm:text-right justify-center">
              <p>
                Created:{" "}
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}
              </p>
              <p>
                Edited:{" "}
                {formatDistanceToNow(new Date(post.updated_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Links + Tags */}
        <div className="flex flex-col gap-3 pb-3 border-b-3 border-double">
          <div className="flex flex-wrap gap-2">
            {post.github_link ? (
              <Button asChild className="border-3 border-double rounded-none">
                <a
                  href={post.github_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Github Source
                </a>
              </Button>
            ) : (
              <span className="font-bold p-1 text-xs border-3 border-double border-primary text-primary">
                No Github link
              </span>
            )}
            {post.external_link ? (
              <Button asChild className="border-3 border-double rounded-none">
                <a
                  href={post.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  External Link
                </a>
              </Button>
            ) : (
              <span className="font-bold p-1 text-xs border-3 border-double border-primary text-primary">
                No external link
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag: string) => (
              <span
                key={tag}
                className="border-3 border-double bg-background p-1 text-xs font-bold"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Title + Content */}
        <div className="flex flex-col gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-primary">
            {post.title}
          </h1>
          <div className="border-l-3 border-double pl-3">
            <p className="text-sm font-bold">{post.short_description}</p>
          </div>
          <div className="flex flex-col gap-3 mt-3 ">
            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm border-3 border-double">
              Core Content :
            </h4>
            <div className="border-l-3 border-double pl-3">
              <p className="text-sm whitespace-pre-line">{post.main_content}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- CUSTOM DELETE MODAL --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="border-3 border-double bg-background p-6 flex flex-col gap-4 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg text-destructive flex items-center gap-2">
              Delete Post?
            </h3>
            <p className="text-sm font-medium">
              Are you sure you want to permanently delete this post? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="border-3 border-double rounded-none text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="border-3 border-double border-destructive bg-destructive text-destructive-foreground rounded-none text-xs"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
