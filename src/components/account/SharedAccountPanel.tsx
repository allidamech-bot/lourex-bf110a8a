import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Building2, Trash2, Save, Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BentoCard from "@/components/BentoCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { logOperationalError } from "@/lib/monitoring";

interface SharedAccountPanelProps {
  title?: string;
  companyTitle?: string;
  deleteRedirectTo?: string;
}

interface ProfileState {
  full_name: string;
  company_name: string;
  phone: string;
  country: string;
  avatar_url: string;
}

const initialProfile: ProfileState = {
  full_name: "",
  company_name: "",
  phone: "",
  country: "",
  avatar_url: "",
};

const AvatarUploadSection = ({ avatarUrl, onUploaded }: { avatarUrl: string; onUploaded: (url: string) => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { t } = useI18n();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t("account.sessionExpired"));
      setUploading(false);
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      logOperationalError("account_avatar_upload", error);
      toast.error(t("account.avatarUploadError"));
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    onUploaded(urlData.publicUrl);
    toast.success(t("account.avatarUploaded"));
    setUploading(false);
  };

  return (
    <div className="mb-4 flex items-center gap-4">
      <div
        className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary transition-colors hover:border-primary/50"
        onClick={() => fileRef.current?.click()}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 space-y-1">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? t("account.uploading") : t("account.uploadPhoto")}
        </Button>
        <p className="text-[10px] text-muted-foreground">{t("account.photoHint")}</p>
      </div>
    </div>
  );
};

export const SharedAccountPanel = ({
  title = "Account Settings",
  companyTitle = "Company Profile",
  deleteRedirectTo = "/",
}: SharedAccountPanelProps) => {
  const { t } = useI18n();
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("account.sessionExpired"));
        setLoading(false);
        return;
      }

      setEmail(user.email || "");
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, company_name, phone, country, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        logOperationalError("account_profile_load", error);
        toast.error(t("account.loadError"));
      }

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          company_name: data.company_name || "",
          phone: data.phone || "",
          country: data.country || "",
          avatar_url: data.avatar_url || "",
        });
      }

      setLoading(false);
    };

    void load();
  }, []);

  const canDelete = useMemo(() => deleteConfirm === "DELETE", [deleteConfirm]);

  const handleSave = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t("account.sessionExpired"));
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        company_name: profile.company_name,
        phone: profile.phone,
        country: profile.country,
        avatar_url: profile.avatar_url,
      })
      .eq("id", user.id);

    if (error) {
      logOperationalError("account_profile_update", error);
      toast.error(t("account.updateError"));
    } else {
      toast.success(t("account.updated"));
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (!canDelete) {
      toast.error(t("account.deleteConfirm"));
      return;
    }

    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-account", { body: {} });

    if (error) {
      logOperationalError("account_delete", error);
      toast.error(t("account.deleteError"));
      setDeleting(false);
      return;
    }

    await supabase.auth.signOut();
    toast.success(t("account.deleteSuccess"));
    window.location.href = deleteRedirectTo;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <BentoCard>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{t("account.personalSubtitle")}</p>
          </div>
        </div>

        <AvatarUploadSection avatarUrl={profile.avatar_url} onUploaded={(url) => setProfile({ ...profile, avatar_url: url })} />

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">{t("account.fullName")}</label>
              <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="border-border bg-secondary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">{t("common.email")}</label>
              <Input value={email} disabled className="border-border bg-secondary/50 opacity-60" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">{t("common.phone")}</label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="border-border bg-secondary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">{t("common.country")}</label>
              <Input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} className="border-border bg-secondary" />
            </div>
          </div>
        </div>
      </BentoCard>

      <BentoCard>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold">{companyTitle}</h3>
            <p className="text-xs text-muted-foreground">{t("account.companySubtitle")}</p>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">{t("account.companyName")}</label>
          <Input
            value={profile.company_name}
            onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
            className="border-border bg-secondary"
            placeholder={t("account.companyPlaceholder")}
          />
        </div>
      </BentoCard>

      <Button variant="gold" onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? t("common.saving") : t("account.saveChanges")}
      </Button>

      <BentoCard className="border-destructive/30">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-destructive">{t("account.deleteTitle")}</h3>
            <p className="text-xs text-muted-foreground">{t("account.deleteSubtitle")}</p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" /> {t("account.deleteButton")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif">{t("account.deleteModalTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("account.deleteModalDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={t("account.deletePlaceholder")}
              className="border-border bg-secondary"
            />
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={!canDelete || deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? t("account.deleting") : t("account.deleteForever")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </BentoCard>
    </div>
  );
};
