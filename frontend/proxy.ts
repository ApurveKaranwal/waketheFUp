import { clerkMiddleware } from "@clerk/nextjs/server";

function isPublicRoute(pathname: string): boolean {
  return pathname === "/" ||
    pathname === "/sign-in" || pathname.startsWith("/sign-in/") ||
    pathname === "/sign-up" || pathname.startsWith("/sign-up/");
}

export default clerkMiddleware(async (auth, request) => {
  // Keep public pages usable for local development without Clerk credentials.
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !isPublicRoute(request.nextUrl.pathname)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
