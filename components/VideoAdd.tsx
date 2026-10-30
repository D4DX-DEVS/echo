"use client";
import { useActionState, useRef, useState } from "react";
import { savePost } from "@/app/admin/actions";
import { videoHtml } from "@/lib/content";
import { MAX_VIDEO_MB, uploadImage, uploadVideo, videoThumbnail } from "@/lib/upload-client";
import type { Category } from "@/lib/data";

/**
 * "+ New video" button and its panel, rendered inside the Videos page header.
 * A browsed file goes to R2 (with a still frame as thumbnail); the post that points at it is saved in D1 through savePost.
 */
export default function VideoAdd({ cats, defaultCat }: { cats: Category[]; defaultCat: number }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "link">("file");
  const [serverErr, action, saving] = useActionState(savePost, undefined);
  const [file, setFile] = useState<File>();
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const set = (name: string, value: string) => ((form.current!.elements.namedItem(name) as HTMLInputElement).value = value);

  async function publish() {
    const title = (form.current!.elements.namedItem("title") as HTMLInputElement).value.trim();
    if (!title) return setStatus("Please enter a title.");
    setBusy(true);
    try {
      let html: string | undefined;
      let thumb = "";
      if (mode === "file") {
        if (!file) return setStatus("Please browse for a video file.");
        setStatus("Uploading video… 0%");
        const url = await uploadVideo(file, (p) => setStatus(`Uploading video… ${p}%`));
        html = `<video controls preload="metadata" src="${url}"></video>`;
        setStatus("Making a thumbnail…");
        const still = await videoThumbnail(file);
        if (still) thumb = await uploadImage(still);
      } else {
        html = videoHtml(link);
        if (!html) return setStatus("Please paste a YouTube link, or a direct link to an .mp4, .webm or .mov file.");
      }
      set("content", html);
      set("image", thumb);
      setStatus("Publishing…");
      form.current!.requestSubmit();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Something went wrong, please try again.");
    } finally {
      setBusy(false);
    }
  }

  const tab = (m: "file" | "link", label: string) => (
    <button type="button" onClick={() => { setMode(m); setStatus(""); }} aria-pressed={mode === m}
      className={`btn sm ${mode === m ? "" : "ghost"}`}>{label}</button>
  );

  return (
    <>
      <button type="button" className="btn ml-auto" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "+ New video"}</button>
      {open && (
        <form ref={form} action={action} onSubmit={(e) => { if (!(form.current!.elements.namedItem("content") as HTMLInputElement).value) e.preventDefault(); }}
          className="basis-full order-last bg-bg border border-line rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
          <input type="hidden" name="content" />
          <input type="hidden" name="image" />
          <input type="hidden" name="status" value="published" />
          <input type="hidden" name="return_to" value="videos" />
          <h2 className="font-bold">Add a video</h2>
          <input name="title" aria-label="Video title" placeholder="Video title" className="field" required
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} />
          <div className="flex gap-2" role="group" aria-label="Video source">{tab("file", "Browse a file")}{tab("link", "Paste a link")}</div>
          {mode === "file" ? (
            <div>
              <label className="btn ghost cursor-pointer">Browse video
                <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => { setFile(e.target.files?.[0]); setStatus(""); }} />
              </label>
              <span className="ml-3 text-sm text-muted">{file ? `${file.name} (${(file.size / 1048576).toFixed(1)} MB)` : `MP4, WebM or MOV, up to ${MAX_VIDEO_MB} MB`}</span>
            </div>
          ) : (
            <input value={link} onChange={(e) => { setLink(e.target.value); setStatus(""); }} aria-label="Video link"
              placeholder="YouTube link, or a direct link to an .mp4 / .webm file" className="field" inputMode="url" />
          )}
          <label className="block text-sm font-medium">Category
            <select name="category_id" defaultValue={defaultCat} className="field mt-1 !w-auto">
              {cats.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? "— " : ""}{c.name}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn" disabled={busy || saving} onClick={publish}>{busy || saving ? "Please wait…" : "Publish video"}</button>
            {(status || serverErr) && <p role="status" className="text-sm text-muted">{serverErr || status}</p>}
          </div>
        </form>
      )}
    </>
  );
}
