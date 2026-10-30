/**
 * WordPress's lazy-load plugin left images and embeds as a tiny placeholder `src` with the real URL in `data-src`
 * (172 imported posts). Nothing here runs that plugin's script, so put the real URL back in `src` / `srcset`.
 */
export function fixLazy(html: string): string {
  return html.replace(/<(?:img|iframe|video|source)\b[^>]*>/gi, (tag) => {
    if (!/\sdata-(?:src|srcset)=/.test(tag)) return tag;
    return tag
      .replace(/\s(?:src|srcset)="data:[^"]*"/g, "")
      .replace(/\sdata-src=/, " src=")
      .replace(/\sdata-srcset=/, " srcset=")
      .replace(/\sclass="([^"]*)"/, (_, c: string) => ` class="${c.replace(/\blazyload\b/, "").trim()}"`);
  });
}

const YT = /(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([\w-]{11})/;

/** First YouTube video id in a post's HTML, if any. */
export const youtubeId = (html: string) => html.match(YT)?.[1];

/** True when the post carries a playable video (YouTube, Facebook video, or a <video> file). */
export const hasVideo = (html: string) => YT.test(html) || /<video\b/i.test(html) || /facebook\.com\/plugins\/video\.php/i.test(html);

/** Player HTML for a pasted link: YouTube (watch / share / shorts / embed) or a direct .mp4 / .webm / .mov file; anything else gives undefined. */
export function videoHtml(link: string): string | undefined {
  const url = link.trim();
  const id = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)?.[1];
  if (id) return `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen loading="lazy"></iframe>`;
  if (/^https?:\/\/[^\s"'<>]+\.(mp4|webm|mov)(\?[^\s"'<>]*)?$/i.test(url)) return `<video controls preload="metadata" src="${url}"></video>`;
}
