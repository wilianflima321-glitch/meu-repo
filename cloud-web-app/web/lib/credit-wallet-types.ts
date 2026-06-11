import type { Prisma } from '@prisma/client';
import type { AIOperationType } from './credit-wallet-costs';

export type CreditMetadata = Prisma.InputJsonObject;

export interface CreditCheckResult {
  allowed: boolean;
  balance: number;
  estimatedCost: number;
  remaining: number;
  reason?: string;
  upgradeRequired?: boolean;
}

export interface CreditReservation {
  reservationId: string;
  userId: string;
  amount: number;
  operationType: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreditDeduction {
  userId: string;
  amount: number;
  operationType: AIOperationType;
  reference?: string;
  metadata?: CreditMetadata;
}

export interface LegacyCreditUser {
  id?: string;
  credits?: number;
  reservedCredits?: number;
  plan?: string;
}

export interface LegacyCreditReservationRecord {
  id: string;
  userId: string;
  amount: number;
  operationType: string;
  createdAt?: Date;
  expiresAt?: Date;
}

export interface LegacyCreditPrismaClient {
  user?: {
    findUnique?: (args: { where: { id: string } }) => Promise<LegacyCreditUser | null>;
    update?: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<LegacyCreditUser>;
  };
  creditReservation?: {
    create?: (args: { data: Omit<LegacyCreditReservationRecord, 'id'> }) => Promise<LegacyCreditReservationRecord>;
    delete?: (args: { where: { id: string } }) => Promise<unknown>;
    deleteMany?: (args: { where: { expiresAt: { lt: Date } } }) => Promise<{ count: number }>;
  };
  creditLedgerEntry?: {
    create?: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}

export function asLegacyCreditPrisma(client: unknown): LegacyCreditPrismaClient {
  return client as LegacyCreditPrismaClient;
}
