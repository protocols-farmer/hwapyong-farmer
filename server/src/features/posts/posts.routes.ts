//src/features/posts/posts.routes.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { postsController } from "./posts.controller.js";

export const postsRoutes = async ({
  req,
  res,
  pathname,
  parseURL,
}: {
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
  parseURL: URL;
}): Promise<boolean> => {
  if (!pathname.startsWith("/api/v1/posts")) return false;

  const parts = pathname.split("/");
  const action = parts[4] || "";
  const postId = parts[5] || "";

  if (action === "upload" && req.method === "POST") {
    await postsController.uploadMedia(req, res);
    return true;
  }

  if (action === "getall" && req.method === "GET") {
    await postsController.getAllPosts(req, res, parseURL);
    return true;
  }

  if (action === "getone" && req.method === "GET" && postId) {
    await postsController.getPost(req, res, postId);
    return true;
  }

  if (action === "filter" && req.method === "GET") {
    await postsController.getFilteredPosts(req, res, parseURL);
    return true;
  }

  if (action === "create" && req.method === "POST") {
    await postsController.createPost(req, res);
    return true;
  }

  if (action === "update" && req.method === "PATCH" && postId) {
    await postsController.updatePost(req, res, postId);
    return true;
  }

  if (action === "delete" && req.method === "DELETE" && postId) {
    await postsController.deletePost(req, res, postId);
    return true;
  }

  if (action === "mine" && req.method === "GET") {
    await postsController.getOwnPosts(req, res, parseURL);
    return true;
  }

  if (action === "superadmin-serious" && req.method === "GET") {
    await postsController.getSuperAdminSeriousProjects(req, res, parseURL);
    return true;
  }

  if (action === "superadmin-diary" && req.method === "GET") {
    await postsController.getSuperAdminDiary(req, res, parseURL);
    return true;
  }

  if (action === "tags" && req.method === "GET") {
    await postsController.getTags(req, res, parseURL);
    return true;
  }

  return false;
};
