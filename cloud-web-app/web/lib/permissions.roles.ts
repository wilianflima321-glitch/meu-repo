import type { Permission, Role } from './permissions.types'

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

