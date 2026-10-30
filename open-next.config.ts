import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// ISR pages live in a private R2 bucket (NEXT_INC_CACHE_R2_BUCKET), with a per-datacenter cache in front so most hits skip R2;
// revalidatePath tags live in D1 (NEXT_TAG_CACHE_D1). The queue is what rebuilds an expired page in the background
// (through the WORKER_SELF_REFERENCE binding); without one, expired pages are served stale until the next deploy.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived", shouldLazilyUpdateOnCacheHit: true }),
  queue: memoryQueue,
  tagCache: d1NextTagCache,
  // answer cached pages from the light routing layer without starting the full Next.js server: far less CPU per visit,
  // which matters because the free plan stops a request at 10 ms of CPU
  enableCacheInterception: true,
});
