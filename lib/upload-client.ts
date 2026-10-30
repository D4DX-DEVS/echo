// Browser-side helpers for the admin: they run in the editor, not on the server.
export const MAX_VIDEO_MB = 100; // the most a Cloudflare Worker accepts in one request on the free plan

/** Phone and camera photos are several MB; scale them to 1600px wide WebP before upload so pages stay fast. */
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file; // GIFs may be animated, AVIF is already small
  try {
    const bmp = await createImageBitmap(file);
    if (bmp.width <= 1600 && file.size < 400_000) return file;
    const scale = Math.min(1, 1600 / bmp.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

export async function uploadImage(original: File): Promise<string> {
  const file = await shrink(original);
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "upload failed");
  return j.url;
}

/** Sends the video file as-is (not as a form, so the server can stream it) and reports progress. */
export function uploadVideo(file: File, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) return reject(new Error("Please choose an MP4, WebM or MOV video"));
    if (file.size > MAX_VIDEO_MB * 1048576) return reject(new Error(`This video is too large, the limit is ${MAX_VIDEO_MB} MB`));
    const x = new XMLHttpRequest();
    x.open("PUT", "/api/upload-video");
    x.setRequestHeader("Content-Type", file.type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onerror = () => reject(new Error("Upload failed, please check your connection and try again"));
    x.onload = () => {
      try {
        const j = JSON.parse(x.responseText);
        if (x.status < 300) resolve(j.url);
        else reject(new Error(j.error || "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    x.send(file);
  });
}

/** A still frame from the video, so its post has a picture on cards. Gives undefined when the browser can't read the file. */
export function videoThumbnail(file: File): Promise<File | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const src = URL.createObjectURL(file);
    const done = (f?: File) => { URL.revokeObjectURL(src); resolve(f); };
    const timer = setTimeout(() => done(), 8000);
    video.muted = true;
    video.preload = "auto";
    video.onerror = () => { clearTimeout(timer); done(); };
    video.onloadeddata = () => { video.currentTime = Math.min(1, (video.duration || 1) / 2); };
    video.onseeked = () => {
      clearTimeout(timer);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      canvas.toBlob((b) => done(b ? new File([b], "video-thumbnail.jpg", { type: "image/jpeg" }) : undefined), "image/jpeg", 0.85);
    };
    video.src = src;
  });
}
