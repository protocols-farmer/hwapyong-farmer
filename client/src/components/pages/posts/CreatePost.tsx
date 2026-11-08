//src/components/pages/posts/CreatePost.tsx
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CornerFlourish } from "@/components/shared/flourishes/CornerFlourish";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Dna,
  FlaskConical,
  Book,
  Plus,
  X,
  Eye,
  Save,
  AlertTriangle,
  Upload,
  Loader2,
  Link,
  Github,
  Star,
} from "lucide-react";

import {
  useCreatePostMutation,
  useUploadMediaMutation,
} from "@/lib/features/posts/postsApiSlice";
import { postSchema } from "@/lib/features/posts/postsSchema";
import { PostCategory, PostSubcategory } from "@/lib/features/posts/postsTypes";
import AuthGuard from "@/components/shared/AuthGuard";
import PostContent from "@/components/shared/PostContent";
import { normalizeUrlProtocol } from "@/lib/utils/url";
import { OrnateVictoria } from "@/components/shared/flourishes/OrnateVictoria";
import { BorderCenterpiece } from "@/components/shared/flourishes/BorderCenterpiece";

const PostEditor = dynamic(() => import("./PostEditor"), {
  ssr: false,
  loading: () => (
    <div className="border-3 border-double bg-background p-3 min-h-[300px] flex items-center justify-center text-xs font-bold text-primary animate-pulse">
      Loading editor...
    </div>
  ),
});

const categories = [
  {
    slug: "computer-science" as PostCategory,
    label: "Computer Science",
    icon: Monitor,
  },
  {
    slug: "bio-engineering" as PostCategory,
    label: "Bio-engineering",
    icon: Dna,
  },
  { slug: "projects" as PostCategory, label: "Projects", icon: FlaskConical },
  { slug: "diary" as PostCategory, label: "Diary", icon: Book },
];

const projectSubcategories = [
  { slug: "serious" as PostSubcategory, label: "Serious Project" },
  { slug: "random" as PostSubcategory, label: "Random Project" },
];

type PostFormData = z.infer<typeof postSchema>;

