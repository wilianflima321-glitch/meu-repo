/**
 * Project Member Detail API - Aethel Engine
 * PATCH /api/projects/[id]/members/[memberId] - Atualiza role
 * DELETE /api/projects/[id]/members/[memberId] - Remove membro
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

// PATCH /api/projects/[id]/members/[memberId]
export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string; memberId: string } }
) {
	try {
		const user = requireAuth(request);
		const rateLimitResponse = await enforceRateLimit({
		  scope: 'projects-member-detail-patch',
		  key: user.userId,
		  max: 90,
		  windowMs: 60 * 60 * 1000,
		  message: 'Too many member update attempts. Please wait before retrying.',
		});
		if (rateLimitResponse) return rateLimitResponse;
		await requireEntitlementsForUser(user.userId);
		const { id: projectId, memberId } = params;
		const body = await request.json();
		const { role } = body;

		if (!role || !['viewer', 'editor'].includes(role)) {
			return NextResponse.json(
				{ success: false, error: 'Role must be viewer or editor' },
				{ status: 400 }
			);
		}

		// Verifica se é owner do projeto
		const project = await prisma.project.findFirst({
			where: { id: projectId, userId: user.userId },
			select: { id: true },
		});

		if (!project) {
			return NextResponse.json(
				{ success: false, error: 'Only project owner can update members' },
				{ status: 403 }
			);
		}

		const member = await prisma.projectMember.findFirst({
			where: { id: memberId, projectId },
		});

		if (!member) {
			return NextResponse.json(
				{ success: false, error: 'Member not found' },
				{ status: 404 }
			);
		}

		const updated = await prisma.projectMember.update({
			where: { id: memberId },
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
		});
	} catch (error) {
		console.error('Failed to update member:', error);
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;
		return apiInternalError();
	}
}

// DELETE /api/projects/[id]/members/[memberId]
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string; memberId: string } }
) {
	try {
		const user = requireAuth(request);
		const rateLimitResponse = await enforceRateLimit({
		  scope: 'projects-member-detail-delete',
		  key: user.userId,
		  max: 60,
		  windowMs: 60 * 60 * 1000,
		  message: 'Too many member removal attempts. Please wait before retrying.',
		});
		if (rateLimitResponse) return rateLimitResponse;
		await requireEntitlementsForUser(user.userId);
		const { id: projectId, memberId } = params;

		// Verifica se é owner do projeto
		const project = await prisma.project.findFirst({
			where: { id: projectId, userId: user.userId },
			select: { id: true },
		});

		if (!project) {
			// Se não é owner, pode ser o próprio membro querendo sair
			const selfMember = await prisma.projectMember.findFirst({
				where: { id: memberId, projectId, userId: user.userId },
			});

			if (!selfMember) {
				return NextResponse.json(
					{ success: false, error: 'Only project owner or self can remove' },
					{ status: 403 }
				);
			}

			await prisma.projectMember.delete({
				where: { id: memberId },
			});

			return NextResponse.json({
				success: true,
				message: 'Left project',
			});
		}

		// Owner removendo membro
		const member = await prisma.projectMember.findFirst({
			where: { id: memberId, projectId },
		});

		if (!member) {
			return NextResponse.json(
				{ success: false, error: 'Member not found' },
				{ status: 404 }
			);
		}

		await prisma.projectMember.delete({
			where: { id: memberId },
		});

		return NextResponse.json({
			success: true,
			message: 'Member removed',
		});
	} catch (error) {
		console.error('Failed to remove member:', error);
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;
		return apiInternalError();
	}
}
