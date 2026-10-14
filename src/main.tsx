import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import App from "./App.tsx";
import "./index.css";
import "./styles/purchase-requests-hardening.css";
import "./styles/lourex-brand.css";
import "./styles/lourex-interior.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
    <MotionConfig reducedMotion="user"><App /></MotionConfig>
  </ThemeProvider>
);
