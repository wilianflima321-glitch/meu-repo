/**
 * Notifications API - Aethel Engine
 * GET /api/notifications - Lista notificações do usuário
 * POST /api/notifications - Cria notificação
 * PATCH /api/notifications - Marca como lida
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Em produção, buscar do banco de dados
    // Por enquanto, retorna lista vazia
    const notifications: any[] = [];
    
    return NextResponse.json({
      success: true,
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
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
    const body = await request.json();
    const { type, title, message, data, userId } = body;
    
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }
    
    const notification = {
      id: `notif_${Date.now()}`,
      type: type || 'info',
      title,
      message,
      data,
      userId: userId || user.userId,
      read: false,
      createdAt: new Date(),
    };
    
    // Em produção, salvar no banco e enviar via WebSocket
    
    return NextResponse.json({
      success: true,
      notification,
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
    const body = await request.json();
    const { ids, markAllRead } = body;
    
    if (markAllRead) {
      // Marca todas como lidas
      console.log(`[Notifications] Mark all as read for ${user.userId}`);
    } else if (ids && Array.isArray(ids)) {
      // Marca específicas como lidas
      console.log(`[Notifications] Mark ${ids.length} as read for ${user.userId}`);
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
