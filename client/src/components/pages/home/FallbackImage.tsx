//src/components/pages/home/FallbackImage.tsx
"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";

interface FallbackImageProps extends ImageProps {
  fallbackSrc?: string;
}

export default function FallbackImage({
  src,
  alt,
  className,
  fallbackSrc = "https://picsum.photos/seed/error/800/450",
  ...rest
}: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      className={cn(
        "relative overflow-hidden w-full h-full bg-muted",
        className,
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-muted animate-pulse flex items-center justify-center border-2 border-dashed border-primary/20">
          <span className="text-[10px] font-mono text-primary/50 uppercase tracking-widest">
            Loading_Data...
          </span>
        </div>
      )}

      <Image
        {...rest}
        src={imgSrc}
        alt={alt}
        className={cn(
          "object-cover transition-opacity duration-500",
          isLoading ? "opacity-0" : "opacity-100",
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImgSrc(fallbackSrc);
          setIsLoading(false);
        }}
      />
    </div>
  );
}
