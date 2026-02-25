import React from 'react';
import Image from 'next/image';
import { Crown, Edit3, Eye, Shield } from 'lucide-react';
import { teamInviteColors as colors } from './TeamInviteManager.theme';
import type { TeamMember } from './TeamInviteManager.types';

export const RoleBadge: React.FC<{ role: TeamMember['role'] }> = ({ role }) => {
  const config = {
    owner: { icon: Crown, color: colors.owner, label: 'Owner' },
    admin: { icon: Shield, color: colors.admin, label: 'Admin' },
    editor: { icon: Edit3, color: colors.editor, label: 'Editor' },
    viewer: { icon: Eye, color: colors.viewer, label: 'Viewer' },
  };

  const { icon: Icon, color, label } = config[role];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 500,
        borderRadius: '4px',
        background: color + '15',
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
};

export const StatusIndicator: React.FC<{ status: TeamMember['status'] }> = ({ status }) => {
  const config = {
    active: { color: colors.success, label: 'Active' },
    pending: { color: colors.warning, label: 'Pending' },
    inactive: { color: colors.textDim, label: 'Inactive' },
  };

  const { color, label } = config[status];

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: color,
        }}
      />
      <span style={{ fontSize: '12px', color: colors.textMuted }}>{label}</span>
    </span>
  );
};

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
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
    );
  }

  const hue = member.name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  const bgColor = `hsl(${hue}, 50%, 30%)`;
  const textColor = `hsl(${hue}, 50%, 80%)`;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: textColor,
        fontWeight: 600,
        fontSize: size * 0.4,
      }}
    >
      {member.name.charAt(0).toUpperCase()}
    </div>
  );
};
