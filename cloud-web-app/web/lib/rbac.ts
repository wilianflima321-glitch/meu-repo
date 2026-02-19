/**
 * RBAC System - Role-Based Access Control para Admin Ops
 * 
 * Sistema Zero Trust: Ninguém deve saber que o admin existe se não tiver permissão.
 * Middleware severo para proteger /ops e /admin routes.
 * 
 * @see PLANO_ACAO_TECNICA_2026.md - Seção 3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from './db';
import { enforceRateLimit } from './server/rate-limit';

// ============================================================================
// TIPOS
// ============================================================================

export type AdminRole = 'owner' | 'super_admin' | 'admin' | 'moderator' | 'support';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  mfaEnabled: boolean;
  lastLoginAt: Date | null;
  isShadowBanned?: boolean;
}

export type AdminPermission =
  // Dashboard
  | 'ops:dashboard:view'
  | 'ops:dashboard:metrics'
  
  // Finanças
  | 'ops:finance:view'
  | 'ops:finance:export'
  | 'ops:finance:refund'
  
  // IA/Agents
  | 'ops:agents:view'
  | 'ops:agents:logs'
  | 'ops:agents:emergency'
  | 'ops:agents:config'
  
  // Infraestrutura
  | 'ops:infra:view'
  | 'ops:infra:restart'
  | 'ops:infra:scale'
  
  // Moderação
  | 'ops:moderation:view'
  | 'ops:moderation:approve'
  | 'ops:moderation:ban'
  | 'ops:moderation:shadowban'
  
  // Usuários
  | 'ops:users:view'
  | 'ops:users:edit'
  | 'ops:users:impersonate'
  | 'ops:users:delete'
  
  // Settings
  | 'ops:settings:view'
  | 'ops:settings:edit'
  | 'ops:settings:feature_flags'
  
  // Super Admin
  | 'ops:all';

// ============================================================================
// PERMISSÕES POR ROLE
// ============================================================================

export const AdminRolePermissions: Record<AdminRole, AdminPermission[]> = {
  owner: ['ops:all'],
  
  super_admin: [
    'ops:dashboard:view',
    'ops:dashboard:metrics',
    'ops:finance:view',
    'ops:finance:export',
    'ops:finance:refund',
    'ops:agents:view',
    'ops:agents:logs',
    'ops:agents:emergency',
    'ops:agents:config',
    'ops:infra:view',
    'ops:infra:restart',
    'ops:infra:scale',
    'ops:moderation:view',
    'ops:moderation:approve',
    'ops:moderation:ban',
    'ops:moderation:shadowban',
    'ops:users:view',
    'ops:users:edit',
    'ops:users:impersonate',
    'ops:users:delete',
    'ops:settings:view',
    'ops:settings:edit',
    'ops:settings:feature_flags',
  ],
  
  admin: [
    'ops:dashboard:view',
    'ops:dashboard:metrics',
    'ops:finance:view',
    'ops:agents:view',
    'ops:agents:logs',
    'ops:infra:view',
    'ops:moderation:view',
    'ops:moderation:approve',
    'ops:moderation:ban',
    'ops:users:view',
    'ops:users:edit',
    'ops:settings:view',
  ],
  
  moderator: [
    'ops:dashboard:view',
    'ops:moderation:view',
    'ops:moderation:approve',
    'ops:moderation:ban',
    'ops:users:view',
  ],
  
  support: [
    'ops:dashboard:view',
    'ops:users:view',
    'ops:users:edit',
  ],
};

// ============================================================================
// FUNÇÕES DE VERIFICAÇÃO
// ============================================================================

/**
 * Verifica se o usuário tem uma permissão específica
 */
export function hasAdminPermission(
  userRole: AdminRole,
  userPermissions: AdminPermission[],
  requiredPermission: AdminPermission
): boolean {
  // Owner tem todas as permissões
  if (userRole === 'owner') return true;
  
  // Checa permissão universal
  if (userPermissions.includes('ops:all')) return true;
  
  // Checa permissão específica
  return userPermissions.includes(requiredPermission);
}

