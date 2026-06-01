import { useState } from "react";
import { darkTheme, lightTheme } from "./theme";
import Registry from "./Registry";
import Scoring from "./Scoring";

export default function App() {
  const [page, setPage] = useState("scoring");
  const [darkMode, setDarkMode] = useState(true);
  const theme = darkMode ? darkTheme : lightTheme;

  const nav = (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", padding: "12px 16px", background: theme.bgCard, borderBottom: `1px solid ${theme.border}`, position: "relative" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        {["scoring", "registry"].map(p => (
          <button key={p} onClick={() => setPage(p)} style={{
            padding: "6px 20px",
            background: page === p ? theme.buttonBg : "transparent",
            border: `1px solid ${page === p ? theme.borderActive : theme.borderSubtle}`,
            borderRadius: "4px", color: page === p ? "#ffffff" : theme.textMuted,
            fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", cursor: "pointer"
          }}>{p}</button>
        ))}
      </div>
      <button onClick={() => setDarkMode(d => !d)} style={{
        position: "absolute", right: "16px",
        background: "transparent",
        border: `1px solid ${theme.borderSubtle}`,
        borderRadius: "4px", padding: "4px 10px",
        color: theme.textMuted, fontSize: "11px",
        cursor: "pointer", letterSpacing: "1px"
      }}>
        {darkMode ? "☀ Light" : "☾ Dark"}
      </button>
    </div>
  );

  if (page === "registry") return <><div>{nav}</div><Registry theme={theme} /></>;
  return <><div>{nav}</div><Scoring theme={theme} /></>;
}
