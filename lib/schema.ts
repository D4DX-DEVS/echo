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
    post_id INTEGER NOT NULL, category_id INTEGER NOT NULL, PRIMARY KEY (post_id, category_id))`,
  `CREATE INDEX IF NOT EXISTS idx_pc_cat ON post_categories(category_id, post_id)`,
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
