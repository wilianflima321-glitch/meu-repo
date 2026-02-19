/**
 * Director Actions API
 * POST /api/ai/director/[projectId]/action
 * 
 * Ações: analyze, dismiss, apply, acknowledge
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { prisma } from '@/lib/db';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

interface ActionPayload {
  action: 'analyze' | 'dismiss' | 'apply' | 'acknowledge';
  noteId?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-director-action-post',
      key: user.userId,
      max: 90,
      windowMs: 60 * 60 * 1000,
      message: 'Too many director action requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { projectId } = await params;
    const body: ActionPayload = await req.json();

    // Verificar projeto
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.userId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    switch (body.action) {
      case 'analyze':
        // Iniciar nova análise (em produção, dispara job assíncrono)
        return NextResponse.json({
          success: true,
          message: 'Analysis started',
          estimatedTime: 15000, // 15 segundos
        });

      case 'dismiss':
        if (!body.noteId) {
          return NextResponse.json({ error: 'noteId required' }, { status: 400 });
        }
        // Log dismissal para melhorar IA
        await logUserFeedback(user.userId, projectId, body.noteId, 'dismissed');
        return NextResponse.json({ success: true, noteId: body.noteId, status: 'dismissed' });

      case 'apply':
        if (!body.noteId) {
          return NextResponse.json({ error: 'noteId required' }, { status: 400 });
        }
        // Em produção, isso aplicaria a sugestão automaticamente
        await logUserFeedback(user.userId, projectId, body.noteId, 'applied');
        return NextResponse.json({ 
          success: true, 
          noteId: body.noteId, 
          status: 'applied',
          message: 'Sugestão aplicada com sucesso' 
        });

      case 'acknowledge':
        if (!body.noteId) {
          return NextResponse.json({ error: 'noteId required' }, { status: 400 });
        }
        return NextResponse.json({ success: true, noteId: body.noteId, status: 'acknowledged' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Director action error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

async function logUserFeedback(
  userId: string,
  projectId: string,
  noteId: string,
  action: string
) {
  // Em produção, salvar em analytics para melhorar modelo
  console.log(`[Director Feedback] User ${userId} ${action} note ${noteId} in project ${projectId}`);
}
