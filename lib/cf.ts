// Cloudflare bindings, present only when running as a Worker (undefined on Vercel, local dev and scripts).
type Stmt = { bind(...p: unknown[]): Stmt; all(): Promise<{ results: Record<string, unknown>[] }>; run(): Promise<{ meta: { last_row_id?: number } }> };
export type Bindings = {
  DB?: { prepare(sql: string): Stmt };
  MEDIA?: { put(key: string, body: ArrayBuffer | Buffer, o: { httpMetadata: { contentType: string } }): Promise<unknown> };
  R2_PUBLIC_URL?: string;
};

export async function bindings(): Promise<Bindings | undefined> {
  try {
    return (await import("@opennextjs/cloudflare")).getCloudflareContext().env as Bindings;
  } catch {
    return undefined;
  }
}
