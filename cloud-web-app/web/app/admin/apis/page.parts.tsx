"use client";

import { AlertTriangle, CheckCircle, LayoutGrid, Trash2 } from "lucide-react";
import { AdminSummaryGrid } from "@/components/admin/AdminSummaryGrid";

export type Integration = {
  id: string;
  name: string;
  envKey: string;
  configured: boolean;
};

export type BillingRuntimeSnapshot = {
  status: "ready" | "partial" | "unavailable" | string;
  checkoutReady: boolean;
  portalReady?: boolean;
  webhookReady?: boolean;
  provider?: {
    id: string;
    label: string;
    setupEnv: string[];
    webhookPath?: string | null;
  };
  stripe?: {
    publishableKeyConfigured: boolean;
    configuredPriceCount: number;
    requiredPriceCount: number;
    missingEnv: string[];
  };
};

export type ProductionRuntimeSnapshot = {
  runtimeReadiness?: {
    envLocalPresent: boolean;
    databaseConfigured: boolean;
    databaseReachable: boolean;
    databaseTarget?: string | null;
    appRuntimeReachable?: boolean;
    appBaseUrl?: string | null;
    jwtConfigured: boolean;
    csrfConfigured: boolean;
    dockerCliPresent: boolean;
    dockerDaemonReady: boolean;
    authReady: boolean;
    probeReady: boolean;
    blockers: string[];
    instructions: string[];
    recommendedCommands: string[];
  };
};

export type PreviewRuntimeSnapshot = {
  status?: "ready" | "partial" | string;
  strategy?: "managed" | "local" | "inline" | string;
  managedProviderLabel?: string | null;
  managedProviderMode?: "route-managed" | "browser-side" | "unknown" | string;
  routeProvisionSupported?: boolean;
  preferredRuntimeUrl?: string | null;
  blockers?: string[];
  instructions?: string[];
  recommendedCommands?: string[];
};

export type OperatorReadinessSnapshot = {
  status: "ready" | "partial" | string;
  blockers: string[];
  instructions: string[];
  recommendedCommands: string[];
  checks: {
    billingRuntime: BillingRuntimeSnapshot;
    previewRuntime: PreviewRuntimeSnapshot;
    productionRuntime: NonNullable<ProductionRuntimeSnapshot["runtimeReadiness"]>;
  };
};

export type CompatibilityRouteMetric = {
  route: string;
  replacement: string;
  status: "deprecated" | "compatibility-wrapper";
  hits: number;
  lastHitAt: string;
  deprecatedSince?: string;
  removalCycleTarget?: string;
  deprecationPolicy?: string;
  candidateForRemoval?: boolean;
  silenceDays?: number;
};

export type StatusFilter = "all" | "configured" | "missing";

export function isAIProviderIntegration(integration: Integration) {
  const name = integration.name.toLowerCase();
  const key = integration.envKey.toLowerCase();
  return (
    name.includes("openai") ||
    name.includes("anthropic") ||
    name.includes("gemini") ||
    name.includes("google") ||
    name.includes("groq") ||
    key.includes("openai") ||
    key.includes("anthropic") ||
    key.includes("gemini") ||
    key.includes("google") ||
    key.includes("groq")
  );
}

function ShellCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
      <h2 className="text-sm font-semibold text-[var(--aethel-text-secondary)]">{title}</h2>
      {children}
    </section>
  );
}

function StatusRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "success" | "warning" | "neutral";
}) {
  const toneClass = tone === "success" ? "text-[var(--aethel-success)]" : tone === "warning" ? "text-[var(--aethel-warning)]" : "text-[var(--aethel-text-secondary)]";
  return (
    <div className="flex items-center justify-between rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 px-3 py-2">
      <span className="text-[var(--aethel-text-secondary)]">{label}</span>
      <span className={toneClass}>{value}</span>
    </div>
  );
}

function RuntimeUnavailable({ label }: { label: string }) {
  return (
    <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 px-3 py-2 text-xs text-[var(--aethel-text-secondary)]">
      {label} readiness unavailable.
    </div>
  );
}

function TokenList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {items.map((item) => (
        <span key={item} className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] px-2 py-1 text-[11px] text-[var(--aethel-text-secondary)]">
          {item}
        </span>
      ))}
    </div>
  );
}

function InstructionList({ instructions }: { instructions?: string[] }) {
  if (!instructions?.length) return null;
  return (
    <ul className="space-y-1 rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 px-3 py-2 text-[var(--aethel-text-secondary)]">
      {instructions.map((instruction) => (
        <li key={instruction}>- {instruction}</li>
      ))}
    </ul>
  );
}

