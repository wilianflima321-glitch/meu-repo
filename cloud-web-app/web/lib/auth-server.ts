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
			new Error('AUTH_NOT_CONFIGURED: set JWT_SECRET (do not use default).'),
			{ code: 'AUTH_NOT_CONFIGURED' }
		);
	}
	return secret;
}

export interface AuthUser {
	userId: string;
	email: string;
	role?: string;
	plan?: string;
	isPro?: boolean;
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
		const cookieToken = req.cookies.get('token')?.value;
		return cookieToken ? verifyToken(cookieToken) : null;
	}

	const token = authHeader.substring(7);
	return verifyToken(token);
}

export function requireAuth(req: NextRequest): AuthUser {
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

function buildPlanClaims(plan?: string): Pick<AuthUser, 'plan' | 'isPro'> {
	if (!plan) return {};
	const normalized = plan.toLowerCase();
	return {
		plan: normalized,
		isPro: normalized.includes('pro') || normalized.includes('studio') || normalized.includes('enterprise'),
	};
}

export function generateToken(userId: string, email: string): string {
	return jwt.sign({ userId, email }, getJwtSecret(), { expiresIn: '7d' });
}

export function generateTokenWithRole(userId: string, email: string, role: string, plan?: string): string {
	return jwt.sign({ userId, email, role, ...buildPlanClaims(plan) }, getJwtSecret(), { expiresIn: '7d' });
}
