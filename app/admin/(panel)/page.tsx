import PostList, { type ListParams } from "./PostList";

export default async function Posts({ searchParams }: { searchParams: Promise<ListParams> }) {
  return <PostList sp={await searchParams} base="/admin" title="Posts" />;
}
