const enc = new TextEncoder();
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret";

async function sign(msg: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const COOKIE = "echo_admin";

export async function makeToken() {
  const exp = String(Date.now() + 7 * 864e5);
  return `${exp}.${await sign(exp)}`;
}

export async function verifyToken(t?: string) {
  if (!t) return false;
  const [exp, sig] = t.split(".");
  return !!sig && Number(exp) > Date.now() && sig === (await sign(exp));
}

export const adminPassword = () => process.env.ADMIN_PASSWORD || "admin";
