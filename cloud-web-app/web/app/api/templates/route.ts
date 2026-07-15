/**
 * Project Templates API
 *
 * Gerencia templates pré-aquecidos para criação rápida de projetos.
 * Cada template é um snapshot de um projeto funcional que pode ser
 * clonado instantaneamente para novos usuários.
 *
 * GET - Lista templates disponíveis
 * POST - Cria projeto a partir de template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { checkStorageQuota } from '@/lib/storage-quota';
import { randomUUID } from 'crypto';
import { createComponentLogger } from '@/lib/observability/logger';
import { TEMPLATES } from './templates.data';

const routeLogger = createComponentLogger('api/templates/route');

// ============================================================================
// GET - List Templates
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get('genre');
    const style = searchParams.get('style');

    let templates = TEMPLATES;

    if (genre) {
      templates = templates.filter(t => t.genre === genre);
    }
    if (style) {
      templates = templates.filter(t => t.style === style);
    }

    // Return without file contents (just metadata)
    const templatesMeta = templates.map(({ files, ...meta }) => ({
      ...meta,
      fileCount: files.length,
    }));

    return NextResponse.json({ templates: templatesMeta });
  } catch (error) {
    routeLogger.error('List templates error:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create Project from Template
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { name, template: templateId, style } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Find template
    const template = TEMPLATES.find(t =>
      t.id === templateId ||
      (t.genre === templateId && (!style || t.style === style))
    );

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check storage quota
    const quotaCheck = await checkStorageQuota({
      userId: user.userId,
      additionalBytes: template.estimatedSize,
    });

    if (!quotaCheck.allowed) {
      return NextResponse.json({
        error: 'Storage quota exceeded',
        ...quotaCheck,
      }, { status: 402 });
    }

    // Create project in database
    const projectId = randomUUID();

    const project = await prisma.project.create({
      data: {
        id: projectId,
        name: name.slice(0, 100),
        userId: user.userId,
        description: `Created from ${template.name} template`,
        // Store template info in metadata
      },
    });

    // In production, this would:
    // 1. Copy template files to user's project storage
    // 2. Initialize git repository
    // 3. Create initial commit
    // For now, we return success and let the frontend handle file creation

    return NextResponse.json({
      projectId: project.id,
      name: project.name,
      template: {
        id: template.id,
        name: template.name,
        genre: template.genre,
        style: template.style,
        defaultScene: template.defaultScene,
        files: template.files.map(f => f.path),
      },
      message: 'Project created successfully',
    });
  } catch (error: unknown) {
    routeLogger.error('Create project error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
