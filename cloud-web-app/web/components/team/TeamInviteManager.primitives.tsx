"use client";

import Image from "next/image";
import { Crown, Edit3, Eye, Shield } from "lucide-react";
import type { TeamMember } from "./TeamInviteManager.types";

export const teamInviteColors = {
  bg: "var(--aethel-surface-primary)",
  surface: "var(--aethel-surface-secondary)",
  surfaceHover: "var(--aethel-surface-tertiary)",
  border: "var(--aethel-border-primary)",
  borderFocus: "var(--aethel-border-focus)",
  text: "var(--aethel-text-primary)",
  textMuted: "var(--aethel-text-tertiary)",
  textDim: "var(--aethel-text-quaternary)",
  primary: "var(--aethel-accent)",
  primaryHover: "var(--aethel-accent-dark)",
  success: "var(--aethel-success)",
  warning: "var(--aethel-warning)",
  error: "var(--aethel-error)",
  owner: "var(--aethel-warning)",
  admin: "var(--aethel-accent)",
  editor: "var(--aethel-success)",
  viewer: "var(--aethel-text-tertiary)",
};

export function RoleBadge({ role }: { role: TeamMember["role"] }) {
  const config = {
    owner: { icon: Crown, color: teamInviteColors.owner, label: "Owner" },
    admin: { icon: Shield, color: teamInviteColors.admin, label: "Admin" },
    editor: { icon: Edit3, color: teamInviteColors.editor, label: "Editor" },
    viewer: { icon: Eye, color: teamInviteColors.viewer, label: "Viewer" },
  };

  const { icon: Icon, color, label } = config[role];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        fontSize: "11px",
        fontWeight: 500,
        borderRadius: "4px",
        background: color + "15",
        color,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

export function StatusIndicator({ status }: { status: TeamMember["status"] }) {
  const config = {
    active: { color: teamInviteColors.success, label: "Active" },
    pending: { color: teamInviteColors.warning, label: "Pending" },
    inactive: { color: teamInviteColors.textDim, label: "Inactive" },
  };

  const { color, label } = config[status];

  return (
    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
        }}
      />
      <span style={{ fontSize: "12px", color: teamInviteColors.textMuted }}>
        {label}
      </span>
    </span>
  );
}

export function MemberAvatar({
  member,
  size = 40,
}: {
  member: TeamMember;
  size?: number;
}) {
  if (member.avatar) {
    return (
      <Image
        src={member.avatar}
        alt={member.name}
        width={size}
        height={size}
        unoptimized
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    );
  }

  const hue =
    member.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    360;
  const bgColor = `hsl(${hue}, 50%, 30%)`;
  const textColor = `hsl(${hue}, 50%, 80%)`;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: textColor,
        fontWeight: 600,
        fontSize: size * 0.4,
      }}
    >
      {member.name.charAt(0).toUpperCase()}
    </div>
  );
}
