import { notFound } from "next/navigation";
import PostForm from "@/components/PostForm";
import { getCategories, getPostById, getPostTags } from "@/lib/data";

export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cats = await getCategories();
  if (id === "new") return <PostForm cats={cats} />;
  const post = await getPostById(Number(id));
  if (!post) notFound();
  const tags = (await getPostTags(post.id)).map((t) => t.name).join(", ");
  return <PostForm cats={cats} post={post} tags={tags} />;
}
