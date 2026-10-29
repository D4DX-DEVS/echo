import { deleteCategory, saveCategory } from "../../actions";
import { getCategories, q } from "@/lib/data";
import ConfirmButton from "@/components/ConfirmButton";

export default async function Categories() {
  const [cats, counts] = await Promise.all([getCategories(), q<{ category_id: number; n: number }>("SELECT category_id, COUNT(*) n FROM posts GROUP BY category_id")]);
  const n = (id: number) => Number(counts.find((c) => c.category_id === id)?.n ?? 0);
  const row = (c?: (typeof cats)[number]) => (
    <form key={c?.id ?? "new"} action={saveCategory} className="grid grid-cols-2 md:grid-cols-[1fr_1fr_140px_80px_auto] gap-2 items-center py-2 border-t border-line">
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <input name="name" defaultValue={c?.name} placeholder="Name" className="field" required />
      <input name="slug" defaultValue={c?.slug} placeholder="slug" className="field" />
      <select name="parent_id" defaultValue={c?.parent_id ?? 0} className="field">
        <option value={0}>No parent</option>
        {cats.filter((p) => !p.parent_id && p.id !== c?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input name="sort" type="number" defaultValue={c?.sort ?? 50} className="field" title="Menu order" />
      <div className="flex gap-2 items-center">
        <button className={c ? "btn ghost sm" : "btn sm"}>{c ? "Save" : "Add"}</button>
        {c && <span className="text-xs text-muted">{n(c.id)} posts</span>}
        {c && n(c.id) === 0 && <ConfirmButton message="Delete this category?" formAction={deleteCategory} formNoValidate className="btn danger sm">Delete</ConfirmButton>}
      </div>
    </form>
  );
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-extrabold mb-4">Categories</h1>
      <p className="text-sm text-muted mb-2">Name · slug · parent · menu order. Categories with posts can’t be deleted.</p>
      {cats.map((c) => row(c))}
      <h2 className="font-bold mt-6 mb-1">Add category</h2>
      {row()}
    </div>
  );
}
