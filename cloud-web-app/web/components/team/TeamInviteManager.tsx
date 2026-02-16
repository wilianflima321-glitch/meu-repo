/**
 * Team Invite Manager Component
 * 
 * Interface profissional para convidar e gerenciar
 * membros de projeto/equipe.
 */

'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import {
  Users,
  UserPlus,
  Mail,
  Link2,
  Copy,
  Check,
  X,
  Crown,
  Shield,
  Eye,
  Edit3,
  Trash2,
  Clock,
  Send,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  invitedAt?: string;
  joinedAt?: string;
  lastActive?: string;
}

interface InviteLink {
  id: string;
  code: string;
  role: 'editor' | 'viewer';
  expiresAt: string;
  usageCount: number;
  maxUsage: number | null;
}

interface TeamInviteProps {
  projectId: string;
  currentUserRole?: 'owner' | 'admin' | 'editor' | 'viewer';
  onMemberAdded?: (member: TeamMember) => void;
  onMemberRemoved?: (memberId: string) => void;
}

// ============================================================================
// STYLES
// ============================================================================

const colors = {
  bg: '#0a0a0f',
  surface: '#12121a',
  surfaceHover: '#1a1a25',
  border: '#2a2a3a',
  borderFocus: '#4f46e5',
  text: '#e4e4eb',
  textMuted: '#8b8b9e',
  textDim: '#5a5a6e',
  primary: '#6366f1',
  primaryHover: '#5558e3',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  owner: '#f59e0b',
  admin: '#6366f1',
  editor: '#22c55e',
  viewer: '#8b8b9e',
};

// ============================================================================
// ROLE BADGE
// ============================================================================

