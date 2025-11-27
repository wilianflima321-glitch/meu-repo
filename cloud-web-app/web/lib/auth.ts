/**
 * Authentication Middleware
 * Verify JWT tokens and protect routes
 */

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthUser {
  userId: string;
  email: string;
}

/**
 * Verify JWT token from request
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Get user from request Authorization header
 */
export function getUserFromRequest(req: NextRequest): AuthUser | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}

/**
 * Require authentication - throws if not authenticated
 */
export function requireAuth(req: NextRequest): AuthUser {
  const user = getUserFromRequest(req);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Verify project ownership
 */
export async function verifyProjectOwnership(
  projectId: string,
  userId: string
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  return !!project;
}

/**
 * Generate JWT token
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}
