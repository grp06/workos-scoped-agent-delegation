import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cachedSql: NeonQueryFunction<false, false> | undefined;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing required environment variable DATABASE_URL.");
  }

  return databaseUrl;
}

function getSql() {
  cachedSql ??= neon(getDatabaseUrl());
  return cachedSql;
}

export const sql = ((strings: TemplateStringsArray, ...params: unknown[]) =>
  getSql()(strings, ...params)) as unknown as NeonQueryFunction<false, false>;

sql.query = ((...args: Parameters<NeonQueryFunction<false, false>["query"]>) =>
  getSql().query(...args)) as NeonQueryFunction<false, false>["query"];

sql.unsafe = ((rawSql: string) =>
  getSql().unsafe(rawSql)) as NeonQueryFunction<false, false>["unsafe"];

sql.transaction = ((
  ...args: Parameters<NeonQueryFunction<false, false>["transaction"]>
) =>
  getSql().transaction(
    ...args,
  )) as NeonQueryFunction<false, false>["transaction"];
