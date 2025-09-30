import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { gsap } from "gsap";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import BioPage from "./pages/BioPage";
import NotFound from "./pages/NotFound";

// Declare ScrollSmoother type for TypeScript
declare global {
  interface Window {
    ScrollSmoother: any;
    ScrollTrigger: any;
  }
}

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Wait for ScrollSmoother to be loaded from CDN
    const initScrollSmoother = () => {
      if (window.ScrollSmoother && window.ScrollTrigger) {
        gsap.registerPlugin(window.ScrollTrigger);
        
        window.ScrollSmoother.create({
          wrapper: "#smooth-wrapper",
          content: "#smooth-content",
          smooth: 1,
          effects: true,
          smoothTouch: 0.1, // Slight smoothing on touch devices
        });
      }
    };

    // Check if scripts are already loaded
    if (window.ScrollSmoother) {
      initScrollSmoother();
    } else {
      // Wait for scripts to load
      const checkInterval = setInterval(() => {
        if (window.ScrollSmoother) {
          initScrollSmoother();
          clearInterval(checkInterval);
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div id="smooth-wrapper" className="relative">
            <div id="smooth-content">
              <div className="relative min-h-screen">
                <Header />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/bio" element={<BioPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Footer />
              </div>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
