import { motion } from "framer-motion";
import { BriefcaseBusiness, Crown, Shield, UserCircle2, Users } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
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
  const { user, profile } = useAuthSession();
  const { t } = useI18n();

  if (!profile) return null;

  const RoleIcon = roleIcons[profile.role as keyof typeof roleIcons] || Users;
  const statusLabel = t(`common.${profile.status}`);
  const roleLabel = getRoleDisplayName(profile.role, t);
  const entityLabel = getEntityLabel(profile, t);
  const workspaceTitle = getWorkspaceTitle(profile, t);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-4xl px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-serif text-3xl font-bold">
              {t("profile.title")} <span className="text-gradient-gold">Lourex</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{workspaceTitle}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                <RoleIcon className="h-3.5 w-3.5" />
                {roleLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                <UserCircle2 className="h-3.5 w-3.5" />
                {statusLabel}
              </span>
              {entityLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
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
