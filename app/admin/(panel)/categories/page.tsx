import { deleteCategory, saveCategory } from "../../actions";
import { getCategories, q } from "@/lib/data";
import ConfirmButton from "@/components/ConfirmButton";

export default async function Categories() {
  const [cats, counts] = await Promise.all([getCategories(), q<{ category_id: number; n: number }>("SELECT category_id, COUNT(*) n FROM posts GROUP BY category_id")]);
  const n = (id: number) => Number(counts.find((c) => c.category_id === id)?.n ?? 0);
  const row = (c?: (typeof cats)[number]) => (
    <form key={c?.id ?? "new"} action={saveCategory} className="grid grid-cols-2 md:grid-cols-[1fr_1fr_140px_80px_auto] gap-2 items-center py-2 border-t border-line">
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <input name="name" aria-label="Name" defaultValue={c?.name} placeholder="Name" className="field" required />
      <input name="slug" aria-label="Slug" defaultValue={c?.slug} placeholder="slug" className="field" />
      <select name="parent_id" aria-label="Parent category" defaultValue={c?.parent_id ?? 0} className="field">
        <option value={0}>No parent</option>
        {cats.filter((p) => !p.parent_id && p.id !== c?.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input name="sort" aria-label="Menu order" type="number" defaultValue={c?.sort ?? 50} className="field" title="Menu order" />
      <div className="flex gap-2 items-center">
        <button className={c ? "btn ghost sm" : "btn sm"}>{c ? "Save" : "Add"}</button>
        {c && <span className="text-xs text-muted">{n(c.id)} {n(c.id) === 1 ? "post" : "posts"}</span>}
        {c && n(c.id) === 0 && <ConfirmButton message="Delete this category?" formAction={deleteCategory} formNoValidate className="btn danger sm">Delete</ConfirmButton>}
      </div>
    </form>
  );
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-extrabold mb-4">Categories</h1>
      <p className="text-sm text-muted mb-4">Categories with posts can’t be deleted.</p>
      <div className="bg-bg border border-line rounded-2xl p-4 shadow-sm">
        <div className="hidden md:grid grid-cols-[1fr_1fr_140px_80px_auto] gap-2 pb-2 text-xs font-semibold text-muted">
          <span>Name</span><span>Slug</span><span>Parent</span><span>Menu order</span><span />
        </div>
        {cats.map((c) => row(c))}
      </div>
      <h2 className="font-bold mt-8 mb-3">Add category</h2>
      <div className="bg-bg border border-line rounded-2xl p-4 shadow-sm">{row()}</div>
    </div>
  );
}
