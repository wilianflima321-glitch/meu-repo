'use client';

import { useEffect, useState } from 'react';
import {
  Crown,
  ExternalLink,
  GitBranch,
  Loader2,
  Shield,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { authHeaders } from '@/lib/auth';

type TeamMember = {
  userId: string;
  email: string;
  name: string | null;
  avatar: string | null;
  platformRole: string;
  projects: Array<{
    projectId: string;
    projectName: string;
    role: string;
    isOwner: boolean;
  }>;
};

const ROLE_STYLE: Record<string, { cls: string; icon: React.ReactNode }> = {
  owner:   { cls: 'text-amber-400  border-amber-400/30  bg-amber-400/10',  icon: <Crown    className="h-3 w-3" /> },
  admin:   { cls: 'text-[var(--aethel-accent)] border-[color-mix(in_srgb,var(--aethel-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-accent)_10%,transparent)]', icon: <Shield   className="h-3 w-3" /> },
  member:  { cls: 'text-cyan-400   border-cyan-400/30   bg-cyan-400/10',   icon: <User     className="h-3 w-3" /> },
  viewer:  { cls: 'text-gray-400   border-gray-400/30   bg-gray-400/10',   icon: <GitBranch className="h-3 w-3" /> },
};

function getRoleStyle(role: string, isOwner: boolean) {
  if (isOwner) return ROLE_STYLE.owner;
  return ROLE_STYLE[role?.toLowerCase()] ?? ROLE_STYLE.member;
}

function Avatar({ name, avatar, size = 40 }: { name: string | null; avatar: string | null; size?: number }) {
  const initials = (name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatar}
        alt={name ?? 'Team member'}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-[var(--aethel-primary)]/40 to-[var(--aethel-neon-cyan)]/30 font-bold text-[var(--aethel-text-primary)]"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const topRole = member.projects[0];
  const rs = topRole ? getRoleStyle(topRole.role, topRole.isOwner) : ROLE_STYLE.member;

  return (
    <li
      className="
        group relative overflow-hidden rounded-2xl
        border border-[var(--aethel-border-subtle)]
        bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]
        p-5 transition-all duration-200
        hover:border-[color-mix(in_srgb,var(--aethel-neon-cyan)_28%,transparent)]
        hover:shadow-[0_0_24px_rgba(0,229,255,0.08)]
        [backdrop-filter:blur(12px)]
      "
    >
      {/* Subtle top-right glow on hover */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(circle, rgba(var(--aethel-neon-cyan-rgb),0.12) 0%, transparent 70%)' }}
        aria-hidden
      />

      <div className="relative flex items-start gap-4">
        <Avatar name={member.name} avatar={member.avatar} size={44} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-[var(--aethel-text-primary)]">
              {member.name || member.email}
            </p>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${rs.cls}`}
            >
              {rs.icon}
              {topRole?.isOwner ? 'owner' : (topRole?.role ?? member.platformRole)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--aethel-text-quaternary)]">{member.email}</p>
        </div>
      </div>

      {/* Project chips */}
      {member.projects.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {member.projects.map((project) => {
            const prs = getRoleStyle(project.role, project.isOwner);
            return (
              <span
                key={`${member.userId}-${project.projectId}`}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium ${prs.cls}`}
              >
                {prs.icon}
                <span className="truncate max-w-[140px]">{project.projectName}</span>
              </span>
            );
          })}
        </div>
      )}
    </li>
  );
}

export default function TeamPageClient() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/team', { headers: authHeaders() });
        if (!response.ok) throw new Error('Failed to load team');
        const data = (await response.json()) as { members: TeamMember[] };
        if (active) setMembers(data.members ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load team');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-sm text-[var(--aethel-text-tertiary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading team…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-red-400">
        <XCircle className="h-8 w-8 opacity-60" />
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_28%,transparent)] bg-[rgba(var(--aethel-neon-cyan-rgb),0.08)]">
              <Users className="h-5 w-5 text-[var(--aethel-neon-cyan)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--aethel-text-primary)]">
                Team
              </h1>
              <p className="text-sm text-[var(--aethel-text-tertiary)]">
                {members.length} collaborator{members.length !== 1 ? 's' : ''} across your projects
              </p>
            </div>
          </div>
        </div>

        {/* Stats pill row */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Owners',  count: members.filter((m) => m.projects.some((p) => p.isOwner)).length,  cls: 'text-amber-400  border-amber-400/25  bg-amber-400/8'  },
            { label: 'Members', count: members.filter((m) => !m.projects.some((p) => p.isOwner)).length, cls: 'text-cyan-400   border-cyan-400/25   bg-cyan-400/8'   },
          ].map(({ label, count, cls }) => (
            <span key={label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${cls}`}>
              {count} {label}
            </span>
          ))}
        </div>
      </header>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-[var(--aethel-text-quaternary)]">
          <Users className="h-12 w-12 opacity-30" />
          <p className="text-sm font-medium">No collaborators yet</p>
          <p className="max-w-xs text-xs">
            Share a project to invite collaborators. They will appear here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <MemberCard key={member.userId} member={member} />
          ))}
        </ul>
      )}
    </div>
  );
}
