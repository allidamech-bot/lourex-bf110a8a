import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ShieldCheck, UserCog, Users } from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDomainActivationStatus,
  loadOperationalUsers,
  updateOperationalUserProfile,
} from "@/lib/operationsDomain";
import { isValidRole, normalizePartnerTypeForRole, type LourexAccountStatus } from "@/features/auth/rbac";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export default function Admin() {
  const { t } = useI18n();
  const [users, setUsers] = useState<Awaited<ReturnType<typeof loadOperationalUsers>>>([]);
  const [activation, setActivation] = useState<Awaited<ReturnType<typeof getDomainActivationStatus>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [usersData, activationData] = await Promise.all([
      loadOperationalUsers(),
      getDomainActivationStatus(),
    ]);
    setUsers(usersData);
    setActivation(activationData);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const internalUsers = useMemo(() => users.filter((user) => user.role !== "customer"), [users]);

  const handleUpdate = async (
    userId: string,
    field: "role" | "status" | "partnerType",
    value: string,
  ) => {
    setSavingId(userId);
    try {
      const payload =
        field === "role"
          ? (() => {
              if (!isValidRole(value)) {
                throw new Error("Invalid role.");
              }

              return { role: value, partnerType: normalizePartnerTypeForRole(value) };
            })()
          : field === "status"
            ? { status: value as LourexAccountStatus }
            : { partnerType: value || null };

      const { error } = await updateOperationalUserProfile(userId, payload);
      if (error) throw error;
      toast.success(t("admin.updated"));
      await refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("admin.updateFailed"));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100">
        <SiteHeader />
        <div className="container mx-auto px-4 py-12 md:px-8">
          <div className="grid gap-4">
            <Skeleton className="h-44 w-full rounded-[2rem] bg-stone-900" />
            <Skeleton className="h-[28rem] w-full rounded-[2rem] bg-stone-900" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <SiteHeader />
      <div className="container mx-auto space-y-4 px-4 py-12 md:px-8 relative">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.02),transparent_40%)] pointer-events-none" />
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr] relative">
          <BentoCard className="border-amber-200/15 bg-stone-900/55 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <p className="whitespace-normal text-[10px] font-bold uppercase tracking-widest text-stone-500">{t("admin.ownerControl")}</p>
                <h1 className="mt-2 font-serif text-3xl font-semibold text-stone-100">{t("admin.title")}</h1>
                <p className="mt-2 text-sm leading-7 text-stone-400 font-medium">{t("admin.description")}</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="border-amber-200/15 bg-stone-900/55 backdrop-blur-xl shadow-2xl">
            <p className="whitespace-normal text-[10px] font-bold uppercase tracking-widest text-stone-500">{t("admin.runtimeStatus")}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: t("admin.requestsMetric"), value: activation?.purchaseRequests || 0 },
                { label: t("admin.customersMetric"), value: activation?.customers || 0 },
                { label: t("admin.entriesMetric"), value: activation?.financialEntries || 0 },
                { label: t("admin.trackingMetric"), value: activation?.trackingUpdates || 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.2rem] border border-amber-200/10 bg-stone-950/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-stone-200">{item.value}</p>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>

        <div className="grid gap-4 md:grid-cols-3 relative">
          {[
            { icon: Users, label: t("admin.internalUsers"), value: internalUsers.length },
            { icon: ShieldCheck, label: t("admin.ownerAccounts"), value: users.filter((user) => user.role === "owner").length },
            { icon: Activity, label: t("admin.partnerAccounts"), value: users.filter((user) => user.role === "saudi_partner" || user.role === "turkish_partner").length },
          ].map((item) => (
            <BentoCard key={item.label} className="border-amber-200/15 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{item.label}</p>
                  <p className="mt-1 text-3xl font-bold text-stone-100">{item.value}</p>
                </div>
              </div>
            </BentoCard>
          ))}
        </div>

        <BentoCard className="space-y-4 border-amber-200/15 bg-stone-900/50 backdrop-blur-xl shadow-2xl relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-stone-100">{t("admin.accessProfiles")}</h2>
              <p className="mt-2 text-sm text-stone-400 font-medium">{t("admin.accessDescription")}</p>
            </div>
            <Button variant="outline" asChild className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
              <Link to="/dashboard">{t("admin.backToDashboard")}</Link>
            </Button>
          </div>

          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="rounded-[1.4rem] border border-amber-200/10 bg-stone-950/40 p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="font-bold text-stone-100 uppercase tracking-tight">{user.fullName || t("admin.noName")}</p>
                    <p className="mt-1 text-sm text-stone-500">{user.email}</p>
                    <p className="mt-1 text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                      {t("admin.updatedAt")}: {new Date(user.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3 xl:min-w-[620px]">
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">{t("common.role")}</label>
                      <select
                        value={user.role}
                        onChange={(event) => handleUpdate(user.id, "role", event.target.value)}
                        className="mt-2 flex h-11 w-full rounded-xl border border-amber-200/10 bg-stone-900/50 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none"
                        disabled={savingId === user.id}
                      >
                        <option value="owner" className="bg-stone-900">owner</option>
                        <option value="turkish_partner" className="bg-stone-900">turkish_partner</option>
                        <option value="saudi_partner" className="bg-stone-900">saudi_partner</option>
                        <option value="operations_employee" className="bg-stone-900">operations_employee</option>
                        <option value="customer" className="bg-stone-900">customer</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">{t("common.status")}</label>
                      <select
                        value={user.status}
                        onChange={(event) => handleUpdate(user.id, "status", event.target.value)}
                        className="mt-2 flex h-11 w-full rounded-xl border border-amber-200/10 bg-stone-900/50 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none"
                        disabled={savingId === user.id}
                      >
                        <option value="active" className="bg-stone-900">active</option>
                        <option value="inactive" className="bg-stone-900">inactive</option>
                        <option value="pending" className="bg-stone-900">pending</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">{t("common.partnerType")}</label>
                      <select
                        value={user.partnerType || ""}
                        onChange={(event) => handleUpdate(user.id, "partnerType", event.target.value)}
                        className="mt-2 flex h-11 w-full rounded-xl border border-amber-200/10 bg-stone-900/50 px-3 py-2 text-sm text-stone-100 focus:ring-amber-500/20 outline-none"
                        disabled={savingId === user.id}
                      >
                        <option value="" className="bg-stone-900">—</option>
                        <option value="turkish" className="bg-stone-900">turkish</option>
                        <option value="saudi" className="bg-stone-900">saudi</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
