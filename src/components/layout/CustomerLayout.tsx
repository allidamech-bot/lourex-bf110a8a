import { Outlet } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const CustomerLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pb-16 pt-24">
        <div className="container mx-auto px-4 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
