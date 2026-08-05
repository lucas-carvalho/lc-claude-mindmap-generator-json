"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

export function ThemeToggle() {
  // Starts at the server-safe default ("light") and corrects itself in an
  // effect right after mount — the actual theme was already applied to
  // <html> by the beforeInteractive script in layout.tsx before hydration,
  // so reading it eagerly here would mismatch the server-rendered icon.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // One-time read of an external system (a DOM attribute set by a
    // pre-hydration <script>), not state derived from props — the case
    // React's effects are actually for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  };

  return (
    <button type="button" className={styles.button} onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
