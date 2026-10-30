"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, adminPassword, makeToken, verifyToken } from "@/lib/auth";
import { forgetPostCount, q, run, slugify } from "@/lib/data";
import { hasVideo, youtubeId } from "@/lib/content";

async function guard() {
  if (!(await verifyToken((await cookies()).get(COOKIE)?.value))) redirect("/admin/login");
}
const refresh = () => { forgetPostCount(); revalidatePath("/", "layout"); };
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function login(_: string | undefined, f: FormData) {
  if (str(f, "password") !== adminPassword()) return "Wrong password";
  (await cookies()).set(COOKIE, await makeToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86400 });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}

export async function savePost(_: string | undefined, f: FormData) {
  await guard();
  const id = Number(f.get("id")) || 0;
  const title = str(f, "title");
  if (!title) return "Title required";
  const slug = slugify(str(f, "slug") || title);
  const now = new Date().toISOString().slice(0, 19);
  const published = str(f, "published_at") || now;
  const content = String(f.get("content") ?? "");
  // video posts without a featured image get the YouTube thumbnail, same as the import backfill
  const yt = youtubeId(content);
  const image = str(f, "image") || (yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : "");
  const vals = [slug, title, str(f, "excerpt"), content, image, Number(f.get("category_id")) || 1, str(f, "author") || "web desk", str(f, "status") === "draft" ? "draft" : "published", published, now];
  try {
    let pid = id;
    if (id) await run("UPDATE posts SET slug=?,title=?,excerpt=?,content=?,image_set=CASE WHEN image=? THEN image_set ELSE 0 END,image=?,category_id=?,author=?,status=?,published_at=?,updated_at=?,admin_edited=1 WHERE id=?", [...vals.slice(0, 4), vals[4], ...vals.slice(4), id]); // vals[4] (the image) is used twice: for the image_set check and the new value
    // admin-made posts get ids from 1,000,000 so they never collide with future WordPress ids
    else pid = await run("INSERT INTO posts(id,slug,title,excerpt,content,image,category_id,author,status,published_at,updated_at,admin_edited) VALUES(max((SELECT COALESCE(MAX(id),0) FROM posts), 999999) + 1,?,?,?,?,?,?,?,?,?,?,1)", vals);
    // Admin edits the primary category only; keep other imported memberships, make sure the primary one exists.
    await run("INSERT OR IGNORE INTO post_categories(post_id,category_id) VALUES(?,?)", [pid, vals[5] as number]);
    await run("UPDATE posts SET has_video=? WHERE id=?", [hasVideo(String(f.get("content") ?? "")) ? 1 : 0, pid]);
    await saveTags(pid, str(f, "tags"));
  } catch (e) {
    return /UNIQUE/i.test(String(e)) ? "Slug already used by another post" : `Save failed: ${e}`;
  }
  refresh();
  redirect(str(f, "return_to") === "videos" ? "/admin/videos?saved=1" : "/admin?saved=1");
}

/** Comma-separated tag names -> post_tags; unknown names become new tags (ids >= 100000 so they never clash with WordPress tag ids). */
async function saveTags(postId: number, input: string) {
  const names = [...new Set(input.split(",").map((t) => t.trim()).filter(Boolean))];
  await run("DELETE FROM post_tags WHERE post_id=?", [postId]);
  for (const name of names) {
    const slug = slugify(name);
    let tag = (await q<{ id: number }>("SELECT id FROM tags WHERE slug=?", [slug]))[0];
    if (!tag) {
      await run("INSERT INTO tags(id,slug,name) VALUES(max((SELECT COALESCE(MAX(id),0) FROM tags), 99999) + 1, ?, ?)", [slug, name]);
      tag = (await q<{ id: number }>("SELECT id FROM tags WHERE slug=?", [slug]))[0];
    }
    await run("INSERT OR IGNORE INTO post_tags(post_id,tag_id) VALUES(?,?)", [postId, tag.id]);
  }
}

export async function deletePost(f: FormData) {
  await guard();
  await run("DELETE FROM posts WHERE id=?", [Number(f.get("id"))]);
  await run("DELETE FROM post_categories WHERE post_id=?", [Number(f.get("id"))]);
  await run("DELETE FROM post_tags WHERE post_id=?", [Number(f.get("id"))]);
  refresh();
  redirect("/admin?deleted=1");
}

export async function saveCategory(f: FormData) {
  await guard();
  const id = Number(f.get("id")) || 0;
  const name = str(f, "name");
  if (!name) return;
  const vals = [slugify(str(f, "slug") || name), name, Number(f.get("parent_id")) || 0, Number(f.get("sort")) || 0];
  if (id) await run("UPDATE categories SET slug=?,name=?,parent_id=?,sort=? WHERE id=?", [...vals, id]);
  else await run("INSERT INTO categories(id,slug,name,parent_id,sort) VALUES((SELECT COALESCE(MAX(id),0)+1 FROM categories),?,?,?,?)", vals);
  refresh();
  redirect("/admin/categories?saved=1");
}

export async function deleteCategory(f: FormData) {
  await guard();
  const id = Number(f.get("id"));
  const [{ n }] = await q<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE category_id=?", [id]);
  if (Number(n) === 0) await run("DELETE FROM categories WHERE id=?", [id]);
  refresh();
  redirect("/admin/categories?deleted=1");
}

export async function savePage(f: FormData) {
  await guard();
  const title = str(f, "title");
  if (!title) return;
  const slug = slugify(str(f, "slug") || title);
  const now = new Date().toISOString();
  await run("INSERT INTO pages(slug,title,content,updated_at) VALUES(?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title, content=excluded.content, updated_at=excluded.updated_at", [slug, title, String(f.get("content") ?? ""), now]);
  refresh();
  redirect("/admin/pages?saved=1");
}

export async function deletePage(f: FormData) {
  await guard();
  await run("DELETE FROM pages WHERE slug=?", [str(f, "slug")]);
  refresh();
  redirect("/admin/pages?deleted=1");
}
