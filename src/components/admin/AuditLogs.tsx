import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  new_values: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
  changed_by: string;
  created_at: string;
}

export const AuditLogs = () => {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data as AuditLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-gold" />
          <h2 className="font-serif text-xl font-semibold">{t("admin.auditLogs")}</h2>
        </div>
        <Button variant="ghost" onClick={fetchLogs} className="text-muted-foreground">
          <RefreshCw className="w-4 h-4 me-2" /> {t("admin.refresh")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("admin.noLogs")}</p>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-start p-3 font-medium">{t("admin.date")}</th>
                  <th className="text-start p-3 font-medium">{t("admin.table")}</th>
                  <th className="text-start p-3 font-medium">{t("admin.action")}</th>
                  <th className="text-start p-3 font-medium hidden md:table-cell">{t("admin.changes")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium text-gold">{log.table_name}</td>
                    <td className="p-3 capitalize">{log.action.replace("_", " ")}</td>
                    <td className="p-3 hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.new_values ? JSON.stringify(log.new_values) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
