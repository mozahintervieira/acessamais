import { NextResponse, type NextRequest } from "next/server";

const privateRoutes = [
  "/app",
  "/onboarding",
  "/planning",
  "/profile",
  "/schools",
  "/classes",
  "/students",
  "/missions",
  "/resources",
  "/settings",
  "/caa"
];

const authRoutes = ["/login", "/cadastro"];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("acessa_plus_session")?.value);
  const isPrivate = privateRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isAuthRoute = authRoutes.includes(pathname);

  if (isPrivate && !hasSession) {
    const url = request.nextUrl.clone();

    url.pathname = "/login";
    url.searchParams.set("proximo", pathname);

    return NextResponse.redirect(url);
  }

  if (isAuthRoute && hasSession) {
    const url = request.nextUrl.clone();

    url.pathname = "/app";

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/onboarding/:path*",
    "/planning/:path*",
    "/profile/:path*",
    "/schools/:path*",
    "/classes/:path*",
    "/students/:path*",
    "/missions/:path*",
    "/resources/:path*",
    "/settings/:path*",
    "/caa/:path*",
    "/login",
    "/cadastro"
  ]
};
