import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Building2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Application {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  cr_number: string;
  tax_id: string;
  location: string;
  status: string;
  created_at: string;
  user_id: string | null;
}

interface FactoryApplicationsProps {
  filter?: "active" | "archived";
}

export const FactoryApplications = ({ filter = "active" }: FactoryApplicationsProps) => {
  const { t } = useI18n();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    setLoading(true);
    let query = supabase
      .from("factory_applications")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (filter === "archived") {
      query = query.eq("status", "rejected");
    } else {
      query = query.neq("status", "rejected");
    }

    const { data } = await query;
    setApps((data as Application[]) || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchApps(); }, []);

  const handleAction = async (app: Application, action: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();

    if (action === "approved") {
      if (!app.user_id) {
        toast.error("Application has no linked user account");
        return;
      }
      // Idempotent server-side approval (creates factory + role only if missing).
      const { error: rpcErr } = await supabase.rpc(
        "admin_approve_factory_application" as never,
        { p_application_id: app.id }
      );
      if (rpcErr) {
        toast.error(rpcErr.message);
        return;
      }
      toast.success(t("apps.approved"));
      await fetchApps();
      return;
    }

    // Rejection path
    const { error } = await supabase
      .from("factory_applications")
      .update({
        status: "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", app.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("apps.rejected"));
      await supabase.from("audit_logs").insert({
        table_name: "factory_applications",
        record_id: app.id,
        action: "application_rejected",
        changed_by: user?.id,
        new_values: { status: "rejected", company: app.company_name },
      });
      await fetchApps();
    }
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const statusBg = (status: string) => {
    if (status === "approved") return "bg-emerald-500/20 text-emerald-400";
    if (status === "rejected") return "bg-destructive/20 text-destructive";
    return "bg-yellow-500/20 text-yellow-400";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-gold" />
          <h2 className="font-serif text-xl font-semibold">{t("apps.title")}</h2>
        </div>
        <Button variant="ghost" onClick={fetchApps} className="text-muted-foreground">
          <RefreshCw className="w-4 h-4 me-2" /> {t("admin.refresh")}
        </Button>
      </div>

      {apps.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("apps.noApps")}</p>
      ) : (
        <div className="space-y-4">
          {apps.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-serif font-semibold text-gold">{app.company_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {app.contact_name} • {app.email}
                    {app.phone && ` • ${app.phone}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusBg(app.status)}`}>
                    {statusIcon(app.status)}
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">{t("apps.crNumber")}</p>
                  <p className="font-medium">{app.cr_number}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">{t("apps.taxId")}</p>
                  <p className="font-medium">{app.tax_id}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">{t("apps.location")}</p>
                  <p className="font-medium">{app.location || "—"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(app.created_at).toLocaleDateString()}
                </span>
                {app.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleAction(app, "rejected")}
                    >
                      <XCircle className="w-4 h-4 me-1" /> {t("apps.reject")}
                    </Button>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => handleAction(app, "approved")}
                    >
                      <CheckCircle className="w-4 h-4 me-1" /> {t("apps.approve")}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
