import Link from "next/link";
import SiteShell from "@/components/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
      <div className="wrap py-24 text-center">
        <p className="text-6xl font-extrabold text-accent">404</p>
        <p className="mt-3 text-muted">This page could not be found.</p>
        <Link href="/" className="btn mt-6">Back to home</Link>
      </div>
    </SiteShell>
  );
}
