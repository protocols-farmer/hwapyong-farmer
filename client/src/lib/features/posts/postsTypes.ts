//src/lib/features/posts/postsTypes.ts

export type PostCategory =
  "bio-engineering" | "computer-science" | "projects" | "diary";
export type PostSubcategory = "serious" | "random";

export interface PostCard {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  thumbnail: string;
  tags: string[];
  category: PostCategory;
  subcategory?: PostSubcategory | null;
  featured: boolean;
  is_published: boolean;
  github_link?: string | null;
  external_link?: string | null;
  created_at: string;
  updated_at: string;
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
  subcategory?: PostSubcategory | null;
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

export type UpdatePostDTO = Partial<Omit<CreatePostDTO, "slug">>;

export interface PaginatedPostsResponse {
  posts: PostCard[];
  total: number;
  page: number;
  totalPages: number;
}
