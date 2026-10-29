// Usage: node --env-file=.env scripts/backfill-video.ts
// Flags posts that contain a playable video (posts.has_video) and gives video posts without a featured image
// their YouTube thumbnail. Safe to re-run.
import { initSchema, q, run } from "../lib/db.ts";
import { hasVideo, youtubeId } from "../lib/content.ts";

await initSchema();
try { await run("ALTER TABLE posts ADD COLUMN has_video INTEGER NOT NULL DEFAULT 0"); } catch { /* column exists */ }

await run("UPDATE posts SET has_video=0");
const rows = await q<{ id: number; content: string; image: string }>(
  "SELECT id,content,image FROM posts WHERE content LIKE '%<iframe%' OR content LIKE '%<video%' OR content LIKE '%youtu%'",
);
let flagged = 0, thumbs = 0;
for (const p of rows) {
  if (!hasVideo(p.content)) continue;
  await run("UPDATE posts SET has_video=1 WHERE id=?", [p.id]);
  flagged++;
  const yt = youtubeId(p.content);
  if (!p.image && yt) {
    await run("UPDATE posts SET image=? WHERE id=?", [`https://img.youtube.com/vi/${yt}/hqdefault.jpg`, p.id]);
    thumbs++;
  }
}
console.log(`scanned ${rows.length}, video posts ${flagged}, YouTube thumbnails filled ${thumbs}`);
