import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPostLogoutUrl } from "@/lib/app-url";
import { getAuthkitCookieNames } from "@/lib/authkit-cookies";

function clearLocalAuthkitSession(request: NextRequest) {
  const response = NextResponse.redirect(getPostLogoutUrl(), { status: 303 });
  const cookieNames = getAuthkitCookieNames(
    request.cookies.getAll().map((cookie) => cookie.name),
  );

  for (const name of cookieNames) {
    response.cookies.delete(name);
  }

  return response;
}

export function GET(request: NextRequest) {
  return clearLocalAuthkitSession(request);
}

export function POST(request: NextRequest) {
  return clearLocalAuthkitSession(request);
}
