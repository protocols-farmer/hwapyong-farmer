//src/features/posts/posts.types.ts
export type PostCategory =
  | "bio-engineering"
  | "computer-science"
  | "projects"
  | "diary";
export type ProjectSubcategory = "serious" | "random" | null;

export interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
  category: PostCategory;
  subcategory: ProjectSubcategory;
  thumbnail: string;
  post_images: string[];
  title: string;
  short_description: string;
  main_content: string;
  tags: string[];
  external_link?: string;
  github_link?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePostDTO {
  category: PostCategory;
  subcategory?: ProjectSubcategory;
  thumbnail: string;
  post_images: string[];
  title: string;
  short_description: string;
  main_content: string;
  tags: string[];
  external_link?: string;
  github_link?: string;
}

export type UpdatePostDTO = Partial<CreatePostDTO>;
