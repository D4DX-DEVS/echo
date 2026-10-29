// Usage: node --env-file=.env scripts/migrate-indexes.ts
// Adds post_categories.published_at/status (kept in sync by triggers) and the indexes that keep D1 row reads low. Safe to re-run.
import { initSchema, q, run } from "../lib/db.ts";

await initSchema();
await run("UPDATE post_categories SET published_at=(SELECT published_at FROM posts WHERE id=post_id), status=(SELECT status FROM posts WHERE id=post_id) WHERE published_at IS NULL OR status IS NULL");
const [{ n }] = await q<{ n: number }>("SELECT COUNT(*) n FROM post_categories WHERE published_at IS NULL");
console.log(`done, ${n} category links still without a date`);
