import { useEffect } from "react";

/** Keep Safari chrome and overscroll consistently dark on every LOUREX route. */
export function BrowserTheme() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("light");
    html.classList.add("dark");
    html.dataset.lourexSurface = "dark";
    html.style.colorScheme = "dark";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#090909");
  }, []);
  return null;
}
