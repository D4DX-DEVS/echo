import PostList, { type ListParams } from "../PostList";

// Posts that contain a playable video (posts.has_video, set when a post is saved).
export default async function Videos({ searchParams }: { searchParams: Promise<ListParams> }) {
  return <PostList sp={await searchParams} base="/admin/videos" title="Videos" video />;
}
