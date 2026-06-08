import { useEffect, useState } from "react";
import { ShieldAlert, Activity, AlertOctagon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const AdminAuditLogs = () => {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCriticalLogs = async () => {
      // Fetch failures from verifyLedgerIntegrity or Stage 11 mutations
      // For demonstration, we query audit_logs where action indicates failure or unauthorized access.
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .or("action.ilike.%fail%,action.ilike.%unauthorized%,action.ilike.%error%,action.ilike.%ledger%,action.ilike.%stage 11%")
        .order("created_at", { ascending: false })
        .limit(50);
        
      setLogs(data || []);
      setLoading(false);
    };

    void fetchCriticalLogs();
    
    // Real-time subscription
    const subscription = supabase
      .channel('critical_audit_logs')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'audit_logs' 
      }, (payload) => {
        const newLog = payload.new;
        const actionStr = String(newLog.action).toLowerCase();
        if (
          actionStr.includes('fail') || 
          actionStr.includes('unauth') || 
          actionStr.includes('error') || 
          actionStr.includes('ledger') || 
          actionStr.includes('stage 11')
        ) {
          setLogs(prev => [newLog, ...prev].slice(0, 50));
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div className="bg-stone-950 border border-red-900/30 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-red-900/20 bg-black/60">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
          <h3 className="font-mono text-sm font-semibold text-red-400 tracking-wider">
            {isAr ? "سجل الرقابة الأمنية المباشر" : "SECURE AUDIT LOG STREAM"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[10px] uppercase font-mono text-red-500/70">
            {isAr ? "مباشر" : "LIVE"}
          </span>
        </div>
      </div>

      {/* Log Feed */}
      <div className="p-0 max-h-[400px] overflow-y-auto bg-black/80">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <Activity className="w-6 h-6 text-red-500/50 mx-auto animate-spin" />
            <p className="text-xs font-mono text-stone-500 uppercase">Establishing Secure Connection...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center space-y-3 flex flex-col items-center justify-center opacity-50">
            <ShieldAlert className="w-8 h-8 text-stone-600 mb-2" />
            <p className="text-xs font-mono text-stone-500 uppercase">
              {isAr ? "لا توجد خروقات حرجة" : "No Critical Violations Detected"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-red-900/10">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-red-950/20 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-mono font-bold text-red-400 uppercase">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-stone-400 mt-1">
                      Target: <span className="text-stone-300">{log.table_name} / {log.record_id}</span>
                    </p>
                    <p className="text-[10px] font-mono text-stone-500 mt-1">
                      By: {log.changed_by || 'SYSTEM'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-red-500/70 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
