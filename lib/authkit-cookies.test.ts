import { afterEach, describe, expect, it } from "vitest";

import {
  getAuthkitCookieNames,
  getAuthkitSessionCookieName,
} from "./authkit-cookies";

const originalCookieName = process.env.WORKOS_COOKIE_NAME;

afterEach(() => {
  process.env.WORKOS_COOKIE_NAME = originalCookieName;
});

describe("AuthKit cookie helpers", () => {
  it("uses the AuthKit default session cookie name", () => {
    delete process.env.WORKOS_COOKIE_NAME;

    expect(getAuthkitSessionCookieName()).toBe("wos-session");
  });

  it("honors a configured WorkOS session cookie name", () => {
    process.env.WORKOS_COOKIE_NAME = "custom-session";

    expect(getAuthkitSessionCookieName()).toBe("custom-session");
  });

  it("returns the session cookie and abandoned PKCE cookies", () => {
    delete process.env.WORKOS_COOKIE_NAME;

    expect(
      getAuthkitCookieNames([
        "wos-auth-verifier",
        "other-cookie",
        "wos-auth-verifier-a1b2",
        "wos-session",
      ]),
    ).toEqual(["wos-session", "wos-auth-verifier", "wos-auth-verifier-a1b2"]);
  });
});
