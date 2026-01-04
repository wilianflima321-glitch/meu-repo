/**
 * Prisma re-export
 *
 * Alguns endpoints importam `@/lib/prisma`.
 * O client real está em `lib/db.ts`.
 */

export { prisma as default, prisma } from './db';
