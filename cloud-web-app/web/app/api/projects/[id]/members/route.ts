/**
 * Project Members API - Aethel Engine
 * GET /api/projects/[id]/members - Lista membros
 * POST /api/projects/[id]/members - Adiciona membro
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_PROJECT_ID_LENGTH = 120;
const normalizeProjectId = (value?: string) => String(value ?? '').trim();

// GET /api/projects/[id]/members
export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const user = requireAuth(request);
		const rateLimitResponse = await enforceRateLimit({
		  scope: 'projects-members-get',
		  key: user.userId,
		  max: 180,
		  windowMs: 60 * 60 * 1000,
		  message: 'Too many project members requests. Please try again later.',
		});
		if (rateLimitResponse) return rateLimitResponse;
		const entitlements = await requireEntitlementsForUser(user.userId);
		const projectId = normalizeProjectId(params?.id);
		if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
			return NextResponse.json(
				{ success: false, error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
				{ status: 400 }
			);
		}

		

		// Verifica se tem acesso ao projeto (owner ou membro)
		const project = await prisma.project.findFirst({
			where: {
				id: projectId,
				OR: [
					{ userId: user.userId },
					{ members: { some: { userId: user.userId } } },
				],
			},
			select: { id: true, userId: true, name: true },
		});

		if (!project) {
			return NextResponse.json(
				{ success: false, error: 'Project not found' },
				{ status: 404 }
			);
		}

		const members = await prisma.projectMember.findMany({
			where: { projectId },
			select: {
				id: true,
				userId: true,
				role: true,
				createdAt: true,
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						avatar: true,
					},
				},
			},
			orderBy: { createdAt: 'asc' },
		});

		// Inclui o owner na lista
		const owner = await prisma.user.findUnique({
			where: { id: project.userId },
			select: { id: true, name: true, email: true, avatar: true },
		});

		return NextResponse.json({
			success: true,
			projectId,
			owner: owner ? { ...owner, role: 'owner' } : null,
			members: members.map((m) => ({
				id: m.id,
				userId: m.userId,
				role: m.role,
				createdAt: m.createdAt,
				user: m.user,
			})),
			collaboratorsLimit: entitlements.plan.limits.collaborators,
		});
	} catch (error) {
		console.error('Failed to list members:', error);
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;
		return apiInternalError();
	}
}

// POST /api/projects/[id]/members - Adiciona membro
export async function POST(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const user = requireAuth(request);
		const rateLimitResponse = await enforceRateLimit({
		  scope: 'projects-members-post',
		  key: user.userId,
		  max: 60,
		  windowMs: 60 * 60 * 1000,
		  message: 'Too many member invitation attempts. Please wait before retrying.',
		});
		if (rateLimitResponse) return rateLimitResponse;
		const entitlements = await requireEntitlementsForUser(user.userId);
		const projectId = normalizeProjectId(params?.id);
		if (!projectId || projectId.length > MAX_PROJECT_ID_LENGTH) {
			return NextResponse.json(
				{ success: false, error: 'INVALID_PROJECT_ID', message: 'projectId is required and must be under 120 characters.' },
				{ status: 400 }
			);
		}

		
		const body = await request.json();
		const { email, role = 'viewer' } = body;

		if (!email) {
			return NextResponse.json(
				{ success: false, error: 'Email is required' },
				{ status: 400 }
			);
		}

		if (!['viewer', 'editor'].includes(role)) {
			return NextResponse.json(
				{ success: false, error: 'Role must be viewer or editor' },
				{ status: 400 }
			);
		}

		// Verifica se é owner do projeto
		const project = await prisma.project.findFirst({
			where: { id: projectId, userId: user.userId },
			select: { id: true, userId: true },
		});

		if (!project) {
			return NextResponse.json(
				{ success: false, error: 'Only project owner can add members' },
				{ status: 403 }
			);
		}

		// Verifica limite de colaboradores do plano
		const collaboratorsLimit = entitlements.plan.limits.collaborators;
		if (collaboratorsLimit !== -1) {
			const currentCount = await prisma.projectMember.count({
				where: { projectId },
			});
			if (currentCount >= collaboratorsLimit) {
				return NextResponse.json(
					{
						success: false,
						error: 'COLLABORATOR_LIMIT_REACHED',
						message: `Limite de ${collaboratorsLimit} colaboradores atingido. Faça upgrade para adicionar mais.`,
						plan: entitlements.plan.id,
					},
					{ status: 402 }
				);
			}
		}

		// Busca usuário pelo email
		const targetUser = await prisma.user.findUnique({
			where: { email: email.toLowerCase().trim() },
			select: { id: true, name: true, email: true, avatar: true },
		});

		if (!targetUser) {
			return NextResponse.json(
				{ success: false, error: 'User not found with this email' },
				{ status: 404 }
			);
		}

		// Não pode adicionar o próprio owner
		if (targetUser.id === project.userId) {
			return NextResponse.json(
				{ success: false, error: 'Cannot add project owner as member' },
				{ status: 400 }
			);
		}

		// Verifica se já é membro
		const existing = await prisma.projectMember.findUnique({
			where: { projectId_userId: { projectId, userId: targetUser.id } },
		});

		if (existing) {
			// Atualiza role se diferente
			if (existing.role !== role) {
				const updated = await prisma.projectMember.update({
					where: { id: existing.id },
					data: { role },
					select: {
						id: true,
						userId: true,
						role: true,
						createdAt: true,
						user: {
							select: { id: true, name: true, email: true, avatar: true },
						},
					},
				});
				return NextResponse.json({
					success: true,
					member: updated,
					message: 'Member role updated',
				});
			}
			return NextResponse.json(
				{ success: false, error: 'User is already a member' },
				{ status: 409 }
			);
		}

		// Adiciona membro
		const member = await prisma.projectMember.create({
			data: {
				projectId,
				userId: targetUser.id,
				role,
			},
			select: {
				id: true,
				userId: true,
				role: true,
				createdAt: true,
				user: {
					select: { id: true, name: true, email: true, avatar: true },
				},
			},
		});

		return NextResponse.json({
			success: true,
			member,
		}, { status: 201 });
	} catch (error) {
		console.error('Failed to add member:', error);
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;
		return apiInternalError();
	}
}
