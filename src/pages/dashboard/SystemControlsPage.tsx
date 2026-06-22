import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  Database,
  FilePenLine,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import BentoCard from "@/components/BentoCard";
import { ProductionFallbackCard } from "@/components/production/ProductionFallbacks";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useI18n } from "@/lib/i18n";
import { SYSTEM_DASHBOARD_UI_ROLES, type LourexRole } from "@/features/auth/rbac";
import { isOptionalBackendUnavailable, isSupabaseConfigured, logOptionalBackendUnavailableOnce, optionalBackendUnavailableMessage, supabase, isTableUnavailable, markTableUnavailable, checkOptionalTableAvailable } from "@/integrations/supabase/client";
import type { LooseDomainClient } from "@/lib/operationsDomain";
import { toast } from "sonner";

type JsonRecord = Record<string, unknown>;

type BusinessRuleRow = {
  id: string;
  rule_key: string;
  rule_group: string;
  description: string | null;
  enabled: boolean;
  severity: "info" | "warning" | "error" | "critical";
  config: JsonRecord | null;
  updated_at: string;
};

type SecurityAuditEventRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: JsonRecord | null;
  created_at: string;
};

type SystemEventRow = {
  id: string;
  event_type: string;
  severity: "info" | "warning" | "error" | "critical";
  source: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  metadata: JsonRecord | null;
  created_at: string;
};

type SystemHealthSnapshotRow = {
  id: string;
  snapshot_type: string;
  status: string;
  metrics: JsonRecord | null;
  created_at: string;
};

type FinancialEditRequestRow = {
  id: string;
  financial_entry_id: string | null;
  requested_by: string | null;
  request_reason: string | null;
  reason: string | null;
  proposed_changes: JsonRecord | null;
  proposed_value: JsonRecord | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string | null;
};

type FinancialEntryRow = {
  id: string;
  entry_number: string | null;
  deal_id: string | null;
  customer_id: string | null;
  amount: number | null;
  currency: string | null;
  type: string | null;
  note: string | null;
  created_at: string;
};

const adminDb = supabase as unknown as LooseDomainClient;

const severityOptions = ["info", "warning", "error", "critical"] as const;

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const getDayKey = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");

const optionalTableMessage = "Optional Lovable Cloud table is not configured yet.";

const optionalQuery = async <T,>(
  runner: () => PromiseLike<{ data: T[] | null; error: unknown | null }>,
  feature: string,
) => {
  const isAvailable = await checkOptionalTableAvailable(feature);
  if (!isAvailable) return [] as T[];
  const result = await runner();
  if (result.error) {
    if (isOptionalBackendUnavailable(result.error)) {
      markTableUnavailable(feature);
      logOptionalBackendUnavailableOnce(feature, result.error);
      return [] as T[];
    }
    throw result.error;
  }
  return result.data || [];
};