const RoleBadge: React.FC<{ role: TeamMember['role'] }> = ({ role }) => {
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
        color: color,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
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

const StatusIndicator: React.FC<{ status: TeamMember['status'] }> = ({ status }) => {
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

// ============================================================================
// MEMBER AVATAR
// ============================================================================

const MemberAvatar: React.FC<{ member: TeamMember; size?: number }> = ({ member, size = 40 }) => {
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
  
  // Generate color from name
  const hue = member.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
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

// ============================================================================
// INVITE EMAIL FORM
// ============================================================================

interface InviteFormProps {
  onInvite: (email: string, role: 'editor' | 'viewer') => Promise<void>;
  isLoading: boolean;
}

const InviteForm: React.FC<InviteFormProps> = ({ onInvite, isLoading }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.includes('@')) {
      setError('Por favor, insira um email válido');
      return;
    }
    
    try {
      await onInvite(email, role);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar convite');
    }
  };
  
  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Email Input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Mail
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textMuted,
            }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              background: colors.surface,
              border: `1px solid ${error ? colors.error : colors.border}`,
              borderRadius: '8px',
              color: colors.text,
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              if (!error) e.target.style.borderColor = colors.borderFocus;
            }}
            onBlur={(e) => {
              if (!error) e.target.style.borderColor = colors.border;
            }}
          />
        </div>
        
        {/* Role Selector */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 12px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.text,
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '110px',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {role === 'editor' ? <Edit3 size={14} /> : <Eye size={14} />}
              {role === 'editor' ? 'Editor' : 'Viewer'}
            </span>
            <ChevronDown size={14} style={{ opacity: 0.6 }} />
          </button>
          
          {showRoleMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '4px',
                zIndex: 100,
                minWidth: '140px',
              }}
            >
              {(['editor', 'viewer'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setShowRoleMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: role === r ? colors.surfaceHover : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: colors.text,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {r === 'editor' ? <Edit3 size={14} /> : <Eye size={14} />}
                  {r === 'editor' ? 'Editor' : 'Viewer'}
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
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            background: isLoading || !email ? colors.textDim : colors.primary,
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isLoading || !email ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {isLoading ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          Enviar
        </button>
      </div>
      
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
            padding: '8px 12px',
            background: colors.error + '15',
            borderRadius: '6px',
            color: colors.error,
            fontSize: '13px',
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
  onCreateLink: (role: 'editor' | 'viewer') => Promise<void>;
  onRevokeLink: (linkId: string) => Promise<void>;
}

const InviteLinkSection: React.FC<InviteLinkSectionProps> = ({
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
  
  const handleCreateLink = async (role: 'editor' | 'viewer') => {
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
        padding: '16px',
        background: colors.surface,
        borderRadius: '12px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link2 size={18} color={colors.primary} />
          <h3 style={{ margin: 0, color: colors.text, fontSize: '14px', fontWeight: 500 }}>
            Links de Convite
          </h3>
        </div>
        
        <button
          onClick={() => handleCreateLink('editor')}
          disabled={isCreating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            color: colors.text,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <UserPlus size={14} />
          Criar Link
        </button>
      </div>
      
      {inviteLinks.length === 0 ? (
        <p style={{ margin: 0, color: colors.textMuted, fontSize: '13px' }}>
          Nenhum link de convite ativo. Crie um para compartilhar.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {inviteLinks.map((link) => {
            const isExpired = new Date(link.expiresAt) < new Date();
            
            return (
              <div
                key={link.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: colors.bg,
                  borderRadius: '8px',
                  opacity: isExpired ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: colors.textMuted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {window.location.origin}/invite/{link.code.substring(0, 8)}...
                </div>
                
                <RoleBadge role={link.role} />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.textMuted, fontSize: '11px' }}>
                  <Clock size={12} />
                  {isExpired ? 'Expirado' : `${Math.ceil((new Date(link.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d`}
                </div>
                
                <button
                  onClick={() => copyLink(link.code, link.id)}
                  style={{
                    padding: '6px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: copiedId === link.id ? colors.success : colors.textMuted,
                    cursor: 'pointer',
                  }}
                  title="Copiar link"
                >
                  {copiedId === link.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
                
                <button
                  onClick={() => onRevokeLink(link.id)}
                  style={{
                    padding: '6px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: colors.textMuted,
                    cursor: 'pointer',
                  }}
                  title="Revogar link"
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
  currentUserRole: 'owner' | 'admin' | 'editor' | 'viewer';
  onChangeRole: (memberId: string, role: TeamMember['role']) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  onResendInvite: (memberId: string) => Promise<void>;
}

const MemberListItem: React.FC<MemberListItemProps> = ({
  member,
  currentUserRole,
  onChangeRole,
  onRemove,
  onResendInvite,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const canManage = currentUserRole === 'owner' || 
    (currentUserRole === 'admin' && member.role !== 'owner' && member.role !== 'admin');
  
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
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '10px',
        background: colors.surface,
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = colors.surfaceHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = colors.surface)}
    >
      <MemberAvatar member={member} />
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              color: colors.text,
              fontWeight: 500,
              fontSize: '14px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {member.name}
          </span>
          <RoleBadge role={member.role} />
        </div>
        <div
          style={{
            color: colors.textMuted,
            fontSize: '12px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {member.email}
        </div>
      </div>
      
      <StatusIndicator status={member.status} />
      
      {canManage && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={isLoading}
            style={{
              padding: '6px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: colors.textMuted,
              cursor: 'pointer',
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
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99,
                }}
                onClick={() => setShowMenu(false)}
              />
              
              {/* Menu */}
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '4px',
                  zIndex: 100,
                  minWidth: '160px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                {member.status === 'pending' && (
                  <button
                    onClick={() => handleAction(() => onResendInvite(member.id))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: colors.text,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <RefreshCw size={14} />
                    Reenviar convite
                  </button>
                )}
                
                {currentUserRole === 'owner' && member.role !== 'owner' && (
                  <>
                    <div style={{ padding: '4px 12px', color: colors.textDim, fontSize: '11px', textTransform: 'uppercase' }}>
                      Alterar função
                    </div>
                    {(['admin', 'editor', 'viewer'] as const).filter(r => r !== member.role).map((role) => (
                      <button
                        key={role}
                        onClick={() => handleAction(() => onChangeRole(member.id, role))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          color: colors.text,
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {role === 'admin' && <Shield size={14} />}
                        {role === 'editor' && <Edit3 size={14} />}
                        {role === 'viewer' && <Eye size={14} />}
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                    <div style={{ height: '1px', background: colors.border, margin: '4px 0' }} />
                  </>
                )}
                
                <button
                  onClick={() => handleAction(() => onRemove(member.id))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: colors.error,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Trash2 size={14} />
                  Remover membro
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const TeamInviteManager: React.FC<TeamInviteProps> = ({
  projectId,
  currentUserRole = 'owner',
  onMemberAdded,
  onMemberRemoved,
}) => {
  const [isInviting, setIsInviting] = useState(false);
  
  // Fetch team members
  const { data: membersData, mutate: mutateMembers } = useSWR<{ success: boolean; data: TeamMember[] }>(
    `/api/projects/${projectId}/members`,
    fetcher,
    { fallbackData: { success: true, data: [] } }
  );
  
  // Fetch invite links
  const { data: linksData, mutate: mutateLinks } = useSWR<{ success: boolean; data: InviteLink[] }>(
    `/api/projects/${projectId}/invite-links`,
    fetcher,
    { fallbackData: { success: true, data: [] } }
  );
  
  const members = membersData?.data || [];
  const inviteLinks = linksData?.data || [];
  
  // Handlers
  const handleInviteByEmail = useCallback(async (email: string, role: 'editor' | 'viewer') => {
    setIsInviting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Erro ao enviar convite');
      }
      
      const { data } = await res.json();
      onMemberAdded?.(data);
      mutateMembers();
    } finally {
      setIsInviting(false);
    }
  }, [projectId, onMemberAdded, mutateMembers]);
  
  const handleCreateLink = useCallback(async (role: 'editor' | 'viewer') => {
    const res = await fetch(`/api/projects/${projectId}/invite-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, expiresIn: 7 * 24 * 60 * 60 * 1000 }), // 7 days
    });
    
    if (!res.ok) throw new Error('Erro ao criar link');
    mutateLinks();
  }, [projectId, mutateLinks]);
  
  const handleRevokeLink = useCallback(async (linkId: string) => {
    await fetch(`/api/projects/${projectId}/invite-links/${linkId}`, {
      method: 'DELETE',
    });
    mutateLinks();
  }, [projectId, mutateLinks]);
  
  const handleChangeRole = useCallback(async (memberId: string, role: TeamMember['role']) => {
    await fetch(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    mutateMembers();
  }, [projectId, mutateMembers]);
  
  const handleRemoveMember = useCallback(async (memberId: string) => {
    await fetch(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
    onMemberRemoved?.(memberId);
    mutateMembers();
  }, [projectId, onMemberRemoved, mutateMembers]);
  
  const handleResendInvite = useCallback(async (memberId: string) => {
    await fetch(`/api/projects/${projectId}/members/${memberId}/resend`, {
      method: 'POST',
    });
  }, [projectId]);
  
  // Group members by status
  const activeMembers = members.filter((m) => m.status === 'active');
  const pendingMembers = members.filter((m) => m.status === 'pending');
  
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '720px',
        margin: '0 auto',
        padding: '24px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            margin: '0 0 4px 0',
            color: colors.text,
            fontSize: '20px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Users size={22} />
          Gerenciar Equipe
        </h2>
        <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>
          Convide colaboradores e gerencie permissões do projeto.
        </p>
      </div>
      
      {/* Invite Form */}
      {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
        <InviteForm onInvite={handleInviteByEmail} isLoading={isInviting} />
      )}
      
      {/* Invite Links */}
      {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
        <InviteLinkSection
          projectId={projectId}
          inviteLinks={inviteLinks}
          onCreateLink={handleCreateLink}
          onRevokeLink={handleRevokeLink}
        />
      )}
      
      {/* Pending Invites */}
      {pendingMembers.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3
            style={{
              margin: '0 0 12px 0',
              color: colors.textMuted,
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Convites Pendentes ({pendingMembers.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            margin: '0 0 12px 0',
            color: colors.textMuted,
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Membros Ativos ({activeMembers.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeMembers.length === 0 ? (
            <div
              style={{
                padding: '32px',
                background: colors.surface,
                borderRadius: '12px',
                textAlign: 'center',
                color: colors.textMuted,
              }}
            >
              <Users size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>Nenhum membro ainda</p>
              <p style={{ margin: 0, fontSize: '13px' }}>
                Convide colaboradores para começar a trabalhar em equipe.
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
