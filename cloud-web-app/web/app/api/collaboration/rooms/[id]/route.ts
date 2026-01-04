/**
 * Collaboration Room Detail API - Aethel Engine
 * GET /api/collaboration/rooms/[id] - Detalhes da sala
 * POST /api/collaboration/rooms/[id]/join - Entrar na sala
 * POST /api/collaboration/rooms/[id]/leave - Sair da sala
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

// In-memory rooms (em produção, usar Redis)
const rooms = new Map<string, {
  id: string;
  name: string;
  type: string;
  projectId?: string;
  participants: string[];
  createdAt: Date;
}>();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { id } = params;
    
    const room = rooms.get(id);
    
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }
    
    // Em produção, buscar presença real via WebSocket/Redis
    const presence = room.participants.map(userId => ({
      userId,
      status: 'online',
      lastSeen: new Date(),
    }));
    
    return NextResponse.json({
      success: true,
      room,
      presence,
    });
  } catch (error) {
    console.error('Failed to get room:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
