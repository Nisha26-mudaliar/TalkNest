import { useTheme } from "../context/ThemeContext";

// Accent color hex values for the conic gradient border
const ACCENT_HEX = {
  cyan:    { mid: "#06b6d4", light: "#67e8f9" },
  violet:  { mid: "#7c3aed", light: "#a78bfa" },
  rose:    { mid: "#e11d48", light: "#fb7185" },
  emerald: { mid: "#059669", light: "#6ee7b7" },
  amber:   { mid: "#d97706", light: "#fcd34d" },
};

function BorderAnimatedContainer({ children }) {
  const { theme } = useTheme();
  const colors = ACCENT_HEX[theme] || ACCENT_HEX.cyan;

  return (
    <div
      className="w-full h-full rounded-2xl border border-transparent animate-border flex overflow-hidden"
      style={{
        background: `
          linear-gradient(45deg, #172033, rgb(30 41 59) 50%, #172033) padding-box,
          conic-gradient(
            from var(--border-angle),
            rgb(71 85 105 / 0.48) 80%,
            ${colors.mid} 86%,
            ${colors.light} 90%,
            ${colors.mid} 94%,
            rgb(71 85 105 / 0.48)
          ) border-box
        `,
      }}
    >
      {children}
    </div>
  );
}

export default BorderAnimatedContainer;