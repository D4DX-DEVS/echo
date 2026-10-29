import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// ISR pages live in a private R2 bucket (NEXT_INC_CACHE_R2_BUCKET), with a per-datacenter cache in front so most hits skip R2;
// revalidatePath tags live in D1 (NEXT_TAG_CACHE_D1).
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived", shouldLazilyUpdateOnCacheHit: true }),
  tagCache: d1NextTagCache,
});
