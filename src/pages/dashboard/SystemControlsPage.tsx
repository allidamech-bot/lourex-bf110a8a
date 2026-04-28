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
import { SYSTEM_DASHBOARD_UI_ROLES, type LourexRole } from "@/features/auth/rbac";
import { supabase } from "@/integrations/supabase/client";
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
  category: string | null;
  note: string | null;
  created_at: string;
};

const adminDb = supabase as any;

const severityOptions = ["info", "warning", "error", "critical"] as const;

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const getDayKey = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");

const dateTime = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : "Not recorded");

const statusBadgeClass = (value: string) => {
  if (["critical", "rejected", "error"].includes(value)) return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (["warning", "pending"].includes(value)) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (["approved", "ok", "info"].includes(value)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  return "border-border bg-secondary/40 text-muted-foreground";
};

const JsonBlock = ({ value }: { value: unknown }) => (
  <pre className="max-h-56 overflow-auto rounded-xl bg-secondary/30 p-3 text-xs leading-5 text-muted-foreground">
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
    {type === "text" ? <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /> : null}
    <Input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={type === "text" ? "pl-9" : undefined}
    />
  </div>
);

export default function SystemControlsPage() {
  const { profile } = useAuthSession();
  const role = profile?.role;
  const canViewSystem = Boolean(role && SYSTEM_DASHBOARD_UI_ROLES.includes(role));
  const canManageRules = role === "owner";

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
        rulesResult,
        securityResult,
        systemResult,
        healthResult,
        financialRequestsResult,
        financialCorrectionsResult,
      ] = await Promise.all([
        adminDb.from("business_rules").select("*").order("rule_group").order("rule_key"),
        adminDb.from("security_audit_events").select("*").order("created_at", { ascending: false }).limit(200),
        adminDb.from("system_events").select("*").order("created_at", { ascending: false }).limit(200),
        adminDb.from("system_health_snapshots").select("*").order("created_at", { ascending: false }).limit(30),
        adminDb.from("financial_edit_requests").select("*").order("created_at", { ascending: false }).limit(100),
        adminDb
          .from("financial_entries")
          .select("id, entry_number, deal_id, customer_id, amount, currency, category, note, created_at")
          .ilike("entry_number", "FE-CORR-%")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const failed = [
        rulesResult.error,
        securityResult.error,
        systemResult.error,
        healthResult.error,
        financialRequestsResult.error,
        financialCorrectionsResult.error,
      ].find(Boolean);

      if (failed) throw failed;

      const nextRules = (rulesResult.data || []) as BusinessRuleRow[];
      setRules(nextRules);
      setSecurityEvents((securityResult.data || []) as SecurityAuditEventRow[]);
      setSystemEvents((systemResult.data || []) as SystemEventRow[]);
      setHealthSnapshots((healthResult.data || []) as SystemHealthSnapshotRow[]);
      setFinancialRequests((financialRequestsResult.data || []) as FinancialEditRequestRow[]);
      setFinancialCorrections((financialCorrectionsResult.data || []) as FinancialEntryRow[]);
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
      toast.error(error instanceof Error ? error.message : "Failed to load system controls.");
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
      toast.success("Business rule updated.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update business rule.");
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
      toast.error("Rule config must be valid JSON.");
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
      toast.success("System health snapshot captured.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to capture health snapshot.");
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
        title="System controls are restricted"
        description="Only owner and operations employee accounts can view security, rule, audit, and health dashboards."
      />
    );
  }

  return (
    <div className="space-y-5">
      <BentoCard className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary/80">Admin systems</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">Security, Rules, Audit, and Health</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Monitor protected backend systems, review operational events, and manage configurable business rules.
            </p>
          </div>
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricTile icon={SlidersHorizontal} label="Rules" value={rules.length} />
          <MetricTile icon={ShieldCheck} label="Security events" value={securityEvents.length} />
          <MetricTile icon={Activity} label="System events" value={systemEvents.length} />
          <MetricTile icon={Database} label="Health snapshots" value={healthSnapshots.length} />
        </div>
      </BentoCard>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="rules">Business Rules</TabsTrigger>
          <TabsTrigger value="security">Security Audit</TabsTrigger>
          <TabsTrigger value="events">System Events</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="finance">Financial Corrections</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <BentoCard className="space-y-4">
            <SectionHeader
              icon={SlidersHorizontal}
              title="Business Rules Management"
              description={canManageRules ? "Owner controls are enabled." : "Operations accounts can view rules only."}
            />
            <FilterInput value={ruleSearch} onChange={setRuleSearch} placeholder="Search rule key, group, or severity" />
            {loading ? (
              <LoadingRows />
            ) : filteredRules.length === 0 ? (
              <EmptyState icon={SlidersHorizontal} title="No business rules found" description="No matching rules are available." />
            ) : (
              <div className="space-y-3">
                {filteredRules.map((rule) => (
                  <div key={rule.id} className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_220px_minmax(260px,0.9fr)_auto] xl:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-all font-mono text-sm font-semibold">{rule.rule_key}</p>
                          <Badge variant="outline">{rule.rule_group}</Badge>
                          <Badge className={statusBadgeClass(rule.severity)} variant="outline">
                            {rule.severity}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {rule.description || "No description provided."}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">Updated {dateTime(rule.updated_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.enabled}
                          disabled={!canManageRules || savingRuleId === rule.id}
                          onCheckedChange={(checked) => void updateRule(rule, { enabled: checked })}
                        />
                        <span className="text-sm text-muted-foreground">{rule.enabled ? "Enabled" : "Disabled"}</span>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Severity" />
                          </SelectTrigger>
                          <SelectContent>
                            {severityOptions.map((severity) => (
                              <SelectItem key={severity} value={severity}>
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
                          className="font-mono text-xs"
                        />
                      </div>
                      <Button
                        variant="gold"
                        disabled={!canManageRules || savingRuleId === rule.id}
                        onClick={() => void saveRuleDraft(rule)}
                      >
                        {savingRuleId === rule.id ? "Saving" : "Save"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BentoCard>
        </TabsContent>

        <TabsContent value="security">
          <BentoCard className="space-y-4">
            <SectionHeader
              icon={ShieldCheck}
              title="Security Audit Events"
              description="Review security-sensitive RPC actions and protected customer operations."
            />
            <div className="grid gap-3 md:grid-cols-4">
              <FilterInput
                value={securityFilters.action}
                onChange={(value) => setSecurityFilters((current) => ({ ...current, action: value }))}
                placeholder="Action"
              />
              <FilterInput
                value={securityFilters.entity}
                onChange={(value) => setSecurityFilters((current) => ({ ...current, entity: value }))}
                placeholder="Entity type"
              />
              <FilterInput
                value={securityFilters.role}
                onChange={(value) => setSecurityFilters((current) => ({ ...current, role: value }))}
                placeholder="Actor role"
              />
              <FilterInput
                type="date"
                value={securityFilters.date}
                onChange={(value) => setSecurityFilters((current) => ({ ...current, date: value }))}
                placeholder="Date"
              />
            </div>
            <EventList
              loading={loading}
              rows={filteredSecurityEvents}
              emptyTitle="No security audit events found"
              render={(event) => (
                <div key={event.id} className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold">{event.action}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.entity_type}
                        {event.entity_id ? ` / ${event.entity_id}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{event.actor_role || "unknown role"}</Badge>
                      <Badge variant="outline">{dateTime(event.created_at)}</Badge>
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
          <BentoCard className="space-y-4">
            <SectionHeader
              icon={Activity}
              title="System Events"
              description="Inspect application and database events recorded by the observability system."
            />
            <div className="grid gap-3 md:grid-cols-4">
              <Select
                value={systemFilters.severity}
                onValueChange={(value) => setSystemFilters((current) => ({ ...current, severity: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  {severityOptions.map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {severity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FilterInput
                value={systemFilters.source}
                onChange={(value) => setSystemFilters((current) => ({ ...current, source: value }))}
                placeholder="Source"
              />
              <FilterInput
                value={systemFilters.eventType}
                onChange={(value) => setSystemFilters((current) => ({ ...current, eventType: value }))}
                placeholder="Event type"
              />
              <FilterInput
                type="date"
                value={systemFilters.date}
                onChange={(value) => setSystemFilters((current) => ({ ...current, date: value }))}
                placeholder="Date"
              />
            </div>
            <EventList
              loading={loading}
              rows={filteredSystemEvents}
              emptyTitle="No system events found"
              render={(event) => (
                <div key={event.id} className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold">{event.event_type}</p>
                        <Badge className={statusBadgeClass(event.severity)} variant="outline">
                          {event.severity}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{event.message}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{event.source}</Badge>
                      <Badge variant="outline">{dateTime(event.created_at)}</Badge>
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
          <BentoCard className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <SectionHeader
                icon={Database}
                title="System Health Snapshots"
                description="Capture and review lightweight database health counts."
              />
              <Button variant="gold" disabled={capturingHealth} onClick={() => void captureHealthSnapshot()}>
                <ClipboardCheck />
                {capturingHealth ? "Capturing" : "Capture Snapshot"}
              </Button>
            </div>
            {loading ? (
              <LoadingRows />
            ) : healthSnapshots.length === 0 ? (
              <EmptyState icon={Database} title="No health snapshots found" description="Capture a snapshot to start tracking counts." />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {healthSnapshots.map((snapshot) => (
                  <div key={snapshot.id} className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{snapshot.snapshot_type}</Badge>
                        <Badge className={statusBadgeClass(snapshot.status)} variant="outline">
                          {snapshot.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{dateTime(snapshot.created_at)}</span>
                    </div>
                    <JsonBlock value={snapshot.metrics} />
                  </div>
                ))}
              </div>
            )}
          </BentoCard>
        </TabsContent>

        <TabsContent value="finance">
          <BentoCard className="space-y-4">
            <SectionHeader
              icon={FilePenLine}
              title="Financial Edit Requests / Correction History"
              description="Review requested financial corrections and immutable correction entries."
            />
            <div className="max-w-xs">
              <Select value={financeStatusFilter} onValueChange={setFinanceStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? (
              <LoadingRows />
            ) : filteredFinancialRequests.length === 0 && financialCorrections.length === 0 ? (
              <EmptyState
                icon={FilePenLine}
                title="No financial correction history found"
                description="Financial edit requests and correction entries will appear here after the correction workflow is used."
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-serif text-xl font-semibold">Edit Requests</h3>
                  {filteredFinancialRequests.map((request) => (
                    <div key={request.id} className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="break-all font-mono text-sm font-semibold">{request.financial_entry_id || request.id}</p>
                        <Badge className={statusBadgeClass(request.status)} variant="outline">
                          {request.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {request.request_reason || request.reason || "No reason recorded."}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">Created {dateTime(request.created_at)}</p>
                      {request.reviewed_at ? (
                        <p className="mt-1 text-xs text-muted-foreground">Reviewed {dateTime(request.reviewed_at)}</p>
                      ) : null}
                      <div className="mt-3">
                        <JsonBlock value={request.proposed_changes || request.proposed_value} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <h3 className="font-serif text-xl font-semibold">Correction Entries</h3>
                  {financialCorrections.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-sm font-semibold">{entry.entry_number || entry.id}</p>
                        <Badge variant="outline">
                          {entry.amount ?? 0} {entry.currency || ""}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{entry.category || "No category"}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.note || "No note recorded."}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Created {dateTime(entry.created_at)}</p>
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
  <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
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
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h3 className="font-serif text-2xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  </div>
);

const LoadingRows = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <Skeleton key={index} className="h-28 rounded-2xl" />
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
    return <EmptyState icon={AlertTriangle} title={emptyTitle} description="Adjust filters or refresh to check for new records." />;
  }

  return <div className="space-y-3">{rows.map(render)}</div>;
};
