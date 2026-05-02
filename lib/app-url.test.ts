import { afterEach, describe, expect, it } from "vitest";

import { getAppUrl, getPostLogoutUrl } from "./app-url";

const originalAppUrl = process.env.APP_URL;

afterEach(() => {
  process.env.APP_URL = originalAppUrl;
});

describe("app URL helpers", () => {
  it("uses the configured app origin", () => {
    process.env.APP_URL = "https://example.com/some/path";

    expect(getAppUrl()).toBe("https://example.com");
    expect(getPostLogoutUrl()).toBe("https://example.com");
  });

  it("falls back to localhost for local development", () => {
    delete process.env.APP_URL;

    expect(getPostLogoutUrl()).toBe("http://localhost:3000");
  });

  it("rejects relative URLs because WorkOS logout needs an absolute return URL", () => {
    process.env.APP_URL = "/";

    expect(() => getPostLogoutUrl()).toThrow(
      'APP_URL must be an absolute URL. Received "/".',
    );
  });
});
