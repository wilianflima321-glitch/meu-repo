/**
 * Authentication (Server)
 * Verify JWT tokens and protect API routes.
 */

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

function getJwtSecret(): string {
	const secret = process.env.JWT_SECRET;
	if (!secret || secret === 'your-secret-key-change-in-production') {
		throw Object.assign(
			new Error('AUTH_NOT_CONFIGURED: defina JWT_SECRET (não use default).'),
			{ code: 'AUTH_NOT_CONFIGURED' }
		);
	}
	return secret;
}

export interface AuthUser {
	userId: string;
	email: string;
	role?: string;
}

export function verifyToken(token: string): AuthUser | null {
	try {
		const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
		return decoded;
	} catch {
		return null;
	}
}

export function getUserFromRequest(req: NextRequest): AuthUser | null {
	const authHeader = req.headers.get('authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		// Fallback para cookie (alinha com middleware.ts)
		const cookieToken = req.cookies.get('token')?.value;
		return cookieToken ? verifyToken(cookieToken) : null;
	}

	const token = authHeader.substring(7);
	return verifyToken(token);
}

export function requireAuth(req: NextRequest): AuthUser {
	// Se JWT_SECRET não estiver configurado, isso é erro de servidor (real-or-fail)
	// e não deve ser reportado como "401".
	getJwtSecret();

	const user = getUserFromRequest(req);
	if (!user) {
		throw new Error('Unauthorized');
	}
	return user;
}

export async function verifyProjectOwnership(projectId: string, userId: string): Promise<boolean> {
	const project = await prisma.project.findFirst({
		where: { id: projectId, userId },
	});
	return !!project;
}

export function generateToken(userId: string, email: string): string {
	// role é opcional por compatibilidade, mas recomendado.
	return jwt.sign({ userId, email }, getJwtSecret(), { expiresIn: '7d' });
}

export function generateTokenWithRole(userId: string, email: string, role: string): string {
	return jwt.sign({ userId, email, role }, getJwtSecret(), { expiresIn: '7d' });
}
