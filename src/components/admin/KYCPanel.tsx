import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { ShieldCheck, Check, X, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface KYCDoc {
  id: string;
  user_id: string;
  doc_type: string;
  file_url: string;
  status: string;
  notes: string;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  company_name: string;
  verification_status: string;
  phone: string;
  country: string;
}

export const KYCPanel = () => {
  const { t } = useI18n();
  const [docs, setDocs] = useState<KYCDoc[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("kyc_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
    ]);
    setDocs((d as KYCDoc[]) || []);
    setProfiles((p as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleKYCAction = async (docId: string, status: "approved" | "rejected") => {
    setActing(docId);
    const { error } = await supabase
      .from("kyc_documents")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", docId);
    if (error) toast.error(error.message);
    else {
      toast.success(`Document ${status}`);
      await fetchData();
    }
    setActing(null);
  };

  const handleVerifyUser = async (userId: string, verified: boolean) => {
    setActing(userId);
    try {
      // 1. Update profile verification_status + verified_at
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          verification_status: verified ? "verified" : "pending",
          ...(verified ? { verified_at: new Date().toISOString() } : {}),
        })
        .eq("id", userId);
      if (profileErr) throw profileErr;

      // 2. Update companies owned by this user
      const { error: companyErr } = await supabase
        .from("companies")
        .update({ verification_status: verified ? "verified" : "pending" })
        .eq("owner_id", userId);
      // Ignore if no companies found (companyErr with 0 rows is fine)
      if (companyErr) console.warn("Company update:", companyErr.message);

      // 3. Update factories owned by this user
      const { error: factoryErr } = await supabase
        .from("factories")
        .update({ is_verified: verified })
        .eq("owner_user_id", userId);
      if (factoryErr) console.warn("Factory update:", factoryErr.message);

      // 4. Approve all pending KYC docs for this user if verifying
      if (verified) {
        await supabase
          .from("kyc_documents")
          .update({ status: "approved", reviewed_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("status", "pending");
      }

      toast.success(verified ? "✅ User verified — profile, company, and factory updated" : "Verification revoked");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update verification");
    }
    setActing(null);
  };

  const getName = (userId: string) => {
    const p = profiles.find((pr) => pr.id === userId);
    return p?.full_name || p?.company_name || userId.slice(0, 8);
  };

  const getProfile = (userId: string) => profiles.find((pr) => pr.id === userId);

  const statusBadge: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-emerald-500/20 text-emerald-400",
    verified: "bg-emerald-500/20 text-emerald-400",
    rejected: "bg-destructive/20 text-destructive",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userIds = [...new Set(docs.map((d) => d.user_id))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-xl font-semibold">{t("admin.kyc")}</h2>
        </div>
        <Button variant="ghost" onClick={fetchData} className="text-muted-foreground">
          <RefreshCw className="w-4 h-4 me-2" /> {t("admin.refresh")}
        </Button>
      </div>

      {userIds.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("admin.noKyc")}</p>
      ) : (
        userIds.map((userId) => {
          const userDocs = docs.filter((d) => d.user_id === userId);
          const profile = getProfile(userId);
          const vs = profile?.verification_status || "pending";
          const isVerified = vs === "verified" || vs === "approved";

          return (
            <motion.div
              key={userId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-serif font-semibold">{getName(userId)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {profile?.company_name && `${profile.company_name} • `}
                    {profile?.country || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge[vs] || statusBadge.pending}`}>
                    {vs}
                  </span>
                  {!isVerified ? (
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => handleVerifyUser(userId, true)}
                      disabled={acting === userId}
                    >
                      <Check className="w-3.5 h-3.5 me-1" /> {t("admin.verify")}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerifyUser(userId, false)}
                      disabled={acting === userId}
                      className="text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5 me-1" /> {t("admin.revoke")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {userDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="capitalize font-medium">{doc.doc_type.replace("_", " ")}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge[doc.status] || statusBadge.pending}`}>{doc.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                        <Eye className="w-4 h-4" />
                      </a>
                      {doc.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleKYCAction(doc.id, "approved")}
                            disabled={acting === doc.id}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleKYCAction(doc.id, "rejected")}
                            disabled={acting === doc.id}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
};
