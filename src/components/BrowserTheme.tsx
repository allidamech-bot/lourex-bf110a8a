import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";

/** Keep Safari chrome and overscroll consistent with the visible page. */
export function BrowserTheme() {
  const { pathname } = useLocation();
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const dark = pathname === "/" || pathname === "/products" || pathname === "/catalog" || resolvedTheme !== "light";
    document.documentElement.dataset.lourexSurface = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#090909" : "#f9f8f6");
  }, [pathname, resolvedTheme]);
  return null;
}
