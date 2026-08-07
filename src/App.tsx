import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import BioPage from "./pages/BioPage";
import KeikatPage from "./pages/KeikatPage";
import GalleriaPage from "./pages/GalleriaPage";
import NotFound from "./pages/NotFound";
import BilebandiPage from "./pages/BilebandiPage";
import LaulunopetusPage from "./pages/LaulunopetusPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import { Helmet } from "react-helmet-async";
import { siteDefaultMeta, SITE_URL } from "./config/metadata";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isBilebandiPage = location.pathname === "/bilebandi-heidi-and-the-hot-stuff";
  const isAdminPage = location.pathname === "/admin";
  const isAuthPage = location.pathname === "/login";

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <div className="relative min-h-screen">
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bio" element={<BioPage />} />
        <Route path="/keikat" element={<KeikatPage />} />
        <Route path="/galleria" element={<GalleriaPage />} />
        <Route path="/bilebandi-heidi-and-the-hot-stuff" element={<BilebandiPage />} />
        <Route path="/laulunopetus" element={<LaulunopetusPage />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isBilebandiPage && !isAdminPage && <Footer />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/*
        Default meta for routes without <PageMeta> (login, admin). Any page-level
        PageMeta overrides these by tag name. This must cover every data-rh tag in
        index.html — Helmet strips the ones it owns but is not asked to render.
      */}
      <Helmet>
        <title>{siteDefaultMeta.title}</title>
        <meta name="description" content={siteDefaultMeta.description} />

        <meta property="og:title" content={siteDefaultMeta.socialTitle} />
        <meta
          property="og:description"
          content={siteDefaultMeta.socialDescription}
        />
        <meta property="og:url" content={`${SITE_URL}/`} />

        <meta property="twitter:title" content={siteDefaultMeta.socialTitle} />
        <meta
          property="twitter:description"
          content={siteDefaultMeta.socialDescription}
        />
        <meta property="twitter:url" content={`${SITE_URL}/`} />
      </Helmet>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
