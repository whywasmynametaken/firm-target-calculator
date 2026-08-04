import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let schemaReady: Promise<void> | null = null;

export async function ensureDatabase() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  schemaReady ??= env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS calculator_states (
        id text PRIMARY KEY NOT NULL,
        data text NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_by text
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS app_users (
        id text PRIMARY KEY NOT NULL,
        email text NOT NULL,
        name text,
        role text DEFAULT 'viewer' NOT NULL,
        password_hash text NOT NULL,
        password_salt text NOT NULL,
        password_iterations integer NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `),
    env.DB.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_unique
      ON app_users (email)
    `),
  ]).then(() => undefined);

  await schemaReady;
}

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}