function Blockers({ blockers }: { blockers?: string[] }) {
  if (!blockers?.length) return null;
  return (
    <div className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-2 text-[var(--aethel-warning-light)]">
      Blockers: {blockers.join(", ")}
    </div>
  );
}

export function AdminApisHeader({ lastUpdated, onRefresh }: { lastUpdated: Date | null; onRefresh: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">API Management</h1>
        <p className="text-[var(--aethel-text-secondary)]">Operational status for external providers and environment keys.</p>
        {lastUpdated ? <p className="text-xs text-[var(--aethel-text-tertiary)]">Updated at {lastUpdated.toLocaleString()}</p> : null}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh integration status"
        className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_80%,transparent)]"
      >
        Refresh
      </button>
    </div>
  );
}

export function AdminApisNotice({ error, statusMessage }: { error: string | null; statusMessage: string | null }) {
  if (error) {
    return (
      <div className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] p-4 text-[var(--aethel-error-light)]" role="alert" aria-live="polite">
        {error}
      </div>
    );
  }
  if (!statusMessage) return null;
  return (
    <div className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] p-4 text-[var(--aethel-success-light)]" role="status" aria-live="polite">
      {statusMessage}
    </div>
  );
}

export function AIProviderSetupNotice({ providers }: { providers: Integration[] }) {
  if (providers.length === 0) return null;
  return (
    <div className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--aethel-warning-light)]">AI provider setup pending</p>
          <p className="text-xs text-[var(--aethel-warning-light)]/90">Configure at least one provider to unblock chat, completion, and inline edit capabilities.</p>
        </div>
        <span className="inline-flex rounded bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] px-2 py-1 text-xs text-[var(--aethel-warning-light)]">
          {providers.length} pending
        </span>
      </div>
      <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-[var(--aethel-warning-light)]/90">
        <li>Store the provider key in the secure runtime environment, never in client code.</li>
        <li>Restart the application runtime so environment variables are applied.</li>
        <li>Refresh this page and verify the configured status.</li>
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {providers.map((provider) => (
          <span key={provider.id} className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[var(--aethel-warning-light)]/10 px-2 py-1 text-xs text-[var(--aethel-warning-light)]">
            {provider.name} ({provider.envKey})
          </span>
        ))}
      </div>
    </div>
  );
}

export function AIProviderQuickCheck({ hasConfiguredProvider }: { hasConfiguredProvider: boolean }) {
  return (
    <ShellCard title="AI Provider Setup Quick Check">
      <div className="mt-3 space-y-2 text-xs">
        <StatusRow label="1. At least one provider configured" value={hasConfiguredProvider ? "OK" : "PENDING"} tone={hasConfiguredProvider ? "success" : "warning"} />
        <StatusRow label="2. Runtime restarted after environment changes" value="manual" />
        <StatusRow label="3. Endpoint validation (`/api/ai/chat-advanced`)" value="use /ide chat" />
      </div>
    </ShellCard>
  );
}

export function ProductionRuntimeQuickCheck({ runtime }: { runtime: ProductionRuntimeSnapshot | null }) {
  const readiness = runtime?.runtimeReadiness;
  return (
    <ShellCard title="Production Runtime Quick Check">
      {readiness ? (
        <div className="mt-3 space-y-2 text-xs">
          <StatusRow label="Probe readiness" value={readiness.probeReady ? "READY" : "BLOCKED"} tone={readiness.probeReady ? "success" : "warning"} />
          <StatusRow label="DB / app runtime" value={`${readiness.databaseReachable ? "db-ok" : "db-blocked"} / ${readiness.appRuntimeReachable ? "app-ok" : "app-blocked"}`} />
          <StatusRow label="Docker / auth" value={`${readiness.dockerDaemonReady ? "docker-ok" : "docker-blocked"} / ${readiness.authReady ? "auth-ok" : "auth-blocked"}`} />
          {readiness.databaseTarget ? <StatusRow label="Database target" value={readiness.databaseTarget} /> : null}
          {readiness.appBaseUrl ? <StatusRow label="App base URL" value={readiness.appBaseUrl} /> : null}
          <Blockers blockers={readiness.blockers} />
          <InstructionList instructions={readiness.instructions} />
          <TokenList items={readiness.recommendedCommands} />
        </div>
      ) : (
        <RuntimeUnavailable label="Production runtime" />
      )}
    </ShellCard>
  );
}

