import { SCHEMA } from "./schema.ts";
import { bindings } from "./cf.ts";

type Param = string | number | null;
const { CF_ACCOUNT_ID, CF_API_TOKEN, D1_DATABASE_ID } = process.env;
const remote = !!(CF_ACCOUNT_ID && CF_API_TOKEN && D1_DATABASE_ID);

// REST is used when the CF_* env vars are set (Vercel, scripts); a Worker uses its D1 binding instead.
async function d1(sql: string, params: Param[]) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
    },
  );
  const j = await res.json();
  if (!j.success) throw new Error(`D1: ${JSON.stringify(j.errors)}`);
  return j.result[0] as { results: Record<string, unknown>[]; meta: { last_row_id?: number } };
}

// Local dev fallback: node:sqlite file, so the app runs with no Cloudflare credentials.
let local: import("node:sqlite").DatabaseSync | undefined;
async function sqlite() {
  if (!local) {
    const { DatabaseSync } = await import("node:sqlite");
    const { mkdirSync } = await import("node:fs");
    mkdirSync("data", { recursive: true });
    local = new DatabaseSync("data/local.db");
    local.exec("PRAGMA busy_timeout=10000; PRAGMA journal_mode=WAL");
    for (const s of SCHEMA) local.exec(s);
  }
  return local;
}

export async function q<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T[]> {
  if (remote) return (await d1(sql, params)).results as T[];
  const db = (await bindings())?.DB;
  if (db) return (await db.prepare(sql).bind(...params).all()).results as T[];
  return (await sqlite()).prepare(sql).all(...params).map((r) => ({ ...r })) as T[];
}

export async function run(sql: string, params: Param[] = []): Promise<number> {
  if (remote) return (await d1(sql, params)).meta.last_row_id ?? 0;
  const db = (await bindings())?.DB;
  if (db) return (await db.prepare(sql).bind(...params).run()).meta.last_row_id ?? 0;
  const r = (await sqlite()).prepare(sql).run(...params);
  return Number(r.lastInsertRowid);
}

export async function initSchema() {
  for (const s of SCHEMA) await run(s);
}
export const dbMode = remote ? "Cloudflare D1" : "local sqlite";
