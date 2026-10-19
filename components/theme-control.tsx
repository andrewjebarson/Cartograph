"use client";

import { useEffect, useState } from "react";
import { THEME_COOKIE, THEMES, type Theme } from "@/lib/theme";

function updateDomTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const d = document.documentElement;
  d.dataset.theme = theme;

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    d.classList.add("dark");
    d.classList.remove("light");
    d.style.colorScheme = "dark";
  } else {
    d.classList.add("light");
    d.classList.remove("dark");
    d.style.colorScheme = "light";
  }
}

function applyTheme(theme: Theme) {
  updateDomTheme(theme);
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeControl({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    updateDomTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (document.documentElement.dataset.theme === "system") {
        updateDomTheme("system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex h-6 items-center rounded border border-line text-[11px]"
    >
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => choose(t)}
          className={`h-full px-2 first:rounded-l last:rounded-r ${
            theme === t ? "bg-raised text-fg" : "text-fg-muted hover:text-fg"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
