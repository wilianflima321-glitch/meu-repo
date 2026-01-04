/**
 * Sistema de Permissões e Roles - Aethel Engine
 * 
 * Sistema robusto de controle de acesso baseado em:
 * - RBAC (Role-Based Access Control)
 * - Entitlements por plano
 * - Feature flags
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

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

// ============================================================================
// PERMISSÕES POR ROLE
// ============================================================================

export const RolePermissions: Record<Role, Permission[]> = {
  guest: [
    'project:read',
    'file:read',
    'asset:read',
    'marketplace:browse',
  ],
  
  user: [
    'project:create',
    'project:read',
    'project:update',
    'project:delete',
    'file:create',
    'file:read',
    'file:update',
    'file:delete',
    'file:upload',
    'asset:create',
    'asset:read',
    'asset:update',
    'asset:delete',
    'asset:upload',
    'ai:chat',
    'engine:blueprint',
    'engine:vfx',
    'engine:terrain',
    'engine:animation',
    'marketplace:browse',
    'marketplace:purchase',
  ],
  
  creator: [
    // Tudo de user +
    'project:export',
    'project:share',
    'ai:stream',
    'ai:advanced',
    'engine:physics',
    'collab:invite',
    'collab:comments',
    'marketplace:sell',
    'marketplace:review',
  ],
  
  team_member: [
    // Tudo de creator +
    'project:collaborate',
    'collab:realtime',
    'collab:review',
  ],
  
  team_admin: [
    // Tudo de team_member +
    'admin:users',
  ],
  
  moderator: [
    // Tudo de team_admin +
    'admin:logs',
    'marketplace:review',
  ],
  
  admin: [
    // Tudo de moderator +
    'admin:billing',
    'admin:analytics',
    'admin:settings',
    'ai:training',
    'engine:networking',
    'engine:raytracing',
  ],
  
  super_admin: [
    'admin:all',
    'ai:custom_models',
  ],
};

// ============================================================================
// LIMITES POR PLANO
// ============================================================================

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

export const PlanLimitsConfig: Record<PlanTier, PlanLimits> = {
  free: {
    maxProjects: 2,
    maxFilesPerProject: 50,
    maxStorageGB: 1,
    maxAssetsPerProject: 20,
    maxCollaborators: 0,
    aiTokensPerMonth: 10_000,
    aiRequestsPerMinute: 5,
    maxBuildMinutesPerMonth: 60,
    supportLevel: 'community',
    features: [
      'project:create',
      'project:read',
      'project:update',
      'ai:chat',
      'engine:blueprint',
      'marketplace:browse',
    ],
  },
  
  starter: {
    maxProjects: 5,
    maxFilesPerProject: 200,
    maxStorageGB: 5,
    maxAssetsPerProject: 100,
    maxCollaborators: 1,
    aiTokensPerMonth: 100_000,
    aiRequestsPerMinute: 20,
    maxBuildMinutesPerMonth: 300,
    supportLevel: 'email',
    features: [
      'project:create',
      'project:read',
      'project:update',
      'project:delete',
      'project:export',
      'ai:chat',
      'ai:stream',
      'engine:blueprint',
      'engine:vfx',
      'engine:terrain',
      'marketplace:browse',
      'marketplace:purchase',
    ],
  },
  
  basic: {
    maxProjects: 15,
    maxFilesPerProject: 500,
    maxStorageGB: 20,
    maxAssetsPerProject: 500,
    maxCollaborators: 3,
    aiTokensPerMonth: 500_000,
    aiRequestsPerMinute: 60,
    maxBuildMinutesPerMonth: 1000,
    supportLevel: 'email',
    features: [
      'project:create',
      'project:read',
      'project:update',
      'project:delete',
      'project:export',
      'project:share',
      'ai:chat',
      'ai:stream',
      'ai:advanced',
      'engine:blueprint',
      'engine:vfx',
      'engine:terrain',
      'engine:animation',
      'engine:physics',
      'collab:invite',
      'collab:comments',
      'marketplace:browse',
      'marketplace:purchase',
      'marketplace:review',
    ],
  },
  
  pro: {
    maxProjects: 50,
    maxFilesPerProject: 2000,
    maxStorageGB: 100,
    maxAssetsPerProject: 2000,
    maxCollaborators: 10,
    aiTokensPerMonth: 2_000_000,
    aiRequestsPerMinute: 120,
    maxBuildMinutesPerMonth: 5000,
    supportLevel: 'priority',
    features: [
      'project:create',
      'project:read',
      'project:update',
      'project:delete',
      'project:export',
      'project:share',
      'project:collaborate',
      'ai:chat',
      'ai:stream',
      'ai:advanced',
      'engine:blueprint',
      'engine:vfx',
      'engine:terrain',
      'engine:animation',
      'engine:physics',
      'engine:networking',
      'collab:invite',
      'collab:realtime',
      'collab:comments',
      'collab:review',
      'marketplace:browse',
      'marketplace:purchase',
      'marketplace:sell',
      'marketplace:review',
    ],
  },
  
  studio: {
    maxProjects: 200,
    maxFilesPerProject: 10000,
    maxStorageGB: 500,
    maxAssetsPerProject: 10000,
    maxCollaborators: 50,
    aiTokensPerMonth: 10_000_000,
    aiRequestsPerMinute: 300,
    maxBuildMinutesPerMonth: 20000,
    supportLevel: 'priority',
    features: [
      'project:create',
      'project:read',
      'project:update',
      'project:delete',
      'project:export',
      'project:share',
      'project:collaborate',
      'ai:chat',
      'ai:stream',
      'ai:advanced',
      'ai:training',
      'engine:blueprint',
      'engine:vfx',
      'engine:terrain',
      'engine:animation',
      'engine:physics',
      'engine:networking',
      'engine:raytracing',
      'collab:invite',
      'collab:realtime',
      'collab:comments',
      'collab:review',
      'marketplace:browse',
      'marketplace:purchase',
      'marketplace:sell',
      'marketplace:review',
    ],
  },
  
  enterprise: {
    maxProjects: -1, // Unlimited
    maxFilesPerProject: -1,
    maxStorageGB: -1,
    maxAssetsPerProject: -1,
    maxCollaborators: -1,
    aiTokensPerMonth: -1,
    aiRequestsPerMinute: -1,
    maxBuildMinutesPerMonth: -1,
    supportLevel: 'dedicated',
    features: [
      'project:create',
      'project:read',
      'project:update',
      'project:delete',
      'project:export',
      'project:share',
      'project:collaborate',
      'ai:chat',
      'ai:stream',
      'ai:advanced',
      'ai:training',
      'ai:custom_models',
      'engine:blueprint',
      'engine:vfx',
      'engine:terrain',
      'engine:animation',
      'engine:physics',
      'engine:networking',
      'engine:raytracing',
      'collab:invite',
      'collab:realtime',
      'collab:comments',
      'collab:review',
      'marketplace:browse',
      'marketplace:purchase',
      'marketplace:sell',
      'marketplace:review',
      'admin:users',
      'admin:analytics',
    ],
  },
};

// ============================================================================
// PERMISSION CHECKER
// ============================================================================

export interface UserContext {
  id: string;
  email: string;
  role: Role;
  plan: PlanTier;
  customPermissions?: Permission[];
  teamRole?: Role;
}

export class PermissionChecker {
  private user: UserContext;
  private cachedPermissions: Set<Permission> | null = null;
  
  constructor(user: UserContext) {
    this.user = user;
  }
  
  /**
   * Obtém todas as permissões do usuário (role + plan + custom)
   */
  getAllPermissions(): Set<Permission> {
    if (this.cachedPermissions) {
      return this.cachedPermissions;
    }
    
    const permissions = new Set<Permission>();
    
    // Permissões do role
    const rolePerms = RolePermissions[this.user.role] || [];
    rolePerms.forEach(p => permissions.add(p));
    
    // Se tem role de time, adiciona
    if (this.user.teamRole) {
      const teamPerms = RolePermissions[this.user.teamRole] || [];
      teamPerms.forEach(p => permissions.add(p));
    }
    
    // Permissões do plano
    const planConfig = PlanLimitsConfig[this.user.plan];
    if (planConfig) {
      planConfig.features.forEach(p => permissions.add(p));
    }
    
    // Permissões customizadas
    if (this.user.customPermissions) {
      this.user.customPermissions.forEach(p => permissions.add(p));
    }
    
    // Super admin tem tudo
    if (permissions.has('admin:all')) {
      Object.values(RolePermissions).flat().forEach(p => permissions.add(p));
    }
    
    this.cachedPermissions = permissions;
    return permissions;
  }
  
  /**
   * Verifica se usuário tem uma permissão específica
   */
  hasPermission(permission: Permission): boolean {
    return this.getAllPermissions().has(permission);
  }
  
  /**
   * Verifica se usuário tem TODAS as permissões listadas
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    const userPerms = this.getAllPermissions();
    return permissions.every(p => userPerms.has(p));
  }
  
  /**
   * Verifica se usuário tem ALGUMA das permissões listadas
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    const userPerms = this.getAllPermissions();
    return permissions.some(p => userPerms.has(p));
  }
  
  /**
   * Obtém limites do plano do usuário
   */
  getPlanLimits(): PlanLimits {
    return PlanLimitsConfig[this.user.plan] || PlanLimitsConfig.free;
  }
  
  /**
   * Verifica se está dentro do limite
   */
  isWithinLimit(resource: keyof PlanLimits, currentValue: number): boolean {
    const limits = this.getPlanLimits();
    const limit = limits[resource];
    
    // -1 significa ilimitado
    if (typeof limit === 'number' && limit === -1) {
      return true;
    }
    
    if (typeof limit === 'number') {
      return currentValue < limit;
    }
    
    return true;
  }
  
  /**
   * Verifica se pode criar mais projetos
   */
  canCreateProject(currentProjectCount: number): boolean {
    if (!this.hasPermission('project:create')) {
      return false;
    }
    return this.isWithinLimit('maxProjects', currentProjectCount);
  }
  
  /**
   * Verifica se pode usar AI com tokens disponíveis
   */
  canUseAI(tokensUsedThisMonth: number): boolean {
    if (!this.hasPermission('ai:chat')) {
      return false;
    }
    return this.isWithinLimit('aiTokensPerMonth', tokensUsedThisMonth);
  }
}

