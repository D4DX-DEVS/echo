# The Echo — Next.js

Next.js 15 (App Router) rewrite of theecho.in. Vercel hosting, Cloudflare D1 (database) + R2 (images). Same URLs as WordPress (`/post-slug`, `/parent-cat/child-cat`).

## Local dev (no Cloudflare needed)
```bash
npm install
cp .env.example .env.local        # set ADMIN_PASSWORD
node --env-file=.env.local scripts/import.ts   # pulls all posts from WP -> data/local.db
npm run dev
```
Admin: footer **Admin** link → `/admin`. Posts (search/filter/edit/delete/drafts), categories, pages, image upload.
Without R2 vars uploads go to `public/uploads`; without D1 vars the DB is local sqlite.

## Cloudflare setup
1. **D1**: `npx wrangler d1 create echo` → copy database id. Create an API token with *D1 Edit*.
2. **R2**: create a bucket, enable public access (or attach a custom domain), create an S3 API token (Object Read & Write).
3. Fill `.env.local` per `.env.example`, then:
```bash
node --env-file=.env.local scripts/import.ts           # creates tables in D1 + imports WP content
node --env-file=.env.local scripts/migrate-images.ts   # copies WP images to R2, rewrites URLs
```

## Vercel
Import the repo, add the same env vars (`ADMIN_PASSWORD`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CF_*`, `D1_DATABASE_ID`, `R2_*`), deploy, then point the `theecho.in` domain at Vercel.

## Notes
- Uploads go through a Vercel function: 4 MB limit per image.
- Content is stored as HTML; the editor is an HTML textarea with a toolbar and preview.
- D1 is queried over its REST API (works from Vercel). Pages are ISR-cached (60–300 s); admin saves revalidate everything.
