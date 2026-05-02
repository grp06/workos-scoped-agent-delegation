import { authkitProxy } from "@workos-inc/authkit-nextjs";

export default authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [],
  },
});

export const config = {
  matcher: [
    "/demo/:path*",
    "/api/demo/:path*",
    "/api/authz/:path*",
    "/api/agent/:path*",
    "/api/audit-log/:path*",
    "/api/health/:path*",
  ],
};
