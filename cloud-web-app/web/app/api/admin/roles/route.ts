import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

const handler = async (_req: NextRequest) => {
  const [roles, adminRoles] = await Promise.all([
    prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    }),
    prisma.user.groupBy({
      by: ['adminRole'],
      _count: { adminRole: true },
      where: { adminRole: { not: null } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    roles: roles.map((role) => ({
      role: role.role,
      count: role._count.role,
    })),
    adminRoles: adminRoles.map((role) => ({
      role: role.adminRole,
      count: role._count.adminRole,
    })),
  });
};

export const GET = withAdminAuth(handler, 'ops:users:view');
