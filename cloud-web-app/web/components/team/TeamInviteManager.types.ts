export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type TeamStatus = 'active' | 'pending' | 'inactive';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: TeamRole;
  status: TeamStatus;
  invitedAt?: string;
  joinedAt?: string;
  lastActive?: string;
}

export interface InviteLink {
  id: string;
  code: string;
  role: 'editor' | 'viewer';
  expiresAt: string;
  usageCount: number;
  maxUsage: number | null;
}

export interface TeamInviteProps {
  projectId: string;
  currentUserRole?: TeamRole;
  onMemberAdded?: (member: TeamMember) => void;
  onMemberRemoved?: (memberId: string) => void;
}