/**
 * Verifica se o usuário pode acessar uma rota do admin
 */
export function canAccessAdminRoute(
  userRole: AdminRole | undefined,
  route: string
): boolean {
  if (!userRole) return false;
  
  const routePermissions: Record<string, AdminPermission> = {
    '/ops': 'ops:dashboard:view',
    '/ops/finance': 'ops:finance:view',
    '/ops/agents': 'ops:agents:view',
    '/ops/infra': 'ops:infra:view',
    '/ops/moderation': 'ops:moderation:view',
    '/ops/users': 'ops:users:view',
    '/ops/settings': 'ops:settings:view',
    '/admin': 'ops:dashboard:view',
    '/admin/finance': 'ops:finance:view',
    '/admin/ai-monitor': 'ops:agents:view',
  };
  
  const requiredPermission = routePermissions[route];
  if (!requiredPermission) {
    // Rota não mapeada - permitir apenas owner
    return userRole === 'owner';
  }
  
  const permissions = AdminRolePermissions[userRole];
  return hasAdminPermission(userRole, permissions, requiredPermission);
}

// ============================================================================
// LISTA DE EMAILS PERMITIDOS (OWNER HARDCODED)
// ============================================================================

// IMPORTANTE: Mantenha isso em variável de ambiente em produção!
const OWNER_EMAILS = (process.env.ADMIN_OWNER_EMAILS || '').split(',').filter(Boolean);

/**
 * Verifica se um email é de um owner (você)
 */
export function isOwnerEmail(email: string): boolean {
  return OWNER_EMAILS.includes(email.toLowerCase());
}

// ============================================================================
// MIDDLEWARE DE PROTEÇÃO
// ============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'aethel-super-secret-key-change-in-production'
);

function extractAuthToken(request: NextRequest): string | null {
  const header = request.headers.get('Authorization') || request.headers.get('authorization');
  if (header && header.startsWith('Bearer ')) {
    return header.replace('Bearer ', '').trim();
  }

  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) return cookieToken;

  const legacyCookieToken = request.cookies.get('auth_token')?.value;
  if (legacyCookieToken) return legacyCookieToken;

  return null;
}

/**
 * Middleware Zero Trust para rotas admin/ops
 * 
 * Se o usuário não tem permissão, retorna 404 (não 403).
 * Isso esconde a existência do admin de usuários não autorizados.
 */
export async function protectAdminRoute(
  request: NextRequest,
  requiredPermission?: AdminPermission
): Promise<NextResponse | null> {
  // Extrai token
  const token = extractAuthToken(request);
  
  if (!token) {
    // Retorna 404 para esconder que a rota existe
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  
  try {
    // Verifica JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    const userId = payload.sub as string;
    const userRole = payload.role as string;
    
    // Verifica se é admin role
    const adminRoles: string[] = ['owner', 'super_admin', 'admin', 'moderator', 'support'];
    if (!adminRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    
    // Se precisa de permissão específica, verifica
    if (requiredPermission) {
      const permissions = AdminRolePermissions[userRole as AdminRole];
      if (!hasAdminPermission(userRole as AdminRole, permissions, requiredPermission)) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      }
    }
    
    // Permissão concedida - retorna null para continuar
    return null;
    
  } catch (error) {
    // Token inválido - 404 para esconder
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
}

/**
 * Higher-order function para proteger API routes do admin
 */
export function withAdminAuth(
  handler: (request: NextRequest, context: { user: AdminUser }) => Promise<NextResponse>,
  requiredPermission?: AdminPermission
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const token = extractAuthToken(request);
    
    if (!token) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      const userId = payload.sub as string;
      const userRole = payload.role as AdminRole;
      
      // Busca usuário no banco
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          mfaEnabled: true,
        },
      });
      
      if (!user) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      }
      
      // Verifica se é admin
      const adminRoles: string[] = ['owner', 'super_admin', 'admin', 'moderator', 'support'];
      if (!adminRoles.includes(user.role)) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      }
      
      // Verifica permissão específica
      if (requiredPermission) {
        const permissions = AdminRolePermissions[user.role as AdminRole];
        if (!hasAdminPermission(user.role as AdminRole, permissions, requiredPermission)) {
          return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        }
      }
      
      // Cria objeto AdminUser
      const adminUser: AdminUser = {
        id: user.id,
        email: user.email,
        name: user.name || 'Admin',
        role: user.role as AdminRole,
        permissions: AdminRolePermissions[user.role as AdminRole],
        mfaEnabled: user.mfaEnabled || false,
        lastLoginAt: null,
      };

      const scopeSuffix = String(requiredPermission || 'ops:dashboard:view')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const rateLimitResponse = await enforceRateLimit({
        scope: `admin-rbac-${scopeSuffix}-${request.method.toLowerCase()}`,
        key: adminUser.id,
        max: request.method.toUpperCase() === 'GET' ? 720 : 240,
        windowMs: 60 * 60 * 1000,
        message: 'Too many admin requests. Please wait before retrying.',
      });
      if (rateLimitResponse) return rateLimitResponse;
      
      // Executa handler
      return handler(request, { user: adminUser });
      
    } catch (error) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  };
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLogEntry {
  action: string;
  actorId: string;
  actorEmail: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Registra ação administrativa no audit log
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        category: 'security',
        severity: 'info',
        adminId: entry.actorId,
        adminEmail: entry.actorEmail,
        adminRole: 'admin',
        targetId: entry.targetId,
        targetType: entry.targetType,
        metadata: entry.details as any,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    console.error('[RBAC] Failed to log admin action:', error);
  }
}

