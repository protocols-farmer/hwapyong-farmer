//src/features/posts/posts.types.ts
export type PostCategory =
  "bio-engineering" | "computer-science" | "projects" | "diary";
export type ProjectSubcategory = "serious" | "random" | null;

export interface PostCard {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  thumbnail: string;
  tags: string[];
  category: PostCategory;
  subcategory: ProjectSubcategory;
  featured: boolean;
  is_published: boolean;
  github_link?: string | null;
  external_link?: string | null;
  created_at: Date;
  updated_at: Date;
  author_name: string;
  author_title: string;
  author_avatar: string;
}

export interface Post extends PostCard {
  post_images: string[];
  main_content: string;
}

export interface CreatePostDTO {
  slug?: string;
  category: PostCategory;
  subcategory?: ProjectSubcategory;
  is_published?: boolean;
  featured?: boolean;
  thumbnail: string;
  post_images: string[];
  title: string;
  short_description: string;
  main_content: string;
  tags: string[];
  external_link?: string | null;
  github_link?: string | null;
}

export type UpdatePostDTO = Partial<CreatePostDTO>;
