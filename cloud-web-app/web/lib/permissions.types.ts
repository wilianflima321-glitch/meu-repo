export type Permission =
  // Projetos
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'project:export'
  | 'project:share'
  | 'project:collaborate'
  
  // Arquivos
  | 'file:create'
  | 'file:read'
  | 'file:update'
  | 'file:delete'
  | 'file:upload'
  
  // Assets
  | 'asset:create'
  | 'asset:read'
  | 'asset:update'
  | 'asset:delete'
  | 'asset:upload'
  
  // AI/Chat
  | 'ai:chat'
  | 'ai:stream'
  | 'ai:advanced'
  | 'ai:training'
  | 'ai:custom_models'
  
  // Engine
  | 'engine:blueprint'
  | 'engine:vfx'
  | 'engine:terrain'
  | 'engine:animation'
  | 'engine:physics'
  | 'engine:networking'
  | 'engine:raytracing'
  
  // Colaboração
  | 'collab:invite'
  | 'collab:realtime'
  | 'collab:comments'
  | 'collab:review'
  
  // Marketplace
  | 'marketplace:browse'
  | 'marketplace:purchase'
  | 'marketplace:sell'
  | 'marketplace:review'
  
  // Admin
  | 'admin:users'
  | 'admin:billing'
  | 'admin:analytics'
  | 'admin:logs'
  | 'admin:settings'
  | 'admin:all';

export type Role = 
  | 'guest'
  | 'user'
  | 'creator'
  | 'team_member'
  | 'team_admin'
  | 'moderator'
  | 'admin'
  | 'super_admin';

export type PlanTier = 
  | 'free'
  | 'starter'
  | 'basic'
  | 'pro'
  | 'studio'
  | 'enterprise';


export interface PlanLimits {
  maxProjects: number;
  maxFilesPerProject: number;
  maxStorageGB: number;
  maxAssetsPerProject: number;
  maxCollaborators: number;
  aiTokensPerMonth: number;
  aiRequestsPerMinute: number;
  maxBuildMinutesPerMonth: number;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
  features: Permission[];
}


export interface UserContext {
  id: string;
  email: string;
  role: Role;
  plan: PlanTier;
  customPermissions?: Permission[];
  teamRole?: Role;
}

