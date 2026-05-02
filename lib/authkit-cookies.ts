const DEFAULT_SESSION_COOKIE_NAME = "wos-session";
const PKCE_COOKIE_PREFIX = "wos-auth-verifier";

export function getAuthkitSessionCookieName() {
  return process.env.WORKOS_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;
}

export function getAuthkitCookieNames(existingCookieNames: string[]) {
  return [
    ...new Set([
      getAuthkitSessionCookieName(),
      ...existingCookieNames.filter((name) =>
        name.startsWith(PKCE_COOKIE_PREFIX),
      ),
    ]),
  ];
}
