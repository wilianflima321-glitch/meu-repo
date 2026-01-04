/**
 * Collaboration Rooms API - Aethel Engine
 * GET /api/collaboration/rooms - Lista salas ativas
 * POST /api/collaboration/rooms - Cria sala
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';

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

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    // Filtra salas do projeto ou todas que o usuário participa
    const userRooms = Array.from(rooms.values()).filter(room => {
      if (projectId) {
        return room.projectId === projectId;
      }
      return room.participants.includes(user.userId);
    });
    
    return NextResponse.json({
      success: true,
      rooms: userRooms,
    });
  } catch (error) {
    console.error('Failed to list rooms:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { name, type = 'project', projectId, fileId, maxParticipants } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Se tem projectId, verifica se usuário tem acesso
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: user.userId },
      });
      
      if (!project) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }
    }
    
    const room = {
      id: `room_${Date.now()}`,
      name,
      type,
      projectId,
      fileId,
      maxParticipants,
      participants: [user.userId],
      createdAt: new Date(),
    };
    
    rooms.set(room.id, room);
    
    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error('Failed to create room:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
