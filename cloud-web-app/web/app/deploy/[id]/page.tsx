"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredPreviewDeploy, mergePreviewDeployRecord, persistPreviewDeploy } from "@/components/preview/previewDeployTrust";
import { useBrowserPathname, useBrowserSearch } from "@/lib/navigation/use-browser-pathname";
import {
  ACTIVE_DEPLOY_STATUSES,
  DeployPageFrame,
  DeployPageHeader,
  DeploymentStatusPanel,
  getStatusMeta,
  type DeployResult,
  type FetchState,
} from "./page.parts";

export default function DeployStatusPage() {
  const pathname = useBrowserPathname();
  const search = useBrowserSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const deploymentId = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments[0] === "deploy" ? segments[1] : undefined;
  }, [pathname]);
  const projectName = searchParams.get("project")?.trim() || "deploy";
  const projectId = searchParams.get("projectId")?.trim();
  const [state, setState] = useState<FetchState>({ loading: true, error: null, deployment: null });

  const loadDeployment = useCallback(async () => {
    if (!deploymentId) {
      setState({ loading: false, error: "Invalid deployment id", deployment: null });
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await fetch(`/api/deploy?id=${encodeURIComponent(deploymentId)}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as DeployResult & { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.message || payload.error || "Failed to load deployment");
      setState({ loading: false, error: null, deployment: payload });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : "Failed to load deployment", deployment: null });
    }
  }, [deploymentId]);

  useEffect(() => {
    void loadDeployment();
  }, [loadDeployment]);

  useEffect(() => {
    if (!state.deployment || !ACTIVE_DEPLOY_STATUSES.has(state.deployment.status)) return;
    const intervalId = window.setInterval(() => void loadDeployment(), 5000);
    return () => window.clearInterval(intervalId);
  }, [loadDeployment, state.deployment]);

  useEffect(() => {
    if (!state.deployment) return;
    const merged = mergePreviewDeployRecord(getStoredPreviewDeploy(projectName), state.deployment);
    persistPreviewDeploy(projectName, merged);
  }, [projectName, state.deployment]);

  const statusMeta = useMemo(() => getStatusMeta(state.deployment?.status), [state.deployment?.status]);
  const backHref = projectId ? `/ide?projectId=${encodeURIComponent(projectId)}` : "/ide";

  return (
    <DeployPageFrame>
      <DeployPageHeader
        backHref={backHref}
        deploymentId={deploymentId}
        loading={state.loading}
        projectName={projectName}
        statusMeta={statusMeta}
        onRefresh={() => void loadDeployment()}
      />
      <DeploymentStatusPanel state={state} statusMeta={statusMeta} />
    </DeployPageFrame>
  );
}
