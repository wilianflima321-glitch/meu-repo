export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "active" | "pending" | "inactive";
  invitedAt?: string;
  joinedAt?: string;
  lastActive?: string;
}

export interface InviteLink {
  id: string;
  code: string;
  role: "editor" | "viewer";
  expiresAt: string;
  usageCount: number;
  maxUsage: number | null;
}

export interface TeamInviteProps {
  projectId: string;
  currentUserRole?: TeamMember["role"];
  onMemberAdded?: (member: TeamMember) => void;
  onMemberRemoved?: (memberId: string) => void;
}
