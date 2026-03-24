import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const THEMES = {
  cyan:    { name: "Cyan",    primary: "#06b6d4", bg: "bg-cyan-600",    hover: "hover:bg-cyan-700",    ring: "ring-cyan-400",    text: "text-cyan-400",    soft: "bg-cyan-600/20",    softHover: "hover:bg-cyan-600/40"    },
  violet:  { name: "Violet",  primary: "#7c3aed", bg: "bg-violet-600",  hover: "hover:bg-violet-700",  ring: "ring-violet-400",  text: "text-violet-400",  soft: "bg-violet-600/20",  softHover: "hover:bg-violet-600/40"  },
  rose:    { name: "Rose",    primary: "#e11d48", bg: "bg-rose-600",    hover: "hover:bg-rose-700",    ring: "ring-rose-400",    text: "text-rose-400",    soft: "bg-rose-600/20",    softHover: "hover:bg-rose-600/40"    },
  emerald: { name: "Emerald", primary: "#059669", bg: "bg-emerald-600", hover: "hover:bg-emerald-700", ring: "ring-emerald-400", text: "text-emerald-400", soft: "bg-emerald-600/20", softHover: "hover:bg-emerald-600/40" },
  amber:   { name: "Amber",   primary: "#d97706", bg: "bg-amber-600",   hover: "hover:bg-amber-700",   ring: "ring-amber-400",   text: "text-amber-400",   soft: "bg-amber-600/20",   softHover: "hover:bg-amber-600/40"   },
};

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(true);
  const [theme, setTheme] = useState("cyan");
  const [showThemePanel, setShowThemePanel] = useState(false); // ← controls panel open/close

  // Load from localStorage on mount
  useEffect(() => {
    const savedDark = localStorage.getItem("tn-dark");
    const savedTheme = localStorage.getItem("tn-theme");
    if (savedDark !== null) setDark(savedDark === "true");
    if (savedTheme && THEMES[savedTheme]) setTheme(savedTheme);
  }, []);

  // Persist dark + apply to <html>
  useEffect(() => {
    localStorage.setItem("tn-dark", dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  // Persist theme
  useEffect(() => {
    localStorage.setItem("tn-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        dark, setDark,
        theme, setTheme,
        accent: THEMES[theme],
        showThemePanel, setShowThemePanel,
      }}
    >
      <div className={dark ? "dark-mode" : "light-mode"} style={{ minHeight: "100vh" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);