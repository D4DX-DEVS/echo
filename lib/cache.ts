/** Result cache shared across requests via the Worker's Cache API; just runs `fn` anywhere that API is missing. */
export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const store = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  if (!store) return fn();
  const req = new Request(`https://cache.invalid/${encodeURIComponent(key)}`);
  const hit = await store.match(req);
  if (hit) return hit.json() as Promise<T>;
  const value = await fn();
  await store.put(req, new Response(JSON.stringify(value), { headers: { "Cache-Control": `public, max-age=${ttl}`, "Content-Type": "application/json" } }));
  return value;
}