export default function CreatePost() {
  const router = useRouter();

  const [createPost, { isLoading: isSubmitting }] = useCreatePostMutation();
  const [uploadMedia] = useUploadMediaMutation();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    setError: setFormError,
    formState: { errors, isDirty },
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    mode: "onSubmit",
    defaultValues: {
      slug: "",
      title: "",
      short_description: "",
      main_content: "",
      category: undefined,
      subcategory: null,
      is_published: true,
      featured: false,
      thumbnail: "",
      post_images: [],
      tags: [],
      external_link: "",
      github_link: "",
    },
  });

  const slugValue = watch("slug") || "";
  const titleValue = watch("title") || "";
  const category = watch("category");
  const subcategory = watch("subcategory");
  const isPublished = watch("is_published") ?? true;
  const isFeatured = watch("featured") ?? false;
  const tags = watch("tags") || [];
  const postImages = watch("post_images") || [];
  const thumbnail = watch("thumbnail") || "";
  const mainContentValue = watch("main_content") || "";

  const titleChars = titleValue.length;
  const slugChars = slugValue.length;
  const shortDescChars = watch("short_description")?.length || 0;
  const mainContentChars = mainContentValue.length;
  const externalLinkChars = watch("external_link")?.length || 0;
  const githubLinkChars = watch("github_link")?.length || 0;

  const [tagInput, setTagInput] = useState("");
  const [thumbInput, setThumbInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [serverError, setServerError] = useState("");

  const isAnyImageUploading = isUploadingThumb || isUploadingGallery;
  const thumbInputChars = thumbInput.length;
  const imageInputChars = imageInput.length;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  const previewSlug =
    slugValue.trim().toLowerCase() ||
    titleValue
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "") ||
    "auto-generated-slug";

  const addTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (!trimmed) return;

    if (trimmed.length < 2) {
      setFormError("tags", {
        message: "Tags must be at least 2 characters.",
      });
      return;
    }
    if (trimmed.includes(" ")) {
      setFormError("tags", { message: "Tags cannot contain spaces." });
      return;
    }
    if (tags.some((t) => t.toLowerCase() === trimmed)) {
      setFormError("tags", { message: "This tag already exists." });
      return;
    }
    if (trimmed.length <= 25 && tags.length < 5) {
      setValue("tags", [...tags, trimmed], {
        shouldValidate: true,
        shouldDirty: true,
      });
      setTagInput("");
    }
  };

  const addThumbUrl = () => {
    if (thumbInput.trim()) {
      setValue("thumbnail", normalizeUrlProtocol(thumbInput), {
        shouldValidate: true,
        shouldDirty: true,
      });
      setThumbInput("");
    }
  };

  const addImageUrl = () => {
    if (imageInput.trim() && postImages.length < 5) {
      setValue(
        "post_images",
        [...postImages, normalizeUrlProtocol(imageInput)],
        { shouldValidate: true, shouldDirty: true },
      );
      setImageInput("");
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "thumb" | "gallery",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === "thumb") setIsUploadingThumb(true);
    else setIsUploadingGallery(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadMedia(formData).unwrap();
      if (target === "thumb") {
        setValue("thumbnail", result.url, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setThumbInput("");
      } else {
        setValue("post_images", [...postImages, result.url], {
          shouldValidate: true,
          shouldDirty: true,
        });
        setImageInput("");
      }
    } catch (err: any) {
      console.error("[CreatePost.handleFileUpload] Media upload failed", err);
      const msg =
        err?.status === 413
          ? "Payload too large. Max 5MB."
          : err?.data?.error || "Upload failed.";
      setFormError(target === "thumb" ? "thumbnail" : "post_images", {
        message: msg,
      });
    } finally {
      if (target === "thumb") setIsUploadingThumb(false);
      else setIsUploadingGallery(false);
      e.target.value = "";
    }
  };

  const onSubmit = async (data: PostFormData) => {
    setServerError("");
    try {
      const cleanedSlug = data.slug?.trim().toLowerCase();
      const result = await createPost({
        category: data.category,
        subcategory: data.subcategory || null,
        is_published: data.is_published ?? true,
        featured: data.featured ?? false,
        thumbnail: data.thumbnail,
        post_images: data.post_images,
        title: data.title.trim(),
        short_description: data.short_description.trim(),
        main_content: data.main_content,
        tags: data.tags.map((t) => t.trim().toLowerCase()),
        external_link: data.external_link
          ? normalizeUrlProtocol(data.external_link)
          : null,
        github_link: data.github_link
          ? normalizeUrlProtocol(data.github_link)
          : null,
        ...(cleanedSlug ? { slug: cleanedSlug } : {}),
      }).unwrap();

      const newPost = result.post;
      router.push(`/posts/${newPost.category}/${newPost.slug || newPost.id}`);
    } catch (err: any) {
      console.error("[CreatePost.onSubmit] Failed to create post", err);
      setServerError(err?.data?.error || "Server connection failed.");
    }
  };

  return (
    <AuthGuard
      message="Please log in with owner credentials to create a new post."
      level="critical"
    >
      <section className="p-3 relative  lg:p-6 min-h-screen border-3 border-double flex flex-col gap-6 bg-background text-foreground">
        <OrnateVictoria className="-top-1 -left-1" />
        <OrnateVictoria className="-top-1 -right-1 rotate-90" />
        <OrnateVictoria className="-bottom-1 -left-1 -rotate-90" />
        <OrnateVictoria className="-bottom-1 -right-1 rotate-180" />

        <BorderCenterpiece className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[60%] w-44 h-auto z-20" />
        <BorderCenterpiece className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[60%] w-44 h-auto rotate-180 z-20" />
        <div className="relative border-3 border-double p-3 flex flex-col gap-3">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h1 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
              Create Post :
            </h1>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              className="border-3 border-double rounded-none h-8 text-xs gap-1"
            >
              {isPreview ? (
                <>
                  <Save className="h-3 w-3" /> Edit
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" /> Preview
                </>
              )}
            </Button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className={cn("flex flex-col gap-6", isPreview && "hidden")}
        >
          {/* Category Card */}
          <div className="relative border-3 border-double p-3 flex flex-col gap-3">
            <CornerFlourish className="-top-1 -left-1" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
              Category :
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => {
                    if (category !== cat.slug) {
                      setValue("subcategory", null, { shouldDirty: true });
                    }
                    setValue("category", cat.slug, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                  className={cn(
                    "border-3 border-double p-3 flex flex-col items-center gap-2 transition-all",
                    category === cat.slug
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-card hover:text-primary",
                  )}
                >
                  <cat.icon className="h-5 w-5" />
                  <span className="text-xs font-bold">{cat.label}</span>
                </button>
              ))}
            </div>
            {errors.category && (
              <p className="text-xs text-destructive font-bold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {errors.category.message}
              </p>
            )}

            {category === "projects" && (
              <div className="flex gap-3">
                {projectSubcategories.map((sub) => (
                  <button
                    key={sub.slug}
                    type="button"
                    onClick={() =>
                      setValue("subcategory", sub.slug, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className={cn(
                      "border-3 border-double p-3 flex-1 text-xs font-bold transition-all",
                      subcategory === sub.slug
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-card hover:text-primary",
                    )}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
            {errors.subcategory && (
              <p className="text-xs text-destructive font-bold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{" "}
                {errors.subcategory.message}
              </p>
            )}
          </div>

          {/* Visibility & Slug Card */}
          <div className="relative border-3 border-double p-3 flex flex-col gap-3">
            <CornerFlourish className="-top-1 -left-1" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
              Visibility & URL :
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() =>
                  setValue("is_published", true, { shouldDirty: true })
                }
                className={cn(
                  "border-3 border-double p-3 text-xs font-bold transition-all",
                  isPublished
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-card hover:text-primary",
                )}
              >
                Published (Public)
              </button>

              <button
                type="button"
                onClick={() =>
                  setValue("is_published", false, { shouldDirty: true })
                }
                className={cn(
                  "border-3 border-double p-3 text-xs font-bold transition-all",
                  !isPublished
                    ? "bg-destructive text-destructive-foreground border-destructive"
                    : "hover:bg-card hover:text-primary",
                )}
              >
                Draft (Owner Only)
              </button>

              <button
                type="button"
                onClick={() =>
                  setValue("featured", !isFeatured, { shouldDirty: true })
                }
                className={cn(
                  "border-3 border-double p-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                  isFeatured
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-card hover:text-primary",
                )}
              >
                <Star className="h-4 w-4" />
                <span>{isFeatured ? "Featured : ON" : "Featured : OFF"}</span>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-primary flex justify-between items-center">
                <span>Custom Slug (optional)</span>
                <span
                  className={cn(
                    slugChars > 0 && (slugChars < 3 || slugChars > 100)
                      ? "text-destructive"
                      : "",
                  )}
                >
                  ({slugChars}/100)
                </span>
              </label>
              <Input
                {...register("slug")}
                placeholder="mastering-javascript-closures"
                maxLength={100}
                className="border-3 border-double rounded-none text-xs"
              />
              <p className="text-[11px] font-bold text-muted-foreground">
                Leave empty to auto-generate from the title. Preview:{" "}
                <span className="text-primary">
                  /posts/{category || "category"}/{previewSlug}
                </span>
              </p>
              {errors.slug && (
                <p className="text-xs text-destructive font-bold">
                  {errors.slug.message}
                </p>
              )}
            </div>
          </div>

          {/* Content Card */}
          <div className="relative border-3 border-double p-3 flex flex-col gap-3">
            <CornerFlourish className="-top-1 -left-1" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
              Content :
            </h4>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-primary">
                Title{" "}
                <span
                  className={cn(
                    titleChars < 5 || titleChars > 150
                      ? "text-destructive"
                      : "",
                  )}
                >
                  ({titleChars}/150)
                </span>
              </label>
              <Input
                {...register("title")}
                placeholder="Mastering JavaScript Closures"
                maxLength={150}
                className="border-3 border-double rounded-none text-xs"
              />
              {errors.title && (
                <p className="text-xs text-destructive font-bold">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-primary">
                Short Description{" "}
                <span
                  className={cn(
                    shortDescChars < 10 || shortDescChars > 300
                      ? "text-destructive"
                      : "",
                  )}
                >
                  ({shortDescChars}/300)
                </span>
              </label>
              <Textarea
                {...register("short_description")}
                placeholder="A brief summary of what this post is about..."
                rows={3}
                maxLength={300}
                className="border-3 border-double rounded-none text-xs resize-none"
              />
              {errors.short_description && (
                <p className="text-xs text-destructive font-bold">
                  {errors.short_description.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-primary">
                Main Content{" "}
                <span
                  className={cn(
                    mainContentChars < 50 || mainContentChars > 40000
                      ? "text-destructive"
                      : "",
                  )}
                >
                  ({mainContentChars}/40000)
                </span>
              </label>

              <div className={cn(isPreview && "hidden")}>
                <Controller
                  name="main_content"
                  control={control}
                  render={({ field }) => (
                    <PostEditor
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      hasError={Boolean(errors.main_content)}
                    />
                  )}
                />
              </div>

              {errors.main_content && (
                <p className="text-xs text-destructive font-bold">
                  {errors.main_content.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-primary">
                Tags{" "}
                <span
                  className={cn(tags.length >= 5 ? "text-destructive" : "")}
                >
                  ({tags.length}/5)
                </span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  disabled={tags.length >= 5}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder={
                    tags.length >= 5 ? "Limit reached" : "javascript"
                  }
                  maxLength={25}
                  className="border-3 border-double rounded-none text-xs flex-1 disabled:opacity-50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                  disabled={tags.length >= 5}
                  className="border-3 border-double rounded-none h-9 gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span className="text-xs">Add</span>
                </Button>
              </div>
              {errors.tags && (
                <p className="text-xs text-destructive font-bold">
                  {errors.tags.message}
                </p>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="border-3 border-double bg-card p-1 text-xs flex items-center gap-1"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            "tags",
                            tags.filter((t) => t !== tag),
                            { shouldValidate: true, shouldDirty: true },
                          )
                        }
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Card */}
          <div className="relative border-3 border-double p-3 flex flex-col gap-3">
            <CornerFlourish className="-top-1 -left-1" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
              Thumbnail{" "}
              <span
                className={cn(
                  thumbInputChars > 2048
                    ? "text-destructive-foreground"
                    : "font-normal",
                )}
              >
                ({thumbInputChars}/2048)
              </span>
            </h4>

            <div className="flex gap-2">
              <Input
                value={thumbInput}
                onChange={(e) => setThumbInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addThumbUrl();
                  }
                }}
                placeholder="https://res.cloudinary.com/demo/image/upload/sample.jpg"
                maxLength={2048}
                className="border-3 border-double rounded-none text-xs flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addThumbUrl}
                className="border-3 border-double rounded-none h-9 gap-1"
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs">Add</span>
              </Button>
              <div
                className={cn(
                  "relative border-3 border-double px-3 flex items-center bg-card h-9",
                  isAnyImageUploading
                    ? "opacity-40 cursor-not-allowed"
                    : "cursor-pointer",
                )}
              >
                {isUploadingThumb ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <input
                  type="file"
                  disabled={isAnyImageUploading}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  onChange={(e) => handleFileUpload(e, "thumb")}
                  accept="image/*"
                />
              </div>
            </div>
            {errors.thumbnail && (
              <p className="text-xs text-destructive font-bold">
                {errors.thumbnail.message}
              </p>
            )}
            {thumbnail && (
              <div className="relative h-16 w-24 border-3 border-double group">
                <img
                  src={thumbnail}
                  alt="Thumbnail preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setValue("thumbnail", "", {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Post Images Card */}
          <div className="relative border-3 border-double p-3 flex flex-col gap-3">
            <CornerFlourish className="-top-1 -left-1" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
              Post Images{" "}
              <span
                className={cn(
                  "font-normal",
                  (postImages.length >= 5 || imageInputChars > 2048) &&
                    "text-destructive-foreground",
                )}
              >
                ({postImages.length}/5){" "}
                {imageInputChars > 0 && `(Input: ${imageInputChars}/2048)`}
              </span>
            </h4>

            <div className="flex gap-2">
              <Input
                value={imageInput}
                disabled={postImages.length >= 5}
                onChange={(e) => setImageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImageUrl();
                  }
                }}
                placeholder={
                  postImages.length >= 5
                    ? "Limit reached"
                    : "https://example.com/image.jpg"
                }
                maxLength={2048}
                className="border-3 border-double rounded-none text-xs flex-1 disabled:opacity-50"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImageUrl}
                disabled={postImages.length >= 5}
                className="border-3 border-double rounded-none h-9 gap-1"
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs">Add</span>
              </Button>
              <div
                className={cn(
                  "relative border-3 border-double px-3 flex items-center bg-card h-9",
                  postImages.length >= 5 || isAnyImageUploading
                    ? "opacity-40 cursor-not-allowed"
                    : "cursor-pointer",
                )}
              >
                {isUploadingGallery ? (
                  <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <input
                  type="file"
                  disabled={isAnyImageUploading || postImages.length >= 5}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  onChange={(e) => handleFileUpload(e, "gallery")}
                  accept="image/*"
                />
              </div>
            </div>
            {errors.post_images && (
              <p className="text-xs text-destructive font-bold">
                {errors.post_images.message}
              </p>
            )}
            {postImages.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {postImages.map((img, i) => (
                  <div
                    key={i}
                    className="relative h-16 w-24 border-3 border-double group"
                  >
                    <img
                      src={img}
                      alt={`Gallery ${i}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setValue(
                          "post_images",
                          postImages.filter((x) => x !== img),
                          { shouldValidate: true, shouldDirty: true },
                        )
                      }
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links Card */}
          <div className="relative border-3 border-double p-3 flex flex-col gap-3">
            <CornerFlourish className="-top-1 -left-1" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
              Links :
            </h4>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-primary flex items-center gap-1">
                  <Link className="h-3 w-3" /> External Link{" "}
                  <span
                    className={cn(
                      externalLinkChars > 2048
                        ? "text-destructive"
                        : "font-normal",
                    )}
                  >
                    ({externalLinkChars}/2048)
                  </span>
                </label>

                <Input
                  {...register("external_link")}
                  onBlur={(e) => {
                    setValue(
                      "external_link",
                      normalizeUrlProtocol(e.target.value),
                      { shouldValidate: true, shouldDirty: true },
                    );
                  }}
                  placeholder="https://developer.mozilla.org/en-US/"
                  maxLength={2048}
                  className="border-3 border-double rounded-none text-xs"
                />
                {errors.external_link && (
                  <p className="text-xs text-destructive font-bold">
                    {errors.external_link.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-primary flex items-center gap-1">
                  <Github className="h-3 w-3" /> GitHub Link{" "}
                  <span
                    className={cn(
                      githubLinkChars > 2048
                        ? "text-destructive"
                        : "font-normal",
                    )}
                  >
                    ({githubLinkChars}/2048)
                  </span>
                </label>

                <Input
                  {...register("github_link")}
                  onBlur={(e) => {
                    setValue(
                      "github_link",
                      normalizeUrlProtocol(e.target.value),
                      { shouldValidate: true, shouldDirty: true },
                    );
                  }}
                  placeholder="https://github.com/example/repo"
                  maxLength={2048}
                  className="border-3 border-double rounded-none text-xs"
                />
                {errors.github_link && (
                  <p className="text-xs text-destructive font-bold">
                    {errors.github_link.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="border-3 border-double border-destructive p-3 bg-destructive/10 flex flex-col gap-1">
              <p className="text-xs font-bold text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Fix the following errors:
              </p>
              {Object.entries(errors).map(([field, msg]) => (
                <p key={field} className="text-xs text-destructive/80">
                  {field.replace("_", " ")}: {String(msg?.message)}
                </p>
              ))}
            </div>
          )}

          {serverError && (
            <div className="border-3 border-double border-destructive p-3 bg-destructive/10">
              <p className="text-xs font-bold text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {serverError}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || isAnyImageUploading}
              className="border-3 border-double rounded-none flex-1 gap-1"
            >
              {isSubmitting ? (
                <span className="text-xs">Creating...</span>
              ) : (
                <>
                  <Save className="h-4 w-4" />{" "}
                  <span>{isPublished ? "Publish Post" : "Save Draft"}</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-3 border-double rounded-none"
            >
              Cancel
            </Button>
          </div>
        </form>

        {isPreview && (
          <div className="relative border-3 border-double p-3 flex flex-col gap-6">
            <CornerFlourish className="-top-1 -left-1" />
            <CornerFlourish className="-top-1 -right-1 rotate-90" />
            <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
            <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

            {!isPublished && (
              <div className="border-3 border-double border-destructive bg-destructive/10 p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs font-bold text-destructive">
                  This post is a draft. Only you can see it.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {category && (
                <span className="bg-primary text-primary-foreground font-bold p-1 text-xs border-double border-3">
                  {category}
                </span>
              )}
              {subcategory && (
                <span className="font-bold p-1 text-xs border-3 border-double border-primary text-primary">
                  {subcategory}
                </span>
              )}
              {!isPublished && (
                <span className="border-3 border-double border-destructive bg-destructive text-destructive-foreground font-bold p-1 text-xs">
                  Draft
                </span>
              )}
              {isFeatured && (
                <span className="border-3 border-double border-primary bg-primary/10 text-primary font-bold p-1 text-xs flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Featured
                </span>
              )}
            </div>

            {postImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {postImages.map((img, index) => (
                  <img
                    key={`${img}-${index}`}
                    src={img}
                    alt={`Gallery image ${index + 1}`}
                    className="h-24 w-auto border-3 border-double object-cover"
                  />
                ))}
              </div>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="border-3 border-double bg-background p-1 text-xs font-bold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-xl md:text-2xl font-bold text-primary [overflow-wrap:anywhere]">
              {watch("title") || "Untitled post"}
            </h1>

            {watch("short_description") && (
              <div className="border-l-3 border-double pl-3">
                <p className="text-sm font-bold [overflow-wrap:anywhere]">
                  {watch("short_description")}
                </p>
              </div>
            )}

            <div className="border-l-3 border-double pl-3 max-w-3xl">
              {mainContentValue.trim() ? (
                <PostContent content={mainContentValue} />
              ) : (
                <p className="text-xs font-bold text-muted-foreground italic">
                  Nothing to preview yet.
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreview(false)}
              className="border-3 border-double rounded-none w-fit gap-1"
            >
              <Save className="h-4 w-4" /> Back to editing
            </Button>
          </div>
        )}
      </section>
    </AuthGuard>
  );
}
