import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

const handler = async (_req: NextRequest) => {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { email: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({
    success: true,
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      email: ticket.email ?? ticket.user.email,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      messageCount: ticket._count.messages,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    })),
  });
};

export const GET = withAdminAuth(handler, 'ops:users:view');
