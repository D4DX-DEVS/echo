/**
 * WordPress's lazy-load plugin left images and embeds as a tiny placeholder `src` with the real URL in `data-src`
 * (172 imported posts). Nothing here runs that plugin's script, so put the real URL back in `src` / `srcset`.
 */
export function fixLazy(html: string): string {
  return autoP(html).replace(/<(?:img|iframe|video|source)\b[^>]*>/gi, (tag) => {
    if (!/\sdata-(?:src|srcset)=/.test(tag)) return tag;
    return tag
      .replace(/\s(?:src|srcset)="data:[^"]*"/g, "")
      .replace(/\sdata-src=/, " src=")
      .replace(/\sdata-srcset=/, " srcset=")
      .replace(/\sclass="([^"]*)"/, (_, c: string) => ` class="${c.replace(/\blazyload\b/, "").trim()}"`);
  });
}

const BLOCK = /^<(?:p|h[1-6]|ul|ol|li|blockquote|figure|div|table|pre|iframe|video|hr|script|style)\b/i;

/**
 * Posts typed as plain text in the editor have blank lines between paragraphs but no <p> tags, which HTML collapses
 * into one block. Wrap those chunks; content that already has <p> tags (imported WordPress posts) is left alone.
 */
export function autoP(html: string): string {
  if (/<p[\s>]/i.test(html)) return html;
  return html
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (BLOCK.test(chunk) ? chunk : (!/\s/.test(chunk) && videoHtml(chunk)) ||`<p>${chunk.replace(/\n/g, "<br>")}</p>`))
    .join("\n");
}

const YT =/(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([\w-]{11})/;

/** First YouTube video id in a post's HTML, if any. */
export const youtubeId = (html: string) => html.match(YT)?.[1];

/** True when the post carries a playable video (YouTube, Facebook video, or a <video> file). */
export const hasVideo = (html: string) => YT.test(html) || /<video\b/i.test(html) || /facebook\.com\/plugins\/video\.php/i.test(html);

/** Embed HTML for a pasted link: YouTube, X/Twitter, Instagram, Facebook, or a direct .mp4 / .webm / .mov file; anything else gives undefined. */
export function videoHtml(link: string): string | undefined {
  const url = link.trim();
  const id = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)?.[1];
  if (id) return `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen loading="lazy"></iframe>`;
  const tweet = url.match(/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/\w+\/status\/(\d+)/i)?.[1];
  if (tweet) return `<iframe src="https://platform.twitter.com/embed/Tweet.html?id=${tweet}" height="620" loading="lazy"></iframe>`;
  const insta = url.match(/^https?:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)/i);
  if (insta) return `<iframe src="https://www.instagram.com/${insta[1]}/${insta[2]}/embed" height="680" loading="lazy"></iframe>`;
  if (/^https?:\/\/(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.watch)\/[^\s"'<>]+$/i.test(url)) {
    const kind = /\/(?:videos?|reel|watch)\b|fb\.watch/i.test(url) ? "video" : "post";
    return `<iframe src="https://www.facebook.com/plugins/${kind}.php?href=${encodeURIComponent(url)}&show_text=true" height="${kind === "video" ? 420 : 560}" loading="lazy"></iframe>`;
  }
  if (/^https?:\/\/[^\s"'<>]+\.(mp4|webm|mov)(\?[^\s"'<>]*)?$/i.test(url)) return `<video controls preload="metadata" src="${url}"></video>`;
}
