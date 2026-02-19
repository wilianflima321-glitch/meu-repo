/**
 * Notifications API - Aethel Engine
 * GET /api/notifications - Lista notificações do usuário
 * POST /api/notifications - Cria notificação
 * PATCH /api/notifications - Marca como lida
 * DELETE /api/notifications - Remove notificações
 * 
 * IMPLEMENTAÇÃO REAL com persistência no banco de dados.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'notifications-get',
      key: user.userId,
      max: 900,
      windowMs: 60 * 60 * 1000,
      message: 'Too many notification fetch requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const cursor = searchParams.get('cursor');
    
    // Buscar notificações do banco de dados
    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // +1 para verificar se há mais
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    
    const hasMore = notifications.length > limit;
    const results = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;
    
    // Contar não lidas
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.userId,
        read: false,
      },
    });
    
    return NextResponse.json({
      success: true,
      notifications: results,
      unreadCount,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'notifications-post',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many notification create requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json();
    const { type, title, message, data, userId } = body;
    
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Criar notificação no banco de dados
    const notification = await prisma.notification.create({
      data: {
        type: type || 'info',
        title,
        message: message || null,
        data: data || null,
        userId: userId || user.userId,
        read: false,
      },
    });
    
    return NextResponse.json({
      success: true,
      notification,
      realtimeDispatch: {
        delivered: false,
        reason: 'WEBSOCKET_DISPATCH_DEFERRED',
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'notifications-patch',
      key: user.userId,
      max: 600,
      windowMs: 60 * 60 * 1000,
      message: 'Too many notification update requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json();
    const { ids, markAllRead } = body;
    
    if (markAllRead) {
      // Marca todas como lidas
      await prisma.notification.updateMany({
        where: {
          userId: user.userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      // Marca específicas como lidas
      await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          userId: user.userId, // Garantir que só pode atualizar as próprias
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Provide ids array or markAllRead: true' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to update notifications:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'notifications-delete',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many notification delete requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';
    const deleteRead = searchParams.get('read') === 'true';
    
    if (deleteAll) {
      // Deletar todas
      await prisma.notification.deleteMany({
        where: { userId: user.userId },
      });
    } else if (deleteRead) {
      // Deletar apenas as lidas
      await prisma.notification.deleteMany({
        where: {
          userId: user.userId,
          read: true,
        },
      });
    } else if (id) {
      // Deletar específica
      await prisma.notification.delete({
        where: {
          id,
          userId: user.userId,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Provide id, all=true, or read=true' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      deletedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to delete notifications:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
