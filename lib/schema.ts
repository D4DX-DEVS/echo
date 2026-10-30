/** Columns added after the first release; applied (and ignored when already there) before SCHEMA so old databases catch up. */
export const UPGRADES = [
  "ALTER TABLE posts ADD COLUMN has_video INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE post_categories ADD COLUMN published_at TEXT",
  "ALTER TABLE post_categories ADD COLUMN status TEXT",
];

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    parent_id INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', image TEXT NOT NULL DEFAULT '',
    category_id INTEGER NOT NULL DEFAULT 1, author TEXT NOT NULL DEFAULT 'web desk',
    status TEXT NOT NULL DEFAULT 'published', published_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    admin_edited INTEGER NOT NULL DEFAULT 0, has_video INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS post_categories (
    post_id INTEGER NOT NULL, category_id INTEGER NOT NULL, published_at TEXT, status TEXT, PRIMARY KEY (post_id, category_id))`,
  `CREATE INDEX IF NOT EXISTS idx_pc_cat ON post_categories(category_id, post_id)`,
  // published_at / status are copies of the post's own, so a category page reads ~one page of rows instead of scanning every post (D1 bills per row read)
  `CREATE INDEX IF NOT EXISTS idx_pc_feed ON post_categories(category_id, status, published_at DESC)`,
  `CREATE TRIGGER IF NOT EXISTS pc_fill AFTER INSERT ON post_categories BEGIN
    UPDATE post_categories SET published_at=(SELECT published_at FROM posts WHERE id=NEW.post_id), status=(SELECT status FROM posts WHERE id=NEW.post_id)
    WHERE post_id=NEW.post_id AND category_id=NEW.category_id; END`,
  `CREATE TRIGGER IF NOT EXISTS pc_sync AFTER UPDATE OF published_at, status ON posts BEGIN
    UPDATE post_categories SET published_at=NEW.published_at, status=NEW.status WHERE post_id=NEW.id; END`,
  `CREATE INDEX IF NOT EXISTS idx_posts_video ON posts(has_video, status, published_at DESC)`,
  // the admin post list sorts all posts (drafts too), which would otherwise scan the whole table on every view
  `CREATE INDEX IF NOT EXISTS idx_posts_pub ON posts(published_at DESC)`,
  // admin category filter: newest posts of a category, any status
  `CREATE INDEX IF NOT EXISTS idx_pc_cat_pub ON post_categories(category_id, published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_list ON posts(status, published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_cat ON posts(category_id, status, published_at DESC)`,
  `CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS post_tags (post_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, PRIMARY KEY (post_id, tag_id))`,
  `CREATE INDEX IF NOT EXISTS idx_pt_tag ON post_tags(tag_id, post_id)`,
  `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
];
