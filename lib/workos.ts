import { WorkOS } from "@workos-inc/node";

let cachedWorkos: WorkOS | undefined;

export function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

export function getWorkos() {
  cachedWorkos ??= new WorkOS(requireEnv("WORKOS_API_KEY"));
  return cachedWorkos;
}
