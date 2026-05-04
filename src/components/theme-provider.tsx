"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { THEMES, type Theme, type ThemeKey } from "@/lib/themes";

type Ctx = { t: Theme; themeKey: ThemeKey; setTheme: (k: ThemeKey) => void };
const ThemeCtx = createContext<Ctx>({ t: THEMES.light, themeKey: "light", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>("light");

  useEffect(() => {
    const saved = localStorage.getItem("grepo-theme") as ThemeKey;
    if (saved && THEMES[saved]) setThemeKey(saved);
  }, []);

  const setTheme = (k: ThemeKey) => {
    setThemeKey(k);
    localStorage.setItem("grepo-theme", k);
  };

  return (
    <ThemeCtx.Provider value={{ t: THEMES[themeKey], themeKey, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