const statusBadgeClass = (value: string) => {
  if (["critical", "rejected", "error"].includes(value)) return "border-red-500/30 bg-red-500/10 text-red-300";
  if (["warning", "pending"].includes(value)) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (["approved", "ok", "info"].includes(value)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  return "border-amber-200/10 bg-stone-800 text-stone-400";
};

const JsonBlock = ({ value }: { value: unknown }) => (
  <pre className="max-h-56 overflow-auto rounded-xl bg-stone-950/40 border border-amber-200/5 p-3 text-xs leading-5 text-stone-500 font-mono shadow-inner">
    {formatJson(value)}
  </pre>
);

const FilterInput = ({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "date";
}) => (
  <div className="relative">
    {type === "text" ? <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-stone-500" /> : null}
    <Input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`${type === "text" ? "pl-9" : ""} bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20`}
    />
  </div>
);

export default function SystemControlsPage() {
  const { t } = useI18n();
  const { profile } = useAuthSession();
  const role = profile?.role;
  const canViewSystem = Boolean(role && SYSTEM_DASHBOARD_UI_ROLES.includes(role));
  const canManageRules = role === "owner";

  const dateTime = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : t("systemControls.common.notRecorded"));

  const [loading, setLoading] = useState(true);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [capturingHealth, setCapturingHealth] = useState(false);
  const [rules, setRules] = useState<BusinessRuleRow[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityAuditEventRow[]>([]);
  const [systemEvents, setSystemEvents] = useState<SystemEventRow[]>([]);
  const [healthSnapshots, setHealthSnapshots] = useState<SystemHealthSnapshotRow[]>([]);
  const [financialRequests, setFinancialRequests] = useState<FinancialEditRequestRow[]>([]);
  const [financialCorrections, setFinancialCorrections] = useState<FinancialEntryRow[]>([]);
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, { severity: BusinessRuleRow["severity"]; config: string }>>({});

  const [ruleSearch, setRuleSearch] = useState("");
  const [securityFilters, setSecurityFilters] = useState({ action: "", entity: "", role: "", date: "" });
  const [systemFilters, setSystemFilters] = useState({ severity: "all", source: "", eventType: "", date: "" });
  const [financeStatusFilter, setFinanceStatusFilter] = useState("all");

  const refresh = async () => {
    if (!canViewSystem) return;
    setLoading(true);

    try {
      const [
        nextRules,
        nextSecurityEvents,
        nextSystemEvents,
        nextHealthSnapshots,
        nextFinancialRequests,
        nextFinancialCorrections,
      ] = await Promise.all([
        optionalQuery<BusinessRuleRow>(() => adminDb.from("business_rules").select("*").order("rule_group").order("rule_key"), "business_rules"),
        optionalQuery<SecurityAuditEventRow>(() => adminDb.from("security_audit_events").select("*").order("created_at", { ascending: false }).limit(200), "security_audit_events"),
        optionalQuery<SystemEventRow>(() => adminDb.from("system_events").select("*").order("created_at", { ascending: false }).limit(200), "system_events"),
        optionalQuery<SystemHealthSnapshotRow>(() => adminDb.from("system_health_snapshots").select("*").order("created_at", { ascending: false }).limit(30), "system_health_snapshots"),
        optionalQuery<FinancialEditRequestRow>(() => adminDb.from("financial_edit_requests").select("*").order("created_at", { ascending: false }).limit(100), "financial_edit_requests"),
        optionalQuery<FinancialEntryRow>(
          () =>
            adminDb
              .from("financial_entries")
              .select("id, entry_number, deal_id, customer_id, amount, currency, type, note, created_at")
              .ilike("entry_number", "FE-CORR-%")
              .order("created_at", { ascending: false })
              .limit(100),
          "financial_entries",
        ),
      ]);

      setRules(nextRules);
      setSecurityEvents(nextSecurityEvents);
      setSystemEvents(nextSystemEvents);
      setHealthSnapshots(nextHealthSnapshots);
      setFinancialRequests(nextFinancialRequests);
      setFinancialCorrections(nextFinancialCorrections);
      setRuleDrafts(
        nextRules.reduce<Record<string, { severity: BusinessRuleRow["severity"]; config: string }>>((drafts, rule) => {
          drafts[rule.id] = {
            severity: rule.severity,
            config: formatJson(rule.config),
          };
          return drafts;
        }, {}),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("systemControls.toasts.failedToLoadSystemControls"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewSystem]);

  const updateRule = async (rule: BusinessRuleRow, patch: Partial<Pick<BusinessRuleRow, "enabled" | "severity" | "config">>) => {
    if (!canManageRules) {
      toast.error("Only owners can modify business rules.");
      return;
    }

    setSavingRuleId(rule.id);
    try {
      const { error } = await adminDb.from("business_rules").update(patch).eq("id", rule.id);
      if (error) throw error;
      toast.success(t("systemControls.toasts.businessRuleUpdated"));
      await refresh();
    } catch (error) {
      toast.error(isOptionalBackendUnavailable(error) ? optionalBackendUnavailableMessage : error instanceof Error ? error.message : t("systemControls.toasts.failedToUpdateBusinessRule"));
    } finally {
      setSavingRuleId(null);
    }
  };

  const saveRuleDraft = async (rule: BusinessRuleRow) => {
    const draft = ruleDrafts[rule.id];
    if (!draft) return;

    let parsedConfig: JsonRecord;
    try {
      parsedConfig = JSON.parse(draft.config || "{}") as JsonRecord;
    } catch {
      toast.error(t("systemControls.toasts.ruleConfigInvalidJson"));
      return;
    }

    await updateRule(rule, {
      severity: draft.severity,
      config: parsedConfig,
    });
  };

  const captureHealthSnapshot = async () => {
    if (!canViewSystem) return;
    setCapturingHealth(true);
    try {
      const { error } = await adminDb.rpc("capture_system_health_snapshot");
      if (error) throw error;
      toast.success(t("systemControls.toasts.systemHealthSnapshotCaptured"));
      await refresh();
    } catch (error) {
      toast.error(isOptionalBackendUnavailable(error) ? optionalBackendUnavailableMessage : error instanceof Error ? error.message : t("systemControls.toasts.failedToCaptureHealthSnapshot"));
    } finally {
      setCapturingHealth(false);
    }
  };

  const filteredRules = useMemo(() => {
    const query = ruleSearch.trim().toLowerCase();
    if (!query) return rules;
    return rules.filter((rule) =>
      [rule.rule_key, rule.rule_group, rule.severity, rule.description || ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [rules, ruleSearch]);

  const filteredSecurityEvents = useMemo(
    () =>
      securityEvents.filter((event) => {
        const actionMatch = event.action.toLowerCase().includes(securityFilters.action.toLowerCase());
        const entityMatch = event.entity_type.toLowerCase().includes(securityFilters.entity.toLowerCase());
        const roleMatch = (event.actor_role || "").toLowerCase().includes(securityFilters.role.toLowerCase());
        const dateMatch = !securityFilters.date || getDayKey(event.created_at) === securityFilters.date;
        return actionMatch && entityMatch && roleMatch && dateMatch;
      }),
    [securityEvents, securityFilters],
  );

  const filteredSystemEvents = useMemo(
    () =>
      systemEvents.filter((event) => {
        const severityMatch = systemFilters.severity === "all" || event.severity === systemFilters.severity;
        const sourceMatch = event.source.toLowerCase().includes(systemFilters.source.toLowerCase());
        const typeMatch = event.event_type.toLowerCase().includes(systemFilters.eventType.toLowerCase());
        const dateMatch = !systemFilters.date || getDayKey(event.created_at) === systemFilters.date;
        return severityMatch && sourceMatch && typeMatch && dateMatch;
      }),
    [systemEvents, systemFilters],
  );

  const filteredFinancialRequests = useMemo(
    () =>
      financialRequests.filter((request) => financeStatusFilter === "all" || request.status === financeStatusFilter),
    [financialRequests, financeStatusFilter],
  );

  if (!canViewSystem) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t("systemControls.restricted.title")}
        description="Only owner and operations employee accounts can view security, rule, audit, and health dashboards."
      />
    );
  }

  return (
    <div className="space-y-5">
      {!isSupabaseConfigured ? <ProductionFallbackCard kind="backend" /> : null}
      <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="whitespace-normal text-[10px] font-bold uppercase tracking-widest text-amber-500/80">{t("systemControls.hero.eyebrow")}</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-stone-100">{t("systemControls.hero.title")}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400">
              {t("systemControls.hero.description")}
            </p>
          </div>
          <Button variant="outline" onClick={() => void refresh()} disabled={loading} className="border-amber-200/15 bg-stone-50/5 text-stone-100 hover:bg-stone-50/10">
            <RefreshCw className={`me-2 h-4 w-4 ${loading ? "animate-spin text-amber-500" : "text-amber-500"}`} />
            {t("common.refresh")}
          </Button>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
          <MetricTile icon={SlidersHorizontal} label="Rules" value={rules.length} />
          <MetricTile icon={ShieldCheck} label="Security events" value={securityEvents.length} />
          <MetricTile icon={Activity} label="System events" value={systemEvents.length} />
          <MetricTile icon={Database} label="Health snapshots" value={healthSnapshots.length} />
        </div>
      </BentoCard>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start bg-stone-900/50 border border-amber-200/10 p-1">
          <TabsTrigger value="rules" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-200">{t("systemControls.tabs.businessRules")}</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-200">{t("systemControls.tabs.securityAudit")}</TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-200">{t("systemControls.tabs.systemEvents")}</TabsTrigger>
          <TabsTrigger value="health" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-200">{t("systemControls.tabs.health")}</TabsTrigger>
          <TabsTrigger value="finance" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-200">{t("systemControls.tabs.financialCorrections")}</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
            <SectionHeader
              icon={SlidersHorizontal}
              title={t("systemControls.rules.title")}
              description={canManageRules ? "Owner controls are enabled." : "Operations accounts can view rules only."}
            />
            <FilterInput value={ruleSearch} onChange={setRuleSearch} placeholder={t("systemControls.rules.searchPlaceholder")} />
            {loading ? (
              <LoadingRows />
            ) : filteredRules.length === 0 ? (
              <EmptyState icon={SlidersHorizontal} title={t("systemControls.rules.emptyTitle")} description={t("systemControls.rules.emptyDescription")} className="bg-transparent border-0" />
            ) : (
              <div className="space-y-3">
                {filteredRules.map((rule) => (
                  <div key={rule.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_220px_minmax(260px,0.9fr)_auto] xl:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words font-mono text-sm font-semibold text-amber-200 [overflow-wrap:anywhere]">{rule.rule_key}</p>
                          <Badge variant="outline" className="border-stone-700 text-stone-500 font-bold uppercase tracking-widest text-[10px]">{rule.rule_group}</Badge>
                          <Badge className={statusBadgeClass(rule.severity)} variant="outline">
                            {rule.severity}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-stone-400 font-medium">
                          {rule.description || t("systemControls.rules.noDescription")}
                        </p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-600">{t("systemControls.common.updated")} {dateTime(rule.updated_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.enabled}
                          disabled={!canManageRules || savingRuleId === rule.id}
                          onCheckedChange={(checked) => void updateRule(rule, { enabled: checked })}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{rule.enabled ? t("systemControls.rules.enabled") : t("systemControls.rules.disabled")}</span>
                      </div>
                      <div className="space-y-3">
                        <Select
                          disabled={!canManageRules || savingRuleId === rule.id}
                          value={ruleDrafts[rule.id]?.severity || rule.severity}
                          onValueChange={(value) =>
                            setRuleDrafts((current) => ({
                              ...current,
                              [rule.id]: {
                                severity: value as BusinessRuleRow["severity"],
                                config: current[rule.id]?.config || formatJson(rule.config),
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20 outline-none">
                          <SelectValue placeholder={t("systemControls.common.severity")} />
                          </SelectTrigger>
                          <SelectContent className="bg-stone-900 border-amber-200/15 text-stone-100">
                            {severityOptions.map((severity) => (
                              <SelectItem key={severity} value={severity} className="focus:bg-stone-800 focus:text-stone-100 cursor-pointer uppercase text-xs font-bold">
                                {severity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Textarea
                          rows={6}
                          disabled={!canManageRules || savingRuleId === rule.id}
                          value={ruleDrafts[rule.id]?.config || formatJson(rule.config)}
                          onChange={(event) =>
                            setRuleDrafts((current) => ({
                              ...current,
                              [rule.id]: {
                                severity: current[rule.id]?.severity || rule.severity,
                                config: event.target.value,
                              },
                            }))
                          }
                          className="font-mono text-xs bg-stone-950/40 border-amber-200/10 text-stone-300 focus:ring-amber-500/20"
                        />
                      </div>
                      <Button
                        variant="gold"
                        disabled={!canManageRules || savingRuleId === rule.id}
                        onClick={() => void saveRuleDraft(rule)}
                        className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110"
                      >
                        {savingRuleId === rule.id ? t("systemControls.rules.saving") : t("common.save")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BentoCard>
        </TabsContent>

        <TabsContent value="security">
          <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
            <SectionHeader
              icon={ShieldCheck}
              title={t("systemControls.security.title")}
              description={t("systemControls.security.description")}
            />
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
               <FilterInput
                 value={securityFilters.action}
                 onChange={(value) => setSecurityFilters((current) => ({ ...current, action: value }))}
                 placeholder={t("systemControls.security.filterAction")}
               />
               <FilterInput
                 value={securityFilters.entity}
                 onChange={(value) => setSecurityFilters((current) => ({ ...current, entity: value }))}
                 placeholder={t("systemControls.security.filterEntity")}
               />
               <FilterInput
                 value={securityFilters.role}
                 onChange={(value) => setSecurityFilters((current) => ({ ...current, role: value }))}
                 placeholder={t("systemControls.security.filterRole")}
               />
               <FilterInput
                 type="date"
                 value={securityFilters.date}
                 onChange={(value) => setSecurityFilters((current) => ({ ...current, date: value }))}
                 placeholder={t("common.date")}
               />
            </div>
            <EventList
              loading={loading}
              rows={filteredSecurityEvents}
              emptyTitle={t("systemControls.security.emptyTitle")}
              render={(event) => (
                <div key={event.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold text-amber-200 uppercase tracking-tight">{event.action}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                        {event.entity_type}
                        {event.entity_id ? ` / ${event.entity_id}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-stone-700 text-stone-500 font-bold uppercase tracking-widest text-[10px]">{event.actor_role || "unknown role"}</Badge>
                      <Badge variant="outline" className="border-stone-700 text-stone-500 font-bold uppercase tracking-widest text-[10px]">{dateTime(event.created_at)}</Badge>
                    </div>
                  </div>
                  <div className="mt-4">
                    <JsonBlock value={event.metadata} />
                  </div>
                </div>
              )}
            />
          </BentoCard>
        </TabsContent>

        <TabsContent value="events">
          <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
            <SectionHeader
              icon={Activity}
              title={t("systemControls.events.title")}
              description={t("systemControls.events.description")}
            />
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
              <Select
                value={systemFilters.severity}
                onValueChange={(value) => setSystemFilters((current) => ({ ...current, severity: value }))}
              >
                <SelectTrigger className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20 outline-none">
                  <SelectValue placeholder={t("systemControls.common.severity")} />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-200/15 text-stone-100">
                   <SelectItem value="all" className="focus:bg-stone-800 focus:text-stone-100 cursor-pointer uppercase text-xs font-bold">{t("systemControls.events.allSeverities")}</SelectItem>
                  {severityOptions.map((severity) => (
                    <SelectItem key={severity} value={severity} className="focus:bg-stone-800 focus:text-stone-100 cursor-pointer uppercase text-xs font-bold">
                      {severity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FilterInput
                value={systemFilters.source}
                onChange={(value) => setSystemFilters((current) => ({ ...current, source: value }))}
                placeholder={t("systemControls.events.filterSource")}
              />
              <FilterInput
                value={systemFilters.eventType}
                onChange={(value) => setSystemFilters((current) => ({ ...current, eventType: value }))}
                placeholder={t("systemControls.events.filterEventType")}
              />
              <FilterInput
                type="date"
                value={systemFilters.date}
                onChange={(value) => setSystemFilters((current) => ({ ...current, date: value }))}
                placeholder={t("common.date")}
              />
            </div>
            <EventList
              loading={loading}
              rows={filteredSystemEvents}
              emptyTitle={t("systemControls.events.emptyTitle")}
              render={(event) => (
                <div key={event.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-stone-200">{event.event_type}</p>
                        <Badge className={statusBadgeClass(event.severity)} variant="outline">
                          {event.severity}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-stone-400 font-medium">{event.message}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-stone-700 text-stone-500 font-bold uppercase tracking-widest text-[10px]">{event.source}</Badge>
                      <Badge variant="outline" className="border-stone-700 text-stone-500 font-bold uppercase tracking-widest text-[10px]">{dateTime(event.created_at)}</Badge>
                    </div>
                  </div>
                  <div className="mt-4">
                    <JsonBlock value={event.metadata} />
                  </div>
                </div>
              )}
            />
          </BentoCard>
        </TabsContent>

        <TabsContent value="health">
          <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeader
                icon={Database}
                title={t("systemControls.health.title")}
                description={t("systemControls.health.description")}
              />
              <Button variant="gold" disabled={capturingHealth} onClick={() => void captureHealthSnapshot()} className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-700 font-bold text-stone-950 shadow-2xl hover:brightness-110">
                <ClipboardCheck className="me-2 h-4 w-4" />
                {capturingHealth ? t("systemControls.health.capturing") : t("systemControls.health.captureSnapshot")}
              </Button>
            </div>
            {loading ? (
              <LoadingRows />
            ) : healthSnapshots.length === 0 ? (
              <EmptyState icon={Database} title={t("systemControls.health.emptyTitle")} description={t("systemControls.health.emptyDescription")} className="bg-transparent border-0" />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {healthSnapshots.map((snapshot) => (
                  <div key={snapshot.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-stone-700 text-stone-500 font-bold uppercase tracking-widest text-[10px]">{snapshot.snapshot_type}</Badge>
                        <Badge className={statusBadgeClass(snapshot.status)} variant="outline">
                          {snapshot.status}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{dateTime(snapshot.created_at)}</span>
                    </div>
                    <JsonBlock value={snapshot.metrics} />
                  </div>
                ))}
              </div>
            )}
          </BentoCard>
        </TabsContent>

        <TabsContent value="finance">
          <BentoCard className="space-y-4 border-amber-200/10 bg-stone-900/50 backdrop-blur-xl shadow-2xl">
            <SectionHeader
              icon={FilePenLine}
              title={t("systemControls.finance.title")}
              description="Review requested financial corrections and immutable correction entries."
            />
            <div className="max-w-xs">
              <Select value={financeStatusFilter} onValueChange={setFinanceStatusFilter}>
                <SelectTrigger className="bg-stone-950/40 border-amber-200/10 text-stone-100 focus:ring-amber-500/20 outline-none">
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-200/15 text-stone-100">
                  <SelectItem value="all" className="focus:bg-stone-800 focus:text-stone-100 cursor-pointer uppercase text-xs font-bold">{t("systemControls.finance.allStatuses")}</SelectItem>
                  <SelectItem value="pending" className="focus:bg-stone-800 focus:text-stone-100 cursor-pointer uppercase text-xs font-bold">Pending</SelectItem>
                  <SelectItem value="approved" className="focus:bg-stone-800 focus:text-stone-100 cursor-pointer uppercase text-xs font-bold">Approved</SelectItem>
                  <SelectItem value="rejected" className="focus:bg-stone-800 focus:text-stone-100 cursor-pointer uppercase text-xs font-bold">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? (
              <LoadingRows />
            ) : filteredFinancialRequests.length === 0 && financialCorrections.length === 0 ? (
              <EmptyState
                icon={FilePenLine}
                title={t("systemControls.finance.emptyTitle")}
                description={t("systemControls.finance.emptyDescription")}
                className="bg-transparent border-0"
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-serif text-xl font-semibold text-stone-100">{t("systemControls.finance.editRequestsTitle")}</h3>
                  {filteredFinancialRequests.map((request) => (
                    <div key={request.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="break-words font-mono text-sm font-semibold text-stone-200 [overflow-wrap:anywhere]">{request.financial_entry_id || request.id}</p>
                        <Badge className={statusBadgeClass(request.status)} variant="outline">
                          {request.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-stone-400 font-medium">
                        {request.request_reason || request.reason || t("systemControls.finance.noReason")}
                      </p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-600">{t("systemControls.common.created")} {dateTime(request.created_at)}</p>
                        {request.reviewed_at ? (
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-stone-600">{t("systemControls.common.reviewed")} {dateTime(request.reviewed_at)}</p>
                        ) : null}
                      <div className="mt-3">
                        <JsonBlock value={request.proposed_changes || request.proposed_value} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <h3 className="font-serif text-xl font-semibold text-stone-100">{t("systemControls.finance.correctionEntriesTitle")}</h3>
                  {financialCorrections.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-sm font-semibold text-amber-200">{entry.entry_number || entry.id}</p>
                        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-300 font-bold">
                          {entry.amount ?? 0} {entry.currency || ""}
                        </Badge>
                      </div>
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">{entry.type || t("systemControls.finance.noCategory")}</p>
                          <p className="mt-2 text-sm leading-7 text-stone-400 font-medium">{entry.note || t("systemControls.finance.noNote")}</p>
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-stone-600">Created {dateTime(entry.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </BentoCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const MetricTile = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
}) => (
  <div className="rounded-2xl border border-amber-200/10 bg-stone-950/40 p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{label}</p>
        <p className="text-xl font-bold text-stone-200">{value}</p>
      </div>
    </div>
  </div>
);

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h3 className="font-serif text-2xl font-semibold text-stone-100">{title}</h3>
      <p className="mt-1 text-sm leading-7 text-stone-500 font-medium">{description}</p>
    </div>
  </div>
);

const LoadingRows = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <Skeleton key={index} className="h-28 rounded-2xl bg-stone-950/40" />
    ))}
  </div>
);

const EventList = <T,>({
  loading,
  rows,
  emptyTitle,
  render,
}: {
  loading: boolean;
  rows: T[];
  emptyTitle: string;
  render: (row: T) => JSX.Element;
}) => {
  if (loading) return <LoadingRows />;
  if (rows.length === 0) {
    return <EmptyState icon={AlertTriangle} title={emptyTitle} description={t("systemControls.common.adjustFilters")} />;
  }

  return <div className="space-y-3">{rows.map(render)}</div>;
};
