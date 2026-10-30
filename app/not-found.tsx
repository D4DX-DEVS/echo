import Link from "next/link";

// Shown inside the site layout, which already provides the header, menu and footer.
export default function NotFound() {
  return (
    <div className="wrap py-24 text-center">
      <h1 className="text-6xl font-extrabold text-accent">404</h1>
      <p className="mt-3 text-muted">This page could not be found.</p>
      <Link prefetch={false} href="/" className="btn mt-6">Back to home</Link>
    </div>
  );
}
