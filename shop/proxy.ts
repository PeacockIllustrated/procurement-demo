import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;

    // Skip auth for public routes, API routes, and static assets
    if (
      pathname === "/login" ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/images") ||
      pathname.startsWith("/assets") ||
      pathname === "/favicon.ico"
    ) {
      return NextResponse.next();
    }

    const shopToken = process.env.SHOP_AUTH_TOKEN;
    const adminToken = process.env.ADMIN_AUTH_TOKEN;

    // If tokens aren't configured, allow access (prevents lockout during setup)
    if (!shopToken || !adminToken) {
      return NextResponse.next();
    }

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
  } catch {
    // Never crash — allow access if middleware fails
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
