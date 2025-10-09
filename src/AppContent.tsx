// src/AppContent.tsx

import { useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";

export default function AppContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const isBilebandiPage =
    location.pathname === "/bilebandi-heidi-and-the-hot-stuff";

  return (
    <div className="relative min-h-screen">
      <ScrollToTop />
      <Header />
      <main>{children}</main> {/* Vike injects the page here */}
      {!isBilebandiPage && <Footer />}
    </div>
  );
}
