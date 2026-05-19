"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/auth";
import {
  AdminApisHeader,
  AdminApisNotice,
  AIProviderQuickCheck,
  AIProviderSetupNotice,
  BillingRuntimeQuickCheck,
  CompatibilityRoutesPanel,
  IntegrationSummary,
  IntegrationToolbar,
  IntegrationsTable,
  isAIProviderIntegration,
  OperatorReadinessAggregate,
  PreviewRuntimeQuickCheck,
  ProductionRuntimeQuickCheck,
  type BillingRuntimeSnapshot,
  type CompatibilityRouteMetric,
  type Integration,
  type OperatorReadinessSnapshot,
  type PreviewRuntimeSnapshot,
  type ProductionRuntimeSnapshot,
  type StatusFilter,
} from "./page.parts";

export default function APIs() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [compatRoutes, setCompatRoutes] = useState<CompatibilityRouteMetric[]>([]);
  const [removalCandidates, setRemovalCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compatError, setCompatError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [billingRuntime, setBillingRuntime] = useState<BillingRuntimeSnapshot | null>(null);
  const [previewRuntime, setPreviewRuntime] = useState<PreviewRuntimeSnapshot | null>(null);
  const [productionRuntime, setProductionRuntime] = useState<ProductionRuntimeSnapshot | null>(null);
  const [operatorReadiness, setOperatorReadiness] = useState<OperatorReadinessSnapshot | null>(null);

  const getAuthHeaders = () => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/apis", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to load integrations");
      const data = await res.json();
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : []);
      setLastUpdated(new Date());
      setError(null);

      const compatRes = await fetch("/api/admin/compatibility-routes", { headers: getAuthHeaders() });
      if (!compatRes.ok) throw new Error("Failed to load compatibility routes");
      const compatData = await compatRes.json();
      setCompatRoutes(Array.isArray(compatData?.routes) ? compatData.routes : []);
      setRemovalCandidates(Array.isArray(compatData?.removalCandidates) ? compatData.removalCandidates : []);

      const operatorRes = await fetch("/api/admin/operator-readiness", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (!operatorRes.ok) throw new Error("Failed to load operational readiness");
      const operatorData = await operatorRes.json().catch(() => null);
      const operatorSnapshot = operatorData && typeof operatorData === "object" ? (operatorData as OperatorReadinessSnapshot) : null;
      setOperatorReadiness(operatorSnapshot);
      setBillingRuntime(operatorSnapshot?.checks.billingRuntime || null);
      setPreviewRuntime(operatorSnapshot?.checks.previewRuntime || null);
      setProductionRuntime(operatorSnapshot?.checks.productionRuntime ? { runtimeReadiness: operatorSnapshot.checks.productionRuntime } : null);

      setCompatError(null);
      setStatusMessage("Integrations updated successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load integrations";
      if (message.includes("compatibility")) setCompatError(message);
      else setError(message);
      setStatusMessage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const filteredIntegrations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return integrations.filter((integration) => {
      const matchesSearch = !term || integration.name.toLowerCase().includes(term) || integration.envKey.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || (statusFilter === "configured" ? integration.configured : !integration.configured);
      return matchesSearch && matchesStatus;
    });
  }, [integrations, search, statusFilter]);

  const summary = useMemo(
    () => ({
      total: integrations.length,
      configured: integrations.filter((integration) => integration.configured).length,
      missing: integrations.filter((integration) => !integration.configured).length,
    }),
    [integrations],
  );

  const aiProviderIntegrations = useMemo(() => integrations.filter(isAIProviderIntegration), [integrations]);
  const aiProvidersMissing = useMemo(() => aiProviderIntegrations.filter((integration) => !integration.configured), [aiProviderIntegrations]);
  const hasConfiguredAIProvider = useMemo(() => aiProviderIntegrations.some((integration) => integration.configured), [aiProviderIntegrations]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <AdminApisHeader lastUpdated={lastUpdated} onRefresh={fetchIntegrations} />
      <AdminApisNotice error={error} statusMessage={statusMessage} />
      <AIProviderSetupNotice providers={aiProvidersMissing} />
      <AIProviderQuickCheck hasConfiguredProvider={hasConfiguredAIProvider} />
      <ProductionRuntimeQuickCheck runtime={productionRuntime} />
      <BillingRuntimeQuickCheck runtime={billingRuntime} />
      <PreviewRuntimeQuickCheck runtime={previewRuntime} />
      <OperatorReadinessAggregate readiness={operatorReadiness} />
      <IntegrationSummary total={summary.total} configured={summary.configured} missing={summary.missing} removalCandidates={removalCandidates.length} />
      <IntegrationToolbar search={search} statusFilter={statusFilter} onSearch={setSearch} onStatusFilter={setStatusFilter} />
      <IntegrationsTable loading={loading} integrations={filteredIntegrations} error={error} />
      <CompatibilityRoutesPanel compatError={compatError} loading={loading} routes={compatRoutes} removalCandidates={removalCandidates} />
    </div>
  );
}