export function BillingRuntimeQuickCheck({ runtime }: { runtime: BillingRuntimeSnapshot | null }) {
  return (
    <ShellCard title="Billing Runtime Quick Check">
      {runtime ? (
        <div className="mt-3 space-y-2 text-xs">
          <StatusRow label="Runtime status" value={String(runtime.status).toUpperCase()} tone={runtime.status === "ready" ? "success" : "warning"} />
          <StatusRow label="Provider" value={runtime.provider?.label || "unknown"} />
          <StatusRow label="Checkout / Portal / Webhook" value={`${Boolean(runtime.checkoutReady)} / ${Boolean(runtime.portalReady)} / ${Boolean(runtime.webhookReady)}`} />
          <StatusRow label="Publishable key / price coverage" value={`${Boolean(runtime.stripe?.publishableKeyConfigured)} / ${runtime.stripe?.configuredPriceCount || 0}/${runtime.stripe?.requiredPriceCount || 0}`} />
          {runtime.provider?.webhookPath ? <StatusRow label="Webhook path" value={runtime.provider.webhookPath} /> : null}
          <TokenList items={runtime.provider?.setupEnv} />
          {runtime.stripe?.missingEnv?.length ? <Blockers blockers={[`Missing env: ${runtime.stripe.missingEnv.join(", ")}`]} /> : null}
        </div>
      ) : (
        <RuntimeUnavailable label="Billing runtime" />
      )}
    </ShellCard>
  );
}

export function PreviewRuntimeQuickCheck({ runtime }: { runtime: PreviewRuntimeSnapshot | null }) {
  return (
    <ShellCard title="Preview Runtime Quick Check">
      {runtime ? (
        <div className="mt-3 space-y-2 text-xs">
          <StatusRow label="Runtime status" value={String(runtime.status || "unknown").toUpperCase()} tone={runtime.status === "ready" ? "success" : "warning"} />
          <StatusRow label="Strategy" value={runtime.strategy || "unknown"} />
          <StatusRow label="Provider / mode" value={`${runtime.managedProviderLabel || "none"} / ${runtime.managedProviderMode || "unknown"}`} />
          <StatusRow label="Route provisioning" value={String(Boolean(runtime.routeProvisionSupported))} />
          {runtime.preferredRuntimeUrl ? <StatusRow label="Preferred runtime" value={runtime.preferredRuntimeUrl} /> : null}
          <Blockers blockers={runtime.blockers} />
          <InstructionList instructions={runtime.instructions} />
          <TokenList items={runtime.recommendedCommands} />
        </div>
      ) : (
        <RuntimeUnavailable label="Preview runtime" />
      )}
    </ShellCard>
  );
}

export function OperatorReadinessAggregate({ readiness }: { readiness: OperatorReadinessSnapshot | null }) {
  if (!readiness) return null;
  return (
    <ShellCard title="Operator Readiness Aggregate">
      <div className="mt-3 space-y-2 text-xs">
        <StatusRow label="Aggregate status" value={String(readiness.status).toUpperCase()} tone={readiness.status === "ready" ? "success" : "warning"} />
        <Blockers blockers={readiness.blockers} />
        <InstructionList instructions={readiness.instructions} />
        <TokenList items={readiness.recommendedCommands} />
      </div>
    </ShellCard>
  );
}

export function IntegrationSummary({ total, configured, missing, removalCandidates }: { total: number; configured: number; missing: number; removalCandidates: number }) {
  return (
    <AdminSummaryGrid
      className="mb-6"
      columns={4}
      items={[
        { icon: LayoutGrid, label: "Total", value: total },
        { icon: CheckCircle, label: "Configured", value: configured, tone: "success" },
        { icon: AlertTriangle, label: "Missing", value: missing, tone: "warning" },
        { icon: Trash2, label: "Cutoff candidates", value: removalCandidates, tone: "info" },
      ]}
    />
  );
}

