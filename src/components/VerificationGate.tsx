import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { ShieldAlert, Upload, ArrowLeft, Clock, FileCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VerificationGateProps {
  children: React.ReactNode;
}

type VerifStatus = "loading" | "no_auth" | "pending" | "verified" | "rejected";

const VerificationGate = ({ children }: VerificationGateProps) => {
  const [status, setStatus] = useState<VerifStatus>("loading");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { lang } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("no_auth"); return; }
      setUserId(user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("role, verification_status")
        .eq("id", user.id)
        .maybeSingle();

      const isAdmin = profile?.role === "owner" || profile?.role === "operations_employee";
      if (isAdmin) { setStatus("verified"); return; }

      const vs = profile?.verification_status ?? "pending";
      if (vs === "verified" || vs === "approved") setStatus("verified");
      else if (vs === "rejected") setStatus("rejected");
      else setStatus("pending");
    };
    check();
  }, []);

  useEffect(() => {
    if (status === "no_auth") navigate("/auth");
  }, [status, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocs = async () => {
    if (!userId || selectedFiles.length === 0) return;
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const filePath = `${userId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("verification-docs")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        // Record in kyc_documents table
        const { error: dbError } = await supabase.from("kyc_documents").insert({
          user_id: userId,
          doc_type: "verification",
          file_url: filePath,
          status: "pending",
        });
        if (dbError) throw dbError;
      }
      toast.success(lang === "ar" ? "تم رفع المستندات بنجاح" : "Documents uploaded successfully");
      setSelectedFiles([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (status === "loading" || status === "no_auth") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "verified") return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            {status === "pending" ? (
              <Clock className="w-10 h-10 text-primary-foreground" />
            ) : (
              <ShieldAlert className="w-10 h-10 text-primary-foreground" />
            )}
          </div>
        </div>

        <div>
          <h1 className="font-serif text-2xl font-bold mb-2">
            {status === "pending"
              ? lang === "ar" ? "التحقق قيد المراجعة" : "Verification Pending"
              : lang === "ar" ? "تم رفض التحقق" : "Verification Rejected"}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {status === "pending"
              ? lang === "ar"
                ? "حسابك قيد المراجعة. يرجى رفع مستندات التحقق أدناه."
                : "Your account is under review. Please upload your verification documents below."
              : lang === "ar"
                ? "تم رفض طلب التحقق. يرجى إعادة رفع المستندات."
                : "Your verification was rejected. Please re-upload your documents."}
          </p>
        </div>

        {/* File upload area */}
        <div className="space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
          <Button
            variant="gold-outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 me-2" />
            {lang === "ar" ? "اختر الملفات" : "Select Files"}
          </Button>

          {selectedFiles.length > 0 && (
            <div className="space-y-2 text-start">
              {selectedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <FileCheck className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                variant="gold"
                className="w-full"
                onClick={uploadDocs}
                disabled={uploading}
              >
                {uploading
                  ? lang === "ar" ? "جارٍ الرفع..." : "Uploading..."
                  : lang === "ar" ? "إرسال المستندات" : "Submit Documents"}
              </Button>
            </div>
          )}
        </div>

        <Button variant="outline" onClick={() => navigate("/")} className="w-full">
          <ArrowLeft className="w-4 h-4 me-2" />
          {lang === "ar" ? "العودة للرئيسية" : "Back to Home"}
        </Button>

        <p className="text-[10px] text-muted-foreground/60">
          {lang === "ar"
            ? "LOUREX منصة موثقة فقط — يُطلب التحقق من الهوية للوصول الكامل."
            : "LOUREX is a verified-only platform — identity verification is required for full access."}
        </p>
      </motion.div>
    </div>
  );
};

export default VerificationGate;
