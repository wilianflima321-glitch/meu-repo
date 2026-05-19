"use client";

/**
 * Team Invite Manager Component
 *
 * Professional interface for inviting and managing project/team members.
 */
import React, { useCallback, useState } from "react";
import useSWR from "swr";
import { Users } from "lucide-react";
import {
  InviteForm,
  InviteLinkSection,
  MemberListItem,
  teamInviteColors,
} from "./TeamInviteManager.parts";
import type {
  InviteLink,
  TeamInviteProps,
  TeamMember,
} from "./TeamInviteManager.types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const TeamInviteManager: React.FC<TeamInviteProps> = ({
  projectId,
  currentUserRole = "owner",
  onMemberAdded,
  onMemberRemoved,
}) => {
  const [isInviting, setIsInviting] = useState(false);

  // Fetch team members
  const { data: membersData, mutate: mutateMembers } = useSWR<{
    success: boolean;
    data: TeamMember[];
  }>(`/api/projects/${projectId}/members`, fetcher, {
    fallbackData: { success: true, data: [] },
  });

  // Fetch invite links
  const { data: linksData, mutate: mutateLinks } = useSWR<{
    success: boolean;
    data: InviteLink[];
  }>(`/api/projects/${projectId}/invite-links`, fetcher, {
    fallbackData: { success: true, data: [] },
  });

  const members = membersData?.data || [];
  const inviteLinks = linksData?.data || [];

  // Handlers
  const handleInviteByEmail = useCallback(
    async (email: string, role: "editor" | "viewer") => {
      setIsInviting(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Error sending invite");
        }

        const { data } = await res.json();
        onMemberAdded?.(data);
        mutateMembers();
      } finally {
        setIsInviting(false);
      }
    },
    [projectId, onMemberAdded, mutateMembers],
  );

  const handleCreateLink = useCallback(
    async (role: "editor" | "viewer") => {
      const res = await fetch(`/api/projects/${projectId}/invite-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, expiresIn: 7 * 24 * 60 * 60 * 1000 }), // 7 days
      });

      if (!res.ok) throw new Error("Error creating link");
      mutateLinks();
    },
    [projectId, mutateLinks],
  );

  const handleRevokeLink = useCallback(
    async (linkId: string) => {
      await fetch(`/api/projects/${projectId}/invite-links/${linkId}`, {
        method: "DELETE",
      });
      mutateLinks();
    },
    [projectId, mutateLinks],
  );

  const handleChangeRole = useCallback(
    async (memberId: string, role: TeamMember["role"]) => {
      await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      mutateMembers();
    },
    [projectId, mutateMembers],
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
      });
      onMemberRemoved?.(memberId);
      mutateMembers();
    },
    [projectId, onMemberRemoved, mutateMembers],
  );

  const handleResendInvite = useCallback(
    async (memberId: string) => {
      await fetch(`/api/projects/${projectId}/members/${memberId}/resend`, {
        method: "POST",
      });
    },
    [projectId],
  );

  // Group members by status
  const activeMembers = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "pending");

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "720px",
        margin: "0 auto",
        padding: "24px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            margin: "0 0 4px 0",
            color: teamInviteColors.text,
            fontSize: "20px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Users size={22} />
          Manage Team
        </h2>
        <p
          style={{
            margin: 0,
            color: teamInviteColors.textMuted,
            fontSize: "14px",
          }}
        >
          Invite collaborators and manage project permissions.
        </p>
      </div>

      {/* Invite Form */}
      {(currentUserRole === "owner" || currentUserRole === "admin") && (
        <InviteForm onInvite={handleInviteByEmail} isLoading={isInviting} />
      )}

      {/* Invite Links */}
      {(currentUserRole === "owner" || currentUserRole === "admin") && (
        <InviteLinkSection
          projectId={projectId}
          inviteLinks={inviteLinks}
          onCreateLink={handleCreateLink}
          onRevokeLink={handleRevokeLink}
        />
      )}

      {/* Pending Invites */}
      {pendingMembers.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              margin: "0 0 12px 0",
              color: teamInviteColors.textMuted,
              fontSize: "12px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Pending Invites ({pendingMembers.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pendingMembers.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                currentUserRole={currentUserRole}
                onChangeRole={handleChangeRole}
                onRemove={handleRemoveMember}
                onResendInvite={handleResendInvite}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Members */}
      <div>
        <h3
          style={{
            margin: "0 0 12px 0",
            color: teamInviteColors.textMuted,
            fontSize: "12px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Active Members ({activeMembers.length})
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeMembers.length === 0 ? (
            <div
              style={{
                padding: "32px",
                background: teamInviteColors.surface,
                borderRadius: "12px",
                textAlign: "center",
                color: teamInviteColors.textMuted,
              }}
            >
              <Users size={40} style={{ marginBottom: "12px", opacity: 0.4 }} />
              <p style={{ margin: "0 0 4px 0", fontWeight: 500 }}>
                No members yet
              </p>
              <p style={{ margin: 0, fontSize: "13px" }}>
                Invite collaborators to start working as a team.
              </p>
            </div>
          ) : (
            activeMembers.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                currentUserRole={currentUserRole}
                onChangeRole={handleChangeRole}
                onRemove={handleRemoveMember}
                onResendInvite={handleResendInvite}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamInviteManager;
