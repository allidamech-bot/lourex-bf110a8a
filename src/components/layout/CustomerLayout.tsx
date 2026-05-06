import { Outlet } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const CustomerLayout = () => {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <SiteHeader />
      <main className="w-full max-w-full overflow-x-hidden pb-24 pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
