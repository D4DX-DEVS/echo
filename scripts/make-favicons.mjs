// Usage: node scripts/make-favicons.mjs
// Builds the site icons from the logo's big "e": a white "e" on the logo's teal rounded square, readable at 16px.
// Writes app/icon.png (512), app/apple-icon.png (180) and app/favicon.ico (16, 32, 48). Next.js serves all three from app/.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const TEAL = "#237d98";
// The letters touch in the logo's pixels, so a rectangular crop can't isolate the "e": take the connected shape that
// contains a pixel known to be inside it (x 30, y 250), then paint just that shape white, keeping its soft edges.
const { data, info } = await sharp("public/logo.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const inked = (p) => data[p * 4 + 3] > 40;
const inShape = new Uint8Array(W * H);
const stack = [250 * W + 30];
if (!inked(stack[0])) throw new Error("the starting pixel is not inside the logo's e");
while (stack.length) {
  const p = stack.pop();
  if (inShape[p] || !inked(p)) continue;
  inShape[p] = 1;
  const x = p % W, y = (p / W) | 0;
  if (x > 0) stack.push(p - 1);
  if (x < W - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - W);
  if (y < H - 1) stack.push(p + W);
}
let x0 = W, x1 = 0, y0 = H, y1 = 0;
for (let p = 0; p < W * H; p++) if (inShape[p]) { const x = p % W, y = (p / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
const lw = x1 - x0 + 1, lh = y1 - y0 + 1;
const rgba = Buffer.alloc(lw * lh * 4, 255); // white; the fourth byte of each pixel is its opacity
for (let y = 0; y < lh; y++)
  for (let x = 0; x < lw; x++) {
    const p = (y0 + y) * W + (x0 + x);
    const near = inShape[p] || inShape[p - 1] || inShape[p + 1] || inShape[p - W] || inShape[p + W]; // one pixel of margin keeps the anti-aliased edge
    rgba[(y * lw + x) * 4 + 3] = near ? data[p * 4 + 3] : 0;
  }
const white = await sharp(rgba, { raw: { width: lw, height: lh, channels: 4 } }).png().toBuffer();

async function icon(size, radius) {
  const pad = Math.round(size * 0.2);
  const glyph = await sharp(white).resize({ height: size - pad * 2, width: size - pad * 2, fit: "inside" }).toBuffer();
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${TEAL}"/></svg>`);
  return sharp(bg).composite([{ input: glyph, gravity: "center" }]).png().toBuffer();
}

writeFileSync("app/icon.png", await icon(512, 112));
writeFileSync("app/apple-icon.png", await icon(180, 0)); // iOS rounds the corners itself

// .ico: a header, one directory entry per size, then the PNG images themselves (valid since Windows Vista)
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => icon(s, Math.round(s * 0.22))));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header[e] = s; header[e + 1] = s; header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync("app/favicon.ico", Buffer.concat([header, ...pngs]));
console.log("icons written: app/icon.png, app/apple-icon.png, app/favicon.ico");
