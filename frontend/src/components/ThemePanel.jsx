import { useEffect, useRef } from "react";
import { XIcon, Moon, Sun } from "lucide-react";
import { useTheme, THEMES } from "../context/ThemeContext";

const SWATCHES = [
  { key: "cyan",    color: "#06b6d4" },
  { key: "violet",  color: "#7c3aed" },
  { key: "rose",    color: "#e11d48" },
  { key: "emerald", color: "#059669" },
  { key: "amber",   color: "#d97706" },
];

function ThemePanel() {
  const { dark, setDark, theme, setTheme, accent, showThemePanel, setShowThemePanel } = useTheme();
  const panelRef = useRef(null);

  const onClose = () => setShowThemePanel(false);

  // Close on outside click (with small delay so open-click doesn't immediately close)
  useEffect(() => {
    if (!showThemePanel) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    const timeout = setTimeout(() => window.addEventListener("click", handleClick), 100);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("click", handleClick);
    };
  }, [showThemePanel]);

  // Close on Escape
  useEffect(() => {
    if (!showThemePanel) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showThemePanel]);

  // Don't render anything if closed
  if (!showThemePanel) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={panelRef}
        className="relative z-10 w-72 h-full bg-slate-900 border-l border-slate-700/50 shadow-2xl flex flex-col"
        style={{ animation: "slideIn 0.28s cubic-bezier(0.34,1.1,0.64,1) both" }}
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
       {/* <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <h2 className="text-slate-200 font-semibold text-base">Appearance</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div> */}

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

          {/* Dark / Light toggle */}
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Mode</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDark(false)}
                className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border transition-all
                  ${!dark
                    ? `border-transparent ring-2 ${accent.ring} bg-slate-800`
                    : "border-slate-700/50 bg-slate-800/50 hover:bg-slate-800"}`}
              >
                <Sun className={`w-5 h-5 ${!dark ? accent.text : "text-slate-400"}`} />
                <span className={`text-xs font-medium ${!dark ? "text-slate-200" : "text-slate-500"}`}>Light</span>
              </button>
              <button
                onClick={() => setDark(true)}
                className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border transition-all
                  ${dark
                    ? `border-transparent ring-2 ${accent.ring} bg-slate-800`
                    : "border-slate-700/50 bg-slate-800/50 hover:bg-slate-800"}`}
              >
                <Moon className={`w-5 h-5 ${dark ? accent.text : "text-slate-400"}`} />
                <span className={`text-xs font-medium ${dark ? "text-slate-200" : "text-slate-500"}`}>Dark</span>
              </button>
            </div>
          </div>

          {/* Accent color */}
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Accent Color</p>
            <div className="flex gap-3 flex-wrap">
              {SWATCHES.map(({ key, color }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  title={THEMES[key].name}
                  className="w-9 h-9 rounded-full transition-all duration-200 hover:scale-110"
                  style={{
                    backgroundColor: color,
                    boxShadow: theme === key ? `0 0 0 2px #0f172a, 0 0 0 4px ${color}` : "none",
                    transform: theme === key ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Selected: <span className={`font-medium ${accent.text}`}>{THEMES[theme].name}</span>
            </p>
          </div>

          {/* Live preview */}
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Preview</p>
            <div className="rounded-xl overflow-hidden border border-slate-700/50">
              <div className={`px-4 py-2 text-white text-xs font-medium ${accent.bg}`}>
                {THEMES[theme].name} theme
              </div>
              <div className="bg-slate-800 p-3 space-y-2">
                <div className="flex justify-start">
                  <div className="bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-2xl rounded-bl-sm max-w-[80%]">
                    Hey! How are you? 👋
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className={`text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%] ${accent.bg}`}>
                    Doing great, thanks! 😊
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ThemePanel;