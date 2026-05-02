const DEFAULT_APP_URL = "http://localhost:3000";

export function getAppUrl() {
  const configuredUrl = process.env.APP_URL?.trim() || DEFAULT_APP_URL;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    throw new Error(
      `APP_URL must be an absolute URL. Received "${configuredUrl}".`,
    );
  }
}

export function getPostLogoutUrl() {
  return getAppUrl();
}
