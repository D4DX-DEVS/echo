import Header from "./Header";
import Footer from "./Footer";
import BackToTop from "./BackToTop";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <BackToTop />
    </>
  );
}
