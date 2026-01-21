import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

const THREAD_TITLE = 'Admin Priority Chat';

type ChatMessageItem = {
  id: string;
  text: string;
  sender: string;
  priority: string;
  createdAt: string;
};

export const GET = withAdminAuth(
  async (_, { user }) => {
    try {
      const thread = await prisma.chatThread.findFirst({
        where: { userId: user.id, title: THREAD_TITLE },
        orderBy: { createdAt: 'asc' },
      });

      if (!thread) {
        return NextResponse.json({ threadId: null, messages: [] as ChatMessageItem[] });
      }

      const messages = await prisma.chatMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });

      const items: ChatMessageItem[] = messages.map((msg) => ({
        id: msg.id,
        text: msg.content,
        sender: msg.role,
        priority: (msg.metadata as any)?.priority || 'normal',
        createdAt: msg.createdAt.toISOString(),
      }));

      return NextResponse.json({ threadId: thread.id, messages: items });
    } catch (error) {
      console.error('[Admin Chat] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
    }
  },
  'ops:agents:logs'
);

export const POST = withAdminAuth(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { text, priority } = body as { text?: string; priority?: string };
      if (!text) {
        return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
      }

      let thread = await prisma.chatThread.findFirst({
        where: { userId: user.id, title: THREAD_TITLE },
        orderBy: { createdAt: 'asc' },
      });

      if (!thread) {
        thread = await prisma.chatThread.create({
          data: { userId: user.id, title: THREAD_TITLE },
        });
      }

      const message = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          role: 'user',
          content: text,
          metadata: { priority: priority || 'normal', channel: 'admin' } as any,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'ADMIN_CHAT_MESSAGE',
          category: 'system',
          severity: 'info',
          adminId: user.id,
          adminEmail: user.email,
          adminRole: user.role,
          resource: 'admin-chat',
          metadata: { messageId: message.id, priority: priority || 'normal' },
        },
      });

      return NextResponse.json({ messageId: message.id });
    } catch (error) {
      console.error('[Admin Chat] Error:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
  },
  'ops:agents:logs'
);
