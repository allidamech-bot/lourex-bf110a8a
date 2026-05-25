import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

const NotFound = () => {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-100">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.02),transparent_50%)] pointer-events-none" />
      <div className="text-center relative z-10">
        <h1 className="mb-4 text-6xl font-serif font-bold text-amber-500">404</h1>
        <p className="mb-8 text-xl text-stone-400 font-medium uppercase tracking-widest">{t("notFound.title")}</p>
        <a href="/" className="inline-flex items-center justify-center rounded-xl px-8 py-3 bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110 transition-all">
          {t("notFound.backHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
