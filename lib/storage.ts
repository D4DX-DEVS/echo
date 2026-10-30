import type { S3Client } from "@aws-sdk/client-s3";
import { bindings } from "./cf.ts";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
export const r2Enabled = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL);

let s3: S3Client | undefined;

/** Stores bytes in R2 (or public/uploads locally) and returns the public URL. */
export async function putFile(key: string, body: Buffer, contentType: string): Promise<string> {
  const b = await bindings();
  if (b?.MEDIA) {
    await b.MEDIA.put(key, body, { httpMetadata: { contentType } });
    return `${b.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  }
  if (r2Enabled) {
    // loaded only here: the Worker uses the R2 binding above, and importing the SDK at the top would make every cold start pay for it
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    s3 ??= new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
    });
    await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType }));
    return `${R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  }
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname, join } = await import("node:path");
  const p = join(process.cwd(), "public", "uploads", key);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, body);
  return `/uploads/${key}`;
}
