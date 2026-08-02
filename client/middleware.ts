//src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hasRefreshToken = request.cookies.has("refreshToken");

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!hasRefreshToken) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
