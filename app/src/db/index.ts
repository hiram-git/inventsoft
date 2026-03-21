import 'dotenv/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as authSchemaDefn from './auth-schema';

const connectionString = process.env.DATABASE_URL!;
const DEFAULT_SLUG     = process.env.DEFAULT_COMPANY_SLUG ?? 'public';

type CompanyDb = ReturnType<typeof drizzle<typeof schema>>;
export type AuthDb = ReturnType<typeof drizzle<typeof authSchemaDefn>>;

// ── Central auth DB (inventsoft_auth schema) ──────────────────────────────────
const authClient = postgres(connectionString, { max: 5 });
export const authDb: AuthDb = drizzle(authClient, { schema: authSchemaDefn });

// ── Per-company DB cache ──────────────────────────────────────────────────────
const companyDbCache = new Map<string, CompanyDb>();

export function getDb(slug: string): CompanyDb {
  const cached = companyDbCache.get(slug);
  if (cached) return cached;

  const searchPath = slug === 'public' ? 'public' : `inventsoft_${slug},public`;
  const client = postgres(connectionString, {
    max: 10,
    connection: { search_path: searchPath },
  });
  const instance = drizzle(client, { schema });
  companyDbCache.set(slug, instance);
  return instance;
}

// ── AsyncLocalStorage: carries the active company DB for each request ─────────
export const requestDb = new AsyncLocalStorage<CompanyDb>();

export function getActiveDb(): CompanyDb {
  return requestDb.getStore() ?? getDb(DEFAULT_SLUG);
}

// ── Proxy db export — all 81 existing files work without modification ─────────
export const db = new Proxy({} as CompanyDb, {
  get(_target, prop: string | symbol) {
    const activeDb = getActiveDb();
    const val = (activeDb as any)[prop];
    return typeof val === 'function' ? val.bind(activeDb) : val;
  },
});
