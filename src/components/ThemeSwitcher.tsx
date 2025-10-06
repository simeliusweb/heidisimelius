import { useState, useEffect } from "react";
import { Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define your themes here, matching the CSS classes
const themes = ["theme-dark-blue", "theme-warm-desert"];
const storageKey = "heidisimelius-color-theme"; // Key for localStorage

const ThemeSwitcher = () => {
  // MODIFICATION: Initialize state from localStorage
  // The function inside useState runs only once on component mount.
  const [currentThemeIndex, setCurrentThemeIndex] = useState(() => {
    try {
      const savedThemeIndex = window.localStorage.getItem(storageKey);
      // If a theme is saved and it's a valid number, use it.
      if (savedThemeIndex !== null) {
        return parseInt(savedThemeIndex, 10);
      }
    } catch (error) {
      console.error("Failed to read theme from localStorage", error);
    }
    // Otherwise, default to the first theme (index 0).
    return 0;
  });

  // This effect runs whenever the currentThemeIndex changes
  useEffect(() => {
    const root = document.documentElement;

    // Remove any existing theme classes
    root.classList.remove(...themes);

    // Add the new theme class. The first theme is default (no class).
    // It's better to explicitly set the default class for clarity.
    const newThemeClass = themes[currentThemeIndex];
    if (newThemeClass !== "theme-dark-blue") {
      root.classList.add(newThemeClass);
    }

    // MODIFICATION: Save the new theme index to localStorage
    try {
      window.localStorage.setItem(storageKey, currentThemeIndex.toString());
    } catch (error) {
      console.error("Failed to save theme to localStorage", error);
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
      className="fixed bottom-4 left-4 z-50 rounded-full h-auto w-auto px-4 py-2 shadow-lg"
      onClick={cycleTheme}
      aria-label="Change color theme"
    >
      <Paintbrush className="h-6 w-6" /> Teema v{currentThemeIndex + 1}
    </Button>
  );
};

export default ThemeSwitcher;
