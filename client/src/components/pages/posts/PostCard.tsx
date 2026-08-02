//src/components/pages/posts/PostCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import CornerFlourish from "../../shared/CornerFlourish";
import { formatDistanceToNow } from "date-fns";
import { Post } from "@/lib/features/posts/postsTypes";

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
          {!isAvatar && <span className="text-sm font-bold">Loading...</span>}
        </div>
      )}

      <Image
        src={currentSrc}
        alt={alt || "Media asset"}
        fill
        priority={priority}
        quality={75}
        unoptimized={isCloudinary}
        decoding="async"
        sizes={
          isAvatar
            ? "32px"
            : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        }
        className={cn(
          "object-cover transition-opacity duration-500",
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

export default function PostCard({ post }: { post: Post }) {
  const visibleTags = post.tags?.slice(0, 3) || [];
  const remainingTags = (post.tags?.length || 0) - 3;

  const AUTHOR_NAME = post.author_name || "protocols_farmer";
  const AUTHOR_TITLE = post.author_title || "Member";
  const AUTHOR_AVATAR =
    post.author_avatar ||
    "https://res.cloudinary.com/dhr9zmb3i/image/upload/v1772941590/cat_kw8xmu.jpg";

  return (
    <div className="relative border-3 border-double flex flex-col gap-3 p-3 justify-between">
      <CornerFlourish className="-top-1 -left-1" />
      <CornerFlourish className="-top-1 -right-1 rotate-90" />
      <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
      <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

      <div className="flex flex-col gap-3">
        {/* Thumbnail */}
        <div className="relative aspect-video">
          <SmartImage src={post.thumbnail} alt={post.title} isAvatar={false} />
        </div>

        {/* Category + Subcategory (if exists) */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="bg-primary text-primary-foreground border-3 border-double font-bold p-1 w-fit text-sm">
            {post.category}
          </span>
          {post.subcategory && (
            <span
              className={cn(
                "font-bold p-1 w-fit text-sm border-3 border-double",
                post.subcategory === "serious"
                  ? "bg-primary text-primary-foreground"
                  : "border-primary text-primary",
              )}
            >
              {post.subcategory}
            </span>
          )}
        </div>

        {/* Content with Clamping */}
        <div className="flex flex-col gap-1">
          <h4 className="text-primary font-bold line-clamp-1">{post.title}</h4>
          <p className="text-sm font-bold line-clamp-2">
            {post.short_description}
          </p>
          <p className="text-sm line-clamp-3">{post.main_content}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Author & Dates */}
        <div className="flex gap-2 items-center">
          <div className="relative w-10 h-10 shrink-0">
            <SmartImage src={AUTHOR_AVATAR} alt={AUTHOR_NAME} isAvatar={true} />
          </div>
          <div className="flex flex-col justify-center flex-1 min-w-0">
            <p className="text-primary flex items-baseline gap-2 line-clamp-1">
              <span className="font-bold truncate">{AUTHOR_NAME}</span>
              <span className="text-sm opacity-80 truncate">
                {AUTHOR_TITLE}
              </span>
            </p>
            <p className="text-[10px] opacity-80 font-bold line-clamp-1 mt-0.5">
              C:{" "}
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
              })}{" "}
              | E:{" "}
              {formatDistanceToNow(new Date(post.updated_at), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag: string) => (
            <span
              key={tag}
              className="border-3 border-double bg-background p-1 text-sm"
            >
              #{tag}
            </span>
          ))}
          {remainingTags > 0 && (
            <span className="border-3 border-double p-1 text-sm font-bold bg-primary text-primary-foreground">
              +{remainingTags}
            </span>
          )}
        </div>
        <div>
          <Button asChild className="w-full rounded-none ">
            <Link
              href={`/posts/${post.category}/${post.id}`}
              className="w-full font-bold"
            >
              See {post.category}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
