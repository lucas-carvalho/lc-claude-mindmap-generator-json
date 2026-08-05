"use client";

import { Moon, Sun } from "lucide-react";

import styles from "./ThemeToggle.module.css";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button type="button" className={styles.button} onClick={onToggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
