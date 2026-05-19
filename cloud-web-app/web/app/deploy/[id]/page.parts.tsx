"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft, ExternalLink, Loader2, RefreshCw, Rocket } from "lucide-react";
import { gradients, tokens } from "@/lib/design-tokens";

export type DeployStatus = "idle" | "preparing" | "uploading" | "building" | "ready" | "error" | "canceled";

export type DeployResult = {
  id: string;
  url: string;
  inspectorUrl: string;
  status: DeployStatus;
  createdAt: string;
  readyAt?: string;
  buildDurationMs?: number;
  error?: string;
};

export type FetchState = {
  loading: boolean;
  error: string | null;
  deployment: DeployResult | null;
};

export const ACTIVE_DEPLOY_STATUSES = new Set<DeployStatus>(["idle", "preparing", "uploading", "building"]);

export type StatusMeta = {
  label: string;
  tone: "neutral" | "info" | "success" | "danger";
};

export function DeployPageFrame({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, rgba(0, 170, 255, 0.12), transparent 40%), var(--aethel-surface-primary)",
        color: "var(--aethel-text-primary)",
        padding: tokens.spacing["8"],
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: tokens.spacing["5"],
        }}
      >
        {children}
      </div>
    </main>
  );
}

export function DeployPageHeader({
  backHref,
  deploymentId,
  loading,
  projectName,
  statusMeta,
  onRefresh,
}: {
  backHref: string;
  deploymentId?: string;
  loading: boolean;
  projectName: string;
  statusMeta: StatusMeta;
  onRefresh: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: tokens.spacing["4"],
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing["3"] }}>
        <Link
          href={backHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: tokens.spacing["2"],
            color: "var(--aethel-text-secondary)",
            textDecoration: "none",
            fontSize: tokens.typography.fontSize.sm,
          }}
        >
          <ArrowLeft size={16} />
          Back to IDE
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing["2"] }}>
          <span
            style={{
              fontSize: tokens.typography.fontSize.xs,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--aethel-text-tertiary)",
            }}
          >
            Deploy
          </span>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", lineHeight: 1.1 }}>{projectName}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing["2"], flexWrap: "wrap" }}>
            <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
            {deploymentId ? <DeployCode>{deploymentId}</DeployCode> : null}
          </div>
        </div>
      </div>

      <button type="button" onClick={onRefresh} style={secondaryButtonStyle}>
        {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={15} />}
        Refresh
      </button>
    </div>
  );
}

function DeployCode({ children }: { children: ReactNode }) {
  return (
    <code
      style={{
        padding: `${tokens.spacing["1"]} ${tokens.spacing["2"]}`,
        borderRadius: tokens.radius.full,
        background: "color-mix(in srgb, var(--aethel-surface-secondary) 84%, transparent)",
        color: "var(--aethel-text-secondary)",
        border: "1px solid var(--aethel-border-secondary)",
        fontSize: tokens.typography.fontSize.xs,
      }}
    >
      {children}
    </code>
  );
}

export function DeploymentStatusPanel({ state, statusMeta }: { state: FetchState; statusMeta: StatusMeta }) {
  return (
    <section style={cardStyle}>
      {state.error ? <ErrorBanner>{state.error}</ErrorBanner> : null}
      {!state.deployment && state.loading ? <LoadingLine label="Loading deployment status..." /> : null}
      {state.deployment ? <DeploymentDetails deployment={state.deployment} statusMeta={statusMeta} /> : null}
    </section>
  );
}

function DeploymentDetails({ deployment, statusMeta }: { deployment: DeployResult; statusMeta: StatusMeta }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: tokens.spacing["3"] }}>
        <MetricCard label="State" value={statusMeta.label} helpText={getStatusHelp(deployment.status)} />
        <MetricCard label="Created" value={formatDateTime(deployment.createdAt)} />
        <MetricCard label="Ready" value={formatDateTime(deployment.readyAt)} />
        <MetricCard label="Duration" value={formatDuration(deployment.buildDurationMs)} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing["3"] }}>
        <ActionLink href={deployment.url} label="Open deployment" helper="Public URL" />
        <ActionLink href={deployment.inspectorUrl} label="Open provider dashboard" helper="Inspector" />
      </div>

      {deployment.error ? <ErrorBanner>{deployment.error}</ErrorBanner> : null}

      {ACTIVE_DEPLOY_STATUSES.has(deployment.status) ? (
        <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing["2"], color: "var(--aethel-text-secondary)", fontSize: tokens.typography.fontSize.sm }}>
          <Rocket size={16} />
          Auto-refresh runs every 5 seconds while the deployment is active.
        </div>
      ) : null}
    </>
  );
}

function LoadingLine({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing["3"], color: "var(--aethel-text-secondary)" }}>
      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
      {label}
    </div>
  );
}

