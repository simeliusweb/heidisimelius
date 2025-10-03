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

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isBilebandiPage = location.pathname === "/bilebandi-heidi-and-the-hot-stuff";

  return (
    <div className="relative min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/bio" element={<BioPage />} />
        <Route path="/keikat" element={<KeikatPage />} />
        <Route path="/galleria" element={<GalleriaPage />} />
        <Route path="/bilebandi-heidi-and-the-hot-stuff" element={<BilebandiPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isBilebandiPage && <Footer />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
