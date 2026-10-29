import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// ISR pages are cached in a private R2 bucket (NEXT_INC_CACHE_R2_BUCKET); revalidatePath tags live in D1 (NEXT_TAG_CACHE_D1).
export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache, tagCache: d1NextTagCache });
