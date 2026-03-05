import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip auth for login page, auth API, and static assets
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const shopToken = process.env.SHOP_AUTH_TOKEN;
  const adminToken = process.env.ADMIN_AUTH_TOKEN;

  // Admin routes require admin auth
  if (pathname.startsWith("/admin")) {
    const adminCookie = req.cookies.get("admin-auth")?.value;
    if (adminCookie !== adminToken) {
      const loginUrl = new URL("/login?mode=admin", req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // All other routes require shop auth
  const shopCookie = req.cookies.get("shop-auth")?.value;
  if (shopCookie !== shopToken) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
