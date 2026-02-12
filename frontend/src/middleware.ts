export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /sign-in, /sign-up (auth pages)
     * - /api/auth (NextAuth API routes)
     * - /api/v1/auth (backend auth routes — register, login, oauth)
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!sign-in|sign-up|privacy|terms|api/auth|api/v1/|_next/static|_next/image|favicon\\.ico|icon\\.svg|opengraph-image|manifest\\.webmanifest|sitemap\\.xml|robots\\.txt).*)",
  ],
};
