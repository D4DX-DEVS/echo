// Resized WebP copies of the featured images, made by scripts/make-image-sizes.ts and stored next to the original in R2
// as "<name>.w480.webp" etc. posts.image_set is a bitmask of the widths that exist (1 = 480, 2 = 960, 4 = 1440), 0 = original only.
export const WIDTHS = [480, 960, 1440] as const;

export function responsive(url: string, mask: number): { src: string; srcSet?: string } {
  if (!mask) return { src: url };
  const base = url.replace(/\.[a-z0-9]+$/i, "");
  const widths = WIDTHS.filter((_, i) => mask & (1 << i));
  const at = (w: number) => `${base}.w${w}.webp`;
  // browsers that ignore srcset get the middle size, not the multi-megabyte original
  return { src: at(widths.includes(960) ? 960 : widths[widths.length - 1]), srcSet: widths.map((w) => `${at(w)} ${w}w`).join(", ") };
}
