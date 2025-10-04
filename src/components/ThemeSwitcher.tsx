import { useState, useEffect } from "react";
import { Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define your themes here, matching the CSS classes (without the dot)
const themes = ["theme-dark-blue", "theme-warm-desert", "theme-mono-light"];

const ThemeSwitcher = () => {
  // We'll store the index of the current theme
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);

  // This effect runs whenever the currentThemeIndex changes
  useEffect(() => {
    const root = document.documentElement; // Get the <html> element

    // Remove any existing theme classes
    root.classList.remove(...themes);

    // Add the new theme class. The first theme is default (no class).
    if (currentThemeIndex > 0) {
      root.classList.add(themes[currentThemeIndex]);
    }
  }, [currentThemeIndex]);

  const cycleTheme = () => {
    // Cycle to the next theme, wrapping around using the modulo operator
    setCurrentThemeIndex((prevIndex) => (prevIndex + 1) % themes.length);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-4 left-4 z-50 rounded-full h-12 w-12 shadow-lg"
      onClick={cycleTheme}
      aria-label="Change color theme"
    >
      <Paintbrush className="h-6 w-6" />
    </Button>
  );
};

export default ThemeSwitcher;
