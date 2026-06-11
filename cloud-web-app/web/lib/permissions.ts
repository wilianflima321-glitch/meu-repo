import type { Permission, PlanLimits, PlanTier, Role, UserContext } from './permissions.types'
import { PlanLimitsConfig } from './permissions.plans'
import { parsePlanTier, parseRole } from './permissions.parsers'
import { RolePermissions } from './permissions.roles'

export type { Permission, PlanLimits, PlanTier, Role, UserContext } from './permissions.types'
export { PlanLimitsConfig } from './permissions.plans'
export { parsePlanTier, parseRole } from './permissions.parsers'
export { RolePermissions } from './permissions.roles'

// ============================================================================
// PERMISSION CHECKER
// ============================================================================

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
