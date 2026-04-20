import { BarChart3, ClipboardList, FilePenLine, Files, LayoutDashboard, PackageSearch, Receipt, ShieldCheck, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";

const dashboardLinks = [
  { to: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard, end: true },
  { to: "/dashboard/requests", label: "طلبات الشراء", icon: ClipboardList },
  { to: "/dashboard/customers", label: "العملاء", icon: Users },
  { to: "/dashboard/deals", label: "الصفقات", icon: PackageSearch },
  { to: "/dashboard/tracking", label: "التتبع", icon: Files },
  { to: "/dashboard/accounting", label: "المحاسبة", icon: Receipt },
  { to: "/dashboard/edit-requests", label: "طلبات التعديل", icon: FilePenLine },
  { to: "/dashboard/audit", label: "سجل التدقيق", icon: ShieldCheck },
  { to: "/dashboard/reports", label: "التقارير", icon: BarChart3 },
];

export const DashboardLayout = () => (
  <div className="min-h-screen bg-background">
    <SiteHeader />
    <div className="container mx-auto grid gap-6 px-4 py-8 md:px-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm">
        <div className="mb-5 rounded-2xl bg-secondary/70 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">LOUREX OS</p>
          <h2 className="mt-2 font-serif text-xl font-bold">Intermediary Operations</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            منصة تشغيلية تربط العميل مع وكيل تركيا ووكيل السعودية ضمن تدفق واضح وقابل للتدقيق.
          </p>
        </div>
        <nav className="space-y-1">
          {dashboardLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  </div>
);
