import Header from "./Header";
import Footer from "./Footer";
import BackToTop from "./BackToTop";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-bg focus:px-4 focus:py-3 focus:font-semibold focus:text-fg focus:shadow-lg">Skip to content</a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <Footer />
      <BackToTop />
    </>
  );
}