function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing["4"],
        background: "color-mix(in srgb, var(--aethel-error) 10%, var(--aethel-surface-secondary))",
        border: "1px solid color-mix(in srgb, var(--aethel-error) 30%, transparent)",
        color: "var(--aethel-error)",
      }}
    >
      {children}
    </div>
  );
}

function MetricCard({ label, value, helpText }: { label: string; value: string; helpText?: string }) {
  return (
    <div
      style={{
        padding: tokens.spacing["4"],
        borderRadius: tokens.radius.lg,
        border: "1px solid var(--aethel-border-secondary)",
        background: "color-mix(in srgb, var(--aethel-surface-secondary) 82%, transparent)",
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacing["2"],
      }}
    >
      <span
        style={{
          fontSize: tokens.typography.fontSize.xs,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--aethel-text-tertiary)",
        }}
      >
        {label}
      </span>
      <strong style={{ fontSize: tokens.typography.fontSize.lg }}>{value}</strong>
      {helpText ? <span style={{ fontSize: tokens.typography.fontSize.xs, color: "var(--aethel-text-secondary)" }}>{helpText}</span> : null}
    </div>
  );
}

function ActionLink({ href, label, helper }: { href?: string; label: string; helper: string }) {
  if (!href) {
    return (
      <div style={{ ...secondaryButtonStyle, opacity: 0.72, cursor: "default" }}>
        <ExternalLink size={15} />
        {label}
      </div>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ ...secondaryButtonStyle, textDecoration: "none", justifyContent: "space-between" }}>
      <span style={{ display: "flex", flexDirection: "column", gap: tokens.spacing["1"] }}>
        <span>{label}</span>
        <span style={{ fontSize: tokens.typography.fontSize.xs, color: "var(--aethel-text-tertiary)" }}>{helper}</span>
      </span>
      <ExternalLink size={16} />
    </a>
  );
}

function StatusPill({ label, tone }: { label: string; tone: StatusMeta["tone"] }) {
  const colors = {
    neutral: {
      background: "color-mix(in srgb, var(--aethel-surface-secondary) 84%, transparent)",
      border: "var(--aethel-border-secondary)",
      text: "var(--aethel-text-secondary)",
    },
    info: {
      background: "color-mix(in srgb, var(--aethel-info) 14%, transparent)",
      border: "color-mix(in srgb, var(--aethel-info) 34%, transparent)",
      text: "var(--aethel-info)",
    },
    success: {
      background: "color-mix(in srgb, var(--aethel-success) 14%, transparent)",
      border: "color-mix(in srgb, var(--aethel-success) 34%, transparent)",
      text: "var(--aethel-success)",
    },
    danger: {
      background: "color-mix(in srgb, var(--aethel-error) 14%, transparent)",
      border: "color-mix(in srgb, var(--aethel-error) 34%, transparent)",
      text: "var(--aethel-error)",
    },
  } as const;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: tokens.spacing["1.5"],
        padding: `${tokens.spacing["1.5"]} ${tokens.spacing["3"]}`,
        borderRadius: tokens.radius.full,
        border: `1px solid ${colors[tone].border}`,
        background: colors[tone].background,
        color: colors[tone].text,
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.semibold,
      }}
    >
      {label}
    </span>
  );
}

export function getStatusMeta(status: DeployStatus | undefined): StatusMeta {
  switch (status) {
    case "preparing":
      return { label: "Preparing", tone: "info" };
    case "uploading":
      return { label: "Uploading", tone: "info" };
    case "building":
      return { label: "Building", tone: "info" };
    case "ready":
      return { label: "Ready", tone: "success" };
    case "error":
      return { label: "Error", tone: "danger" };
    case "canceled":
      return { label: "Canceled", tone: "danger" };
    case "idle":
      return { label: "Waiting", tone: "neutral" };
    default:
      return { label: "Loading", tone: "neutral" };
  }
}

function getStatusHelp(status: DeployStatus): string {
  switch (status) {
    case "preparing":
      return "Deployment job has been queued.";
    case "uploading":
      return "Files or remote references are transferring.";
    case "building":
      return "Provider build is running.";
    case "ready":
      return "The public URL should respond.";
    case "error":
      return "Open the inspector for details.";
    case "canceled":
      return "Deployment was interrupted.";
    default:
      return "Waiting for updates.";
  }
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function formatDuration(value?: number): string {
  if (!value || value <= 0) return "-";
  if (value < 1000) return `${value} ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: tokens.spacing["4"],
  padding: tokens.spacing["6"],
  borderRadius: tokens.radius.xl,
  border: "1px solid var(--aethel-border-secondary)",
  background: gradients.glassStrong,
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.24)",
};

const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.spacing["2"],
  padding: `${tokens.spacing["2.5"]} ${tokens.spacing["3"]}`,
  borderRadius: tokens.radius.lg,
  border: "1px solid var(--aethel-border-secondary)",
  background: "color-mix(in srgb, var(--aethel-surface-secondary) 72%, transparent)",
  color: "var(--aethel-text-primary)",
  cursor: "pointer",
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
};
