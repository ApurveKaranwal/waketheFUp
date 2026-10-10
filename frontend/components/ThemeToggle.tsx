"use client";

import { useEffect } from "react";
import { Moon } from "lucide-react";

export default function ThemeToggle() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono border border-black dark:border-white text-black dark:text-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer select-none"
    >
      <Moon className="w-3.5 h-3.5" />
      <span>[ Toggle Theme ]</span>
    </button>
  );
}
