import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

const handler = async (_req: NextRequest) => {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { email: true } },
    },
  });

  return NextResponse.json({
    success: true,
    feedback: tickets.map((ticket) => ({
      id: ticket.id,
      email: ticket.email ?? ticket.user.email,
      subject: ticket.subject,
      message: ticket.message,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
    })),
  });
};

export const GET = withAdminAuth(handler, 'ops:users:view');
