import type { PlanTier, Role } from './permissions.types'

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