export function IntegrationToolbar({ search, statusFilter, onSearch, onStatusFilter }: { search: string; statusFilter: StatusFilter; onSearch: (value: string) => void; onStatusFilter: (value: StatusFilter) => void }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 shadow md:flex-row md:items-center md:justify-between">
      <input
        type="text"
        placeholder="Search by name or environment key"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        aria-label="Search integrations by name or environment key"
        className="w-full rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] p-2 text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] md:max-w-sm"
      />
      <div className="flex items-center gap-2">
        {(["all", "configured", "missing"] as const).map((status) => (
          <button
            type="button"
            key={status}
            onClick={() => onStatusFilter(status)}
            aria-pressed={statusFilter === status}
            className={`rounded px-3 py-1 text-xs font-semibold ${statusFilter === status ? "bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]" : "bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]"}`}
          >
            {status === "all" ? "All" : status === "configured" ? "Configured" : "Missing"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function IntegrationsTable({ loading, integrations, error }: { loading: boolean; integrations: Integration[]; error: string | null }) {
  return (
    <>
      <table className="w-full table-auto overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] shadow" aria-busy={loading}>
        <thead>
          <tr className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-sm">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Key</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Environment</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="p-2" colSpan={4}>
                <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-xs text-[var(--aethel-text-secondary)]">
                  <p className="mb-2 text-sm font-semibold text-[var(--aethel-text-primary)]">Loading integrations...</p>
                  <div className="space-y-1.5">
                    <div className="h-3 w-full animate-pulse rounded bg-[var(--aethel-surface-tertiary)]" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--aethel-surface-tertiary)]" />
                  </div>
                </div>
              </td>
            </tr>
          ) : integrations.length !== 0 ? (
            integrations.map((integration) => (
              <tr key={integration.id} className="border-t border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)]">
                <td className="p-2">{integration.name}</td>
                <td className="p-2 text-xs text-[var(--aethel-text-secondary)]">{integration.configured ? "configured (masked)" : "not configured"}</td>
                <td className="p-2">
                  <span className={`rounded px-2 py-1 text-xs ${integration.configured ? "bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]" : "bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]"}`}>
                    {integration.configured ? "Configured" : "Missing"}
                  </span>
                </td>
                <td className="p-2 text-xs text-[var(--aethel-text-tertiary)]">{integration.envKey}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="p-2 text-center text-[var(--aethel-text-tertiary)]" colSpan={4}>No integrations found</td>
            </tr>
          )}
        </tbody>
      </table>
      {!loading && integrations.length === 0 && !error ? (
        <div className="mt-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-tertiary)]">
          No integration matches the current filter.
        </div>
      ) : null}
      <p className="mt-4 text-xs text-[var(--aethel-text-tertiary)]">Expected operation: configured status must reflect a valid runtime environment key and provider availability.</p>
    </>
  );
}

export function CompatibilityRoutesPanel({ compatError, loading, routes, removalCandidates }: { compatError: string | null; loading: boolean; routes: CompatibilityRouteMetric[]; removalCandidates: string[] }) {
  return (
    <div className="mt-6 rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Route Deprecation (2 cycles)</h2>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">Operational telemetry</span>
      </div>
      {compatError ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] p-4 text-sm text-[var(--aethel-error-light)]" role="alert" aria-live="polite">{compatError}</div>
      ) : loading ? (
        <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-xs text-[var(--aethel-text-secondary)]">
          <p className="mb-2 text-sm font-semibold text-[var(--aethel-text-primary)]">Loading deprecation metrics...</p>
          <div className="space-y-1.5">
            <div className="h-3 w-full animate-pulse rounded bg-[var(--aethel-surface-tertiary)]" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--aethel-surface-tertiary)]" />
          </div>
        </div>
      ) : routes.length === 0 ? (
        <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-xs text-[var(--aethel-text-tertiary)]">No legacy route events recorded for the current period.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] text-[var(--aethel-text-secondary)]">
                <th className="p-2 text-left">Route</th>
                <th className="p-2 text-left">Replacement</th>
                <th className="p-2 text-left">Hits</th>
                <th className="p-2 text-left">Last hit</th>
                <th className="p-2 text-left">Target cycle</th>
                <th className="p-2 text-left">Ready for cutoff</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={`${route.status}:${route.route}`} className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_60%,transparent)]">
                  <td className="p-2 font-mono text-xs text-[var(--aethel-text-secondary)]">{route.route}</td>
                  <td className="p-2 text-[var(--aethel-text-secondary)]">{route.replacement}</td>
                  <td className="p-2 text-[var(--aethel-text-secondary)]">{route.hits}</td>
                  <td className="p-2 text-[var(--aethel-text-tertiary)]">{route.lastHitAt ? new Date(route.lastHitAt).toLocaleString() : "never"}</td>
                  <td className="p-2 text-[var(--aethel-text-tertiary)]">{route.removalCycleTarget || "n/a"}</td>
                  <td className="p-2">
                    <span className={`rounded px-2 py-1 text-xs ${route.candidateForRemoval ? "bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]" : "bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]"}`}>
                      {route.candidateForRemoval ? "candidate" : "monitor"}
                    </span>
                    {typeof route.silenceDays === "number" ? <span className="ml-2 text-[11px] text-[var(--aethel-text-tertiary)]">{route.silenceDays}d silence</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {removalCandidates.length > 0 ? (
        <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-2 text-xs text-[var(--aethel-success-light)]">
          Candidates ready for cutoff, subject to PM approval: {removalCandidates.join(", ")}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">Cutoff rule: remove a legacy route only with 0 hits for 14 consecutive days and 0 frontend usage confirmed by scanner.</p>
    </div>
  );
}
