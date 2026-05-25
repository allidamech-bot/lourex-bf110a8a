import { Outlet } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { useI18n } from "@/lib/i18n";

export const CustomerLayout = () => {
  const { lang } = useI18n();
  const isRtl = lang === "ar";

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-stone-950 text-stone-100 selection:bg-amber-500/30 selection:text-amber-200">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.03),transparent_40%)] pointer-events-none" />
      <SiteHeader />
      <main className="relative w-full max-w-full overflow-x-hidden pb-24 pt-8">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 rounded-[2rem] border border-amber-200/10 bg-stone-900/55 p-6 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className={`flex flex-col gap-1 ${isRtl ? 'text-right' : 'text-left'}`}>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/80">LOUREX PORTAL</span>
              <h1 className="font-serif text-2xl font-bold text-stone-100 md:text-3xl">
                {isRtl ? "بوابة العميل" : "Customer Portal"}
              </h1>
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
