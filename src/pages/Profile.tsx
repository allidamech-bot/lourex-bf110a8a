import { motion } from "framer-motion";
import { BriefcaseBusiness, Crown, Shield, UserCircle2, Users } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AuthStateScreen } from "@/components/auth/AuthStateScreen";
import { SharedAccountPanel } from "@/components/account/SharedAccountPanel";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { getEntityLabel, getRoleDisplayName, getWorkspaceTitle } from "@/lib/identity";
import { useI18n } from "@/lib/i18n";

const roleIcons = {
  owner: Crown,
  saudi_partner: BriefcaseBusiness,
  operations_employee: Shield,
  customer: Users,
} as const;

const Profile = () => {
  const { user, profile, signOut } = useAuthSession();
  const { t } = useI18n();

  if (!profile) {
    return (
      <AuthStateScreen
        variant="missing"
        title={t("auth.missingTitle")}
        description={t("auth.missingDescription")}
        primaryAction={{ label: t("auth.backHome"), to: "/" }}
        secondaryAction={{ label: t("auth.signOut"), onClick: () => void signOut() }}
      />
    );
  }

  const RoleIcon = roleIcons[profile.role as keyof typeof roleIcons] || Users;
  const statusLabel = t(`common.${profile.status}`);
  const roleLabel = getRoleDisplayName(profile.role, t);
  const entityLabel = getEntityLabel(profile, t);
  const workspaceTitle = getWorkspaceTitle(profile, t);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SiteHeader />
      <main className="pb-16 pt-24 relative">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.02),transparent_40%)] pointer-events-none" />
        <div className="container relative mx-auto max-w-4xl px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-serif text-3xl font-bold">
              {t("profile.title")} <span className="text-amber-500">Lourex</span>
            </h1>
            <p className="mt-1 text-sm text-stone-500">{user?.email}</p>
            <p className="mt-2 text-sm font-bold text-amber-200 uppercase tracking-widest">{workspaceTitle}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-200 uppercase tracking-widest shadow-sm">
                <RoleIcon className="h-3.5 w-3.5" />
                {roleLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-800 border border-stone-700 px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest shadow-sm">
                <UserCircle2 className="h-3.5 w-3.5" />
                {statusLabel}
              </span>
              {entityLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-800 border border-stone-700 px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest shadow-sm">
                  {entityLabel}
                </span>
              ) : null}
            </div>
          </motion.div>

          <SharedAccountPanel
            title={t("profile.personalTitle")}
            companyTitle={t("profile.companyTitle")}
            deleteRedirectTo="/"
          />
        </div>
      </main>
    </div>
  );
};

export default Profile;
