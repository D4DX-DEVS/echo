// Shown while an admin page loads, in the shape of a page: title, a row of controls, then cards.
export default function Loading() {
  return (
    <div className="max-w-6xl space-y-6" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-56" />
      <div className="flex gap-2"><div className="skeleton h-10 w-48" /><div className="skeleton h-10 w-32" /><div className="skeleton h-10 w-32" /></div>
      <div className="grid gap-6 lg:grid-cols-2"><div className="skeleton h-64" /><div className="skeleton h-64" /></div>
      <div className="skeleton h-48" />
    </div>
  );
}
