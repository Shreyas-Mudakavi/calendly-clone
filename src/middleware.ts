import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// createRouteMatcher() will take an array of all the routes we want it to be public.
// /sign-in(.*) -> this ensures to match anything that starts with sign-in
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

// this clerk middleware takes a function which gives us all the auth information as well as all
// the information related to request. We can auth().protect() that will essentially make it that so
// this page cannot be accessed unless you are currently logged in, now this will run on every single page
// now by adding the if check it will only work on pages that are not public
export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