// ============================================================================
// SHADOW BAN SYSTEM
// ============================================================================

/**
 * Aplica shadow ban em um usuário.
 * O usuário não sabe que está banido - a plataforma simplesmente "funciona mal" para ele.
 */
export async function applyShadowBan(
  userId: string, 
  adminId: string, 
  reason: string
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isShadowBanned: true,
        shadowBanReason: reason,
        shadowBannedAt: new Date(),
        shadowBannedBy: adminId,
      },
    });
    
    await logAdminAction({
      action: 'SHADOW_BAN_APPLIED',
      actorId: adminId,
      actorEmail: 'admin',
      targetId: userId,
      targetType: 'user',
      details: { reason },
      timestamp: new Date(),
    });
    
    return true;
  } catch (error) {
    console.error('[RBAC] Failed to apply shadow ban:', error);
    return false;
  }
}

/**
 * Remove shadow ban de um usuário
 */
export async function removeShadowBan(userId: string, adminId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isShadowBanned: false,
        shadowBanReason: null,
        shadowBannedAt: null,
        shadowBannedBy: null,
      },
    });
    
    await logAdminAction({
      action: 'SHADOW_BAN_REMOVED',
      actorId: adminId,
      actorEmail: 'admin',
      targetId: userId,
      targetType: 'user',
      timestamp: new Date(),
    });
    
    return true;
  } catch (error) {
    console.error('[RBAC] Failed to remove shadow ban:', error);
    return false;
  }
}

/**
 * Verifica se um usuário está shadow banned
 * Nota: O campo isShadowBanned será adicionado na próxima migration.
 * Enquanto isso, verificamos se o usuário existe na tabela de bans ou
 * usamos um campo alternativo.
 */
export async function isUserShadowBanned(userId: string): Promise<boolean> {
  try {
    // Verifica no cache de shadow bans (mantido em memória/redis)
    // Após a migration rodar, podemos usar: user.isShadowBanned
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        // @ts-ignore - Campo será adicionado na migration
        isShadowBanned: true 
      },
    });
    
    // @ts-ignore - Campo será adicionado na migration  
    return user?.isShadowBanned ?? false;
  } catch {
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const __defaultExport = {
  hasAdminPermission,
  canAccessAdminRoute,
  protectAdminRoute,
  withAdminAuth,
  logAdminAction,
  applyShadowBan,
  removeShadowBan,
  isUserShadowBanned,
  isOwnerEmail,
  AdminRolePermissions,
};

export default __defaultExport;