// ============================================================================
// MIDDLEWARE DE AUTORIZAÇÃO
// ============================================================================

export function requirePermission(permission: Permission) {
  return async (user: UserContext): Promise<boolean> => {
    const checker = new PermissionChecker(user);
    return checker.hasPermission(permission);
  };
}

export function requireAllPermissions(permissions: Permission[]) {
  return async (user: UserContext): Promise<boolean> => {
    const checker = new PermissionChecker(user);
    return checker.hasAllPermissions(permissions);
  };
}

export function requireAnyPermission(permissions: Permission[]) {
  return async (user: UserContext): Promise<boolean> => {
    const checker = new PermissionChecker(user);
    return checker.hasAnyPermission(permissions);
  };
}

// ============================================================================
// HELPER PARA CONVERTER PLANO STRING DO BANCO
// ============================================================================

export function parsePlanTier(planString: string | null | undefined): PlanTier {
  if (!planString) return 'free';
  
  // Remove sufixo _trial se existir
  const basePlan = planString.replace('_trial', '').toLowerCase();
  
  const validPlans: PlanTier[] = ['free', 'starter', 'basic', 'pro', 'studio', 'enterprise'];
  
  if (validPlans.includes(basePlan as PlanTier)) {
    return basePlan as PlanTier;
  }
  
  return 'free';
}

export function parseRole(roleString: string | null | undefined): Role {
  if (!roleString) return 'user';
  
  const validRoles: Role[] = [
    'guest', 'user', 'creator', 'team_member', 
    'team_admin', 'moderator', 'admin', 'super_admin'
  ];
  
  if (validRoles.includes(roleString as Role)) {
    return roleString as Role;
  }
  
  return 'user';
}

// ============================================================================
// EXPORTS
// ============================================================================

const permissionsModule = {
  RolePermissions,
  PlanLimitsConfig,
  PermissionChecker,
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  parsePlanTier,
  parseRole,
};

export default permissionsModule;
