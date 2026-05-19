"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Crown,
  Edit3,
  Eye,
  Link2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Send,
  Shield,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import type { InviteLink, TeamMember } from "./TeamInviteManager.types";

// ============================================================================
// STYLES
// ============================================================================

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

// ============================================================================
// ROLE BADGE
// ============================================================================

export const RoleBadge: React.FC<{ role: TeamMember["role"] }> = ({ role }) => {
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
        color: color,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
};

// ============================================================================
// STATUS INDICATOR
// ============================================================================

export const StatusIndicator: React.FC<{ status: TeamMember["status"] }> = ({
  status,
}) => {
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
};

// ============================================================================
// MEMBER AVATAR
// ============================================================================

export const MemberAvatar: React.FC<{ member: TeamMember; size?: number }> = ({
  member,
  size = 40,
}) => {
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

  // Generate color from name
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
};

// ============================================================================
// INVITE EMAIL FORM
// ============================================================================

interface InviteFormProps {
  onInvite: (email: string, role: "editor" | "viewer") => Promise<void>;
  isLoading: boolean;
}

export const InviteForm: React.FC<InviteFormProps> = ({
  onInvite,
  isLoading,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    try {
      await onInvite(email, role);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error sending invite");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        {/* Email Input */}
        <div style={{ flex: 1, position: "relative" }}>
          <Mail
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: teamInviteColors.textMuted,
            }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "10px 12px 10px 40px",
              background: teamInviteColors.surface,
              border: `1px solid ${error ? teamInviteColors.error : teamInviteColors.border}`,
              borderRadius: "8px",
              color: teamInviteColors.text,
              fontSize: "14px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              if (!error)
                e.target.style.borderColor = teamInviteColors.borderFocus;
            }}
            onBlur={(e) => {
              if (!error) e.target.style.borderColor = teamInviteColors.border;
            }}
          />
        </div>

        {/* Role Selector */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 12px",
              background: teamInviteColors.surface,
              border: `1px solid ${teamInviteColors.border}`,
              borderRadius: "8px",
              color: teamInviteColors.text,
              fontSize: "14px",
              cursor: "pointer",
              minWidth: "110px",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {role === "editor" ? <Edit3 size={14} /> : <Eye size={14} />}
              {role === "editor" ? "Editor" : "Viewer"}
            </span>
            <ChevronDown size={14} style={{ opacity: 0.6 }} />
          </button>

          {showRoleMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "4px",
                background: teamInviteColors.surface,
                border: `1px solid ${teamInviteColors.border}`,
                borderRadius: "8px",
                padding: "4px",
                zIndex: 100,
                minWidth: "140px",
              }}
            >
              {(["editor", "viewer"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setShowRoleMenu(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 12px",
                    background:
                      role === r
                        ? teamInviteColors.surfaceHover
                        : "transparent",
                    border: "none",
                    borderRadius: "6px",
                    color: teamInviteColors.text,
                    fontSize: "13px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {r === "editor" ? <Edit3 size={14} /> : <Eye size={14} />}
                  {r === "editor" ? "Editor" : "Viewer"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !email}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 16px",
            background:
              isLoading || !email
                ? teamInviteColors.textDim
                : teamInviteColors.primary,
            border: "none",
            borderRadius: "8px",
            color: "var(--aethel-text-inverse)",
            fontSize: "14px",
            fontWeight: 500,
            cursor: isLoading || !email ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {isLoading ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          Send
        </button>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "8px",
            padding: "8px 12px",
            background: teamInviteColors.error + "15",
            borderRadius: "6px",
            color: teamInviteColors.error,
            fontSize: "13px",
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </form>
  );
};

// ============================================================================
// INVITE LINK SECTION
// ============================================================================

interface InviteLinkSectionProps {
  projectId: string;
  inviteLinks: InviteLink[];
  onCreateLink: (role: "editor" | "viewer") => Promise<void>;
  onRevokeLink: (linkId: string) => Promise<void>;
}

export const InviteLinkSection: React.FC<InviteLinkSectionProps> = ({
  projectId,
  inviteLinks,
  onCreateLink,
  onRevokeLink,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const copyLink = async (code: string, linkId: string) => {
    const url = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(linkId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateLink = async (role: "editor" | "viewer") => {
    setIsCreating(true);
    try {
      await onCreateLink(role);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      style={{
        padding: "16px",
        background: teamInviteColors.surface,
        borderRadius: "12px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link2 size={18} color={teamInviteColors.primary} />
          <h3
            style={{
              margin: 0,
              color: teamInviteColors.text,
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Invite Links
          </h3>
        </div>

        <button
          type="button"
          onClick={() => handleCreateLink("editor")}
          disabled={isCreating}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            background: "transparent",
            border: `1px solid ${teamInviteColors.border}`,
            borderRadius: "6px",
            color: teamInviteColors.text,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          <UserPlus size={14} />
          Create Link
        </button>
      </div>

      {inviteLinks.length === 0 ? (
        <p
          style={{
            margin: 0,
            color: teamInviteColors.textMuted,
            fontSize: "13px",
          }}
        >
          No active invite links. Create one to share access.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {inviteLinks.map((link) => {
            const isExpired = new Date(link.expiresAt) < new Date();

            return (
              <div
                key={link.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  background: teamInviteColors.bg,
                  borderRadius: "8px",
                  opacity: isExpired ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: teamInviteColors.textMuted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {window.location.origin}/invite/{link.code.substring(0, 8)}...
                </div>

                <RoleBadge role={link.role} />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: teamInviteColors.textMuted,
                    fontSize: "11px",
                  }}
                >
                  <Clock size={12} />
                  {isExpired
                    ? "Expired"
                    : `${Math.ceil((new Date(link.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d`}
                </div>

                <button
                  type="button"
                  onClick={() => copyLink(link.code, link.id)}
                  style={{
                    padding: "6px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "4px",
                    color:
                      copiedId === link.id
                        ? teamInviteColors.success
                        : teamInviteColors.textMuted,
                    cursor: "pointer",
                  }}
                  title="Copy link"
                >
                  {copiedId === link.id ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onRevokeLink(link.id)}
                  style={{
                    padding: "6px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "4px",
                    color: teamInviteColors.textMuted,
                    cursor: "pointer",
                  }}
                  title="Revoke link"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MEMBER LIST ITEM
// ============================================================================

interface MemberListItemProps {
  member: TeamMember;
  currentUserRole: "owner" | "admin" | "editor" | "viewer";
  onChangeRole: (memberId: string, role: TeamMember["role"]) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  onResendInvite: (memberId: string) => Promise<void>;
}

export const MemberListItem: React.FC<MemberListItemProps> = ({
  member,
  currentUserRole,
  onChangeRole,
  onRemove,
  onResendInvite,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canManage =
    currentUserRole === "owner" ||
    (currentUserRole === "admin" &&
      member.role !== "owner" &&
      member.role !== "admin");

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
      setShowMenu(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px",
        borderRadius: "10px",
        background: teamInviteColors.surface,
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = teamInviteColors.surfaceHover)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = teamInviteColors.surface)
      }
    >
      <MemberAvatar member={member} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              color: teamInviteColors.text,
              fontWeight: 500,
              fontSize: "14px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {member.name}
          </span>
          <RoleBadge role={member.role} />
        </div>
        <div
          style={{
            color: teamInviteColors.textMuted,
            fontSize: "12px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {member.email}
        </div>
      </div>

      <StatusIndicator status={member.status} />

      {canManage && (
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            disabled={isLoading}
            aria-label={
              showMenu
                ? "Close member actions menu"
                : "Open member actions menu"
            }
            aria-expanded={showMenu}
            style={{
              padding: "6px",
              background: "transparent",
              border: "none",
              borderRadius: "4px",
              color: teamInviteColors.textMuted,
              cursor: "pointer",
            }}
          >
            {isLoading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <MoreHorizontal size={16} />
            )}
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 99,
                }}
                onClick={() => setShowMenu(false)}
              />

              {/* Menu */}
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "4px",
                  background: teamInviteColors.surface,
                  border: `1px solid ${teamInviteColors.border}`,
                  borderRadius: "8px",
                  padding: "4px",
                  zIndex: 100,
                  minWidth: "160px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {member.status === "pending" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(() => onResendInvite(member.id))
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "8px 12px",
                      background: "transparent",
                      border: "none",
                      borderRadius: "6px",
                      color: teamInviteColors.text,
                      fontSize: "13px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <RefreshCw size={14} />
                    Resend invite
                  </button>
                )}

                {currentUserRole === "owner" && member.role !== "owner" && (
                  <>
                    <div
                      style={{
                        padding: "4px 12px",
                        color: teamInviteColors.textDim,
                        fontSize: "11px",
                        textTransform: "uppercase",
                      }}
                    >
                      Change role
                    </div>
                    {(["admin", "editor", "viewer"] as const)
                      .filter((r) => r !== member.role)
                      .map((role) => (
                        <button
                          type="button"
                          key={role}
                          onClick={() =>
                            handleAction(() => onChangeRole(member.id, role))
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "8px 12px",
                            background: "transparent",
                            border: "none",
                            borderRadius: "6px",
                            color: teamInviteColors.text,
                            fontSize: "13px",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {role === "admin" && <Shield size={14} />}
                          {role === "editor" && <Edit3 size={14} />}
                          {role === "viewer" && <Eye size={14} />}
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      ))}
                    <div
                      style={{
                        height: "1px",
                        background: teamInviteColors.border,
                        margin: "4px 0",
                      }}
                    />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleAction(() => onRemove(member.id))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "6px",
                    color: teamInviteColors.error,
                    fontSize: "13px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Trash2 size={14} />
                  Remove member
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
