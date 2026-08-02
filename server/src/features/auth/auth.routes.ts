//src/features/auth/auth.routes.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { authController } from "./auth.controller.js";

export const authRoutes = async ({
  req,
  res,
  pathname,
}: {
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
}): Promise<boolean> => {
  if (pathname === "/api/v1/auth/ban-check" && req.method === "GET") {
    await authController.banCheck(req, res);
    return true;
  }
  if (pathname === "/api/v1/auth/signup" && req.method === "POST") {
    await authController.signup(req, res);
    return true;
  }
  if (pathname === "/api/v1/auth/login" && req.method === "POST") {
    await authController.login(req, res);
    return true;
  }

  if (
    pathname === "/api/v1/auth/refresh" &&
    (req.method === "POST" || req.method === "GET")
  ) {
    await authController.refresh(req, res);
    return true;
  }

  if (pathname === "/api/v1/auth/logout" && req.method === "POST") {
    await authController.logout(req, res);
    return true;
  }
  if (pathname === "/api/v1/auth/change-password" && req.method === "PATCH") {
    await authController.changePassword(req, res);
    return true;
  }
  if (pathname === "/api/v1/auth/update" && req.method === "PATCH") {
    await authController.updateAccount(req, res);
    return true;
  }
  if (pathname === "/api/v1/auth/upload-avatar" && req.method === "POST") {
    await authController.uploadAvatar(req, res);
    return true;
  }
  if (pathname === "/api/v1/auth/delete" && req.method === "DELETE") {
    await authController.deleteAccount(req, res);
    return true;
  }

  return false;
};
