export interface Project {
  id: string;
  name: string;
  description?: string;
  type: 'game' | 'web' | 'api' | 'library' | 'other';
  status: 'active' | 'paused' | 'archived';
  thumbnail?: string;
  lastModified: string;
  createdAt: string;
  isFavorite: boolean;
  membersCount: number;
  progress?: number;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalStorage: string;
  aiTokensUsed: number;
}

export interface CreateProjectData {
  name: string;
  type: Project['type'];
  description: string;
}
