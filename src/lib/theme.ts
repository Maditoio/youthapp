export const THEME_STORAGE_KEY = "jeunese-theme";
export const THEME_COOKIE = "jeunese-theme";

export type ThemePreference = "system" | "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): "light" | "dark" {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemDark ? "dark" : "light";
}

/** Runs before paint so the first frame matches the stored preference. */
export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var c=${JSON.stringify(THEME_COOKIE)};var m=document.cookie.match(new RegExp("(?:^|; )"+c+"=([^;]*)"));var t=(m&&decodeURIComponent(m[1]))||localStorage.getItem(k)||"system";if(t!=="light"&&t!=="dark"&&t!=="system")t="system";var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",dark);r.style.colorScheme=dark?"dark":"light";r.dataset.theme=t;}catch(e){}})();`;
