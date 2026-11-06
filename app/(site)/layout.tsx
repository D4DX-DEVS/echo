import SiteShell from "@/components/SiteShell";
import "./site.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
