//src/features/admin/admin.routes.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { adminController } from "./admin.controller.js";

export const adminRoutes = async ({
  req,
  res,
  pathname,
}: {
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
}): Promise<boolean> => {
  if (pathname === "/api/v1/admin/maintenance" && req.method === "GET") {
    await adminController.getSettings(req, res);
    return true;
  }

  if (pathname === "/api/v1/admin/maintenance" && req.method === "PATCH") {
    await adminController.updateSettings(req, res);
    return true;
  }

  return false;
};
