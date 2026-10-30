"use client";
import { useActionState, useRef, useState } from "react";
import { savePost } from "@/app/admin/actions";
import type { Category, Post } from "@/lib/data";
import { videoHtml } from "@/lib/content";
import { uploadImage, uploadVideo, videoThumbnail } from "@/lib/upload-client";

export default function PostForm({ cats, post, tags = "" }: { cats: Category[]; post?: Post; tags?: string }) {
  const [err, action, pending] = useActionState(savePost, undefined);
  const [image, setImage] = useState(post?.image ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);

  const wrap = (open: string, close = "") => {
    const el = ta.current!;
    const { selectionStart: s, selectionEnd: e } = el;
    setContent(content.slice(0, s) + open + content.slice(s, e) + close + content.slice(e));
    el.focus();
  };
  const pick = (cb: (url: string) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMsg("Uploading…");
    try { cb(await uploadImage(f)); setMsg(""); } catch (x) { setMsg(String(x)); }
    e.target.value = "";
  };
  // a browsed video goes to R2; if the post has no featured image yet, a frame from the video becomes it
  const pickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const url = await uploadVideo(f, (p) => setMsg(`Uploading video… ${p}%`));
      wrap(`<video controls preload="metadata" src="${url}"></video>`);
      if (!image) {
        const still = await videoThumbnail(f);
        if (still) setImage(await uploadImage(still));
      }
      setMsg("");
    } catch (x) { setMsg(x instanceof Error ? x.message : "Upload failed"); }
  };
  const date = (post?.published_at ?? new Date().toISOString()).slice(0, 16);

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_320px] max-w-6xl">
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <input type="hidden" name="content" value={content} />
      <div className="space-y-4 min-w-0">
        <h1 className="text-2xl font-extrabold">{post ? "Edit post" : "New post"}</h1>
        <input name="title" defaultValue={post?.title} placeholder="Title" className="field !text-xl !font-bold" required />
        <textarea name="excerpt" defaultValue={post?.excerpt} placeholder="Short excerpt (shown on cards & search)" rows={2} className="field" />
        <div>
          <div className="flex flex-wrap gap-1.5 mb-2 text-sm">
            <button type="button" title="Bold" aria-label="Bold" className="btn ghost sm" onClick={() => wrap("<strong>", "</strong>")}><b>B</b></button>
            <button type="button" title="Italic" aria-label="Italic" className="btn ghost sm" onClick={() => wrap("<em>", "</em>")}><i>I</i></button>
            <button type="button" className="btn ghost sm" onClick={() => wrap("<h2>", "</h2>")}>H2</button>
            <button type="button" className="btn ghost sm" onClick={() => wrap("<p>", "</p>")}>¶</button>
            <button type="button" className="btn ghost sm" onClick={() => { const u = prompt("Link URL"); if (u) wrap(`<a href="${u}">`, "</a>"); }}>Link</button>
            <button type="button" className="btn ghost sm" onClick={() => wrap("<blockquote>", "</blockquote>")}>Quote</button>
            <button type="button" className="btn ghost sm" onClick={() => {
              const u = prompt("Video link (YouTube, or a direct .mp4 / .webm link)");
              if (!u) return;
              const html = videoHtml(u);
              if (!html) return setMsg("Please paste a YouTube link, or a direct link to an .mp4, .webm or .mov file");
              setMsg("");
              wrap(html);
            }}>Video link</button>
            <label className="btn ghost sm">Browse video<input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={pickVideo} /></label>
            <label className="btn ghost sm">Browse photo<input type="file" accept="image/*" hidden onChange={pick((u) => wrap(`<img src="${u}" alt="" />`))} /></label>
            <button type="button" className="btn ghost sm ml-auto" onClick={() => setPreview(!preview)}>{preview ? "Edit HTML" : "Preview"}</button>
          </div>
          {msg && <p role="status" className="text-sm text-muted mb-2">{msg}</p>}
          {preview ? (
            <div className="article border border-line rounded-lg p-4 min-h-96" dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <textarea ref={ta} value={content} onChange={(e) => setContent(e.target.value)} rows={22} className="field font-mono !text-sm" />
          )}
        </div>
      </div>
      <aside className="space-y-4 xl:pt-12">
        <div className="sticky bottom-0 z-10 bg-page py-3 xl:static xl:py-0"><button className="btn w-full !py-2.5" disabled={pending}>{pending ? "Saving…" : "Save"}</button></div>
        {err && <p className="text-sm text-accent">{err}</p>}
        <label className="block text-sm font-medium">Status
          <select name="status" defaultValue={post?.status ?? "published"} className="field mt-1"><option value="published">Published</option><option value="draft">Draft</option></select>
        </label>
        <label className="block text-sm font-medium">Category
          <select name="category_id" defaultValue={post?.category_id ?? 59} className="field mt-1">
            {cats.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? "— " : ""}{c.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Tags (comma separated)
          <input name="tags" defaultValue={tags} placeholder="kerala, politics" className="field mt-1" />
        </label>
        <label className="block text-sm font-medium">Slug (URL)
          <input name="slug" defaultValue={post?.slug} placeholder="auto from title" className="field mt-1" />
        </label>
        <label className="block text-sm font-medium">Author
          <input name="author" defaultValue={post?.author ?? "web desk"} className="field mt-1" />
        </label>
        <label className="block text-sm font-medium">Publish date
          <input name="published_at" type="datetime-local" defaultValue={date} className="field mt-1" />
        </label>
        <div className="text-sm font-medium">Featured image
          {image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={image} alt="" className="mt-2 rounded-lg aspect-video object-cover w-full" />}
          <input name="image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" className="field mt-2" />
          <label className="btn ghost sm mt-2 cursor-pointer">Browse photo<input type="file" accept="image/*" hidden onChange={pick(setImage)} /></label>
          {msg && <p className="text-xs text-muted mt-1">{msg}</p>}
        </div>
      </aside>
    </form>
  );
}
