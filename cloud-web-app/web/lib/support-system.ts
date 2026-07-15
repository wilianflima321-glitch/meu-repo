import { logger } from '@/lib/observability/logger';
/**
 * Sistema de Suporte Completo - Chat + Email
 * 
 * Integração profissional com:
 * - Crisp (Chat ao vivo)
 * - Resend (Email transacional)
 * - Sistema de tickets interno
 * 
 * Usuário escolhe o canal preferido.
 */

import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import type { Prisma } from '@prisma/client';
import { determinePriority } from './support-formatters';
import { notifyTeam, sendReplyNotificationToUser, sendResolutionNotification, sendTicketConfirmation } from './support-notifications';
import type { SupportMessage, SupportTicket, TicketCategory, TicketPriority, TicketStatus, UserPreferences } from './support-types';

export type { SupportMessage, SupportTicket, TicketCategory, TicketPriority, TicketStatus, UserPreferences } from './support-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CRISP_WEBSITE_ID = process.env.CRISP_WEBSITE_ID;
const CRISP_API_ID = process.env.CRISP_API_ID;
const CRISP_API_KEY = process.env.CRISP_API_KEY;

// ============================================================================
// TICKET MANAGEMENT
// ============================================================================

/**
 * Cria um novo ticket de suporte
 */
export async function createTicket(params: {
  userId: string;
  email: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority?: TicketPriority;
  channel?: 'email' | 'chat' | 'web';
  metadata?: Record<string, any>;
}): Promise<SupportTicket> {
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: params.userId,
      email: params.email,
      subject: params.subject,
      message: params.message,
      category: params.category,
      priority: params.priority || determinePriority(params.category, params.message),
      status: 'open',
      channel: params.channel || 'web',
      metadata: params.metadata || {},
    },
  });

  // Criar mensagem inicial
  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: params.userId,
      senderType: 'user',
      content: params.message,
    },
  });

  // Enviar confirmação por email
  await sendTicketConfirmation(ticket as SupportTicket);

  // Notificar equipe
  await notifyTeam(ticket as SupportTicket);

  return ticket as SupportTicket;
}

/**
 * Adiciona resposta a um ticket
 */
export async function addTicketReply(params: {
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'agent';
  content: string;
  attachments?: string[];
}): Promise<SupportMessage> {
  const message = await prisma.supportMessage.create({
    data: {
      ticketId: params.ticketId,
      senderId: params.senderId,
      senderType: params.senderType,
      content: params.content,
      attachments: params.attachments || [],
    },
  });

  // Atualizar ticket
  await prisma.supportTicket.update({
    where: { id: params.ticketId },
    data: {
      status: params.senderType === 'agent' ? 'pending' : 'open',
      updatedAt: new Date(),
    },
  });

  // Notificar a outra parte
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.ticketId },
  });

  if (ticket) {
    if (params.senderType === 'agent') {
      await sendReplyNotificationToUser(ticket as SupportTicket, params.content);
    } else {
      await notifyTeam(ticket as SupportTicket, params.content);
    }
  }

  return message as SupportMessage;
}

/**
 * Atualiza status do ticket
 */
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  agentId?: string
): Promise<SupportTicket> {
  const data: Prisma.SupportTicketUpdateInput = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'resolved' || status === 'closed') {
    data.resolvedAt = new Date();
  }

  if (agentId) {
    data.assignedTo = agentId;
  }

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data,
  });

  // Notificar usuário sobre mudança de status
  if (status === 'resolved') {
    await sendResolutionNotification(ticket as SupportTicket);
  }

  return ticket as SupportTicket;
}

/**
 * Busca tickets de um usuário
 */
export async function getUserTickets(
  userId: string,
  options?: {
    status?: TicketStatus;
    limit?: number;
    offset?: number;
  }
): Promise<SupportTicket[]> {
  const tickets = await prisma.supportTicket.findMany({
    where: {
      userId,
      ...(options?.status && { status: options.status }),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 20,
    skip: options?.offset || 0,
  });

  return tickets as SupportTicket[];
}

/**
 * Busca mensagens de um ticket
 */
export async function getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
  const messages = await prisma.supportMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' },
  });

  return messages as SupportMessage[];
}

// ============================================================================
// CRISP CHAT INTEGRATION
// ============================================================================

/**
 * Configura Crisp para um usuário
 */
export function getCrispConfig(user?: { id: string; email: string; name?: string; plan?: string }) {
  if (!CRISP_WEBSITE_ID) {
    return null;
  }

  return {
    websiteId: CRISP_WEBSITE_ID,
    user: user ? {
      email: user.email,
      nickname: user.name || user.email.split('@')[0],
      data: {
        user_id: user.id,
        plan: user.plan || 'free',
      },
    } : undefined,
  };
}

/**
 * Envia mensagem via Crisp API
 */
export async function sendCrispMessage(
  sessionId: string,
  message: string
): Promise<void> {
  if (!CRISP_API_ID || !CRISP_API_KEY || !CRISP_WEBSITE_ID) {
    throw new Error('Crisp not configured');
  }

  const auth = Buffer.from(`${CRISP_API_ID}:${CRISP_API_KEY}`).toString('base64');

  await fetch(
    `https://api.crisp.chat/v1/website/${CRISP_WEBSITE_ID}/conversation/${sessionId}/message`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'X-Crisp-Tier': 'plugin',
      },
      body: JSON.stringify({
        type: 'text',
        content: message,
        from: 'operator',
        origin: 'chat',
      }),
    }
  );
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

/**
 * Obtém preferências de suporte do usuário
 */
export async function getUserSupportPreferences(userId: string): Promise<UserPreferences> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
    select: {
      supportChannel: true,
      emailNotifications: true,
      chatNotifications: true,
      language: true,
    },
  });

  return {
    preferredChannel: (prefs?.supportChannel as 'chat' | 'email' | 'both') || 'both',
    emailNotifications: prefs?.emailNotifications ?? true,
    chatNotifications: prefs?.chatNotifications ?? true,
    language: prefs?.language || 'pt-BR',
  };
}

/**
 * Atualiza preferências de suporte do usuário
 */
export async function updateUserSupportPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      supportChannel: preferences.preferredChannel || 'both',
      emailNotifications: preferences.emailNotifications ?? true,
      chatNotifications: preferences.chatNotifications ?? true,
      language: preferences.language || 'pt-BR',
    },
    update: {
      ...(preferences.preferredChannel && { supportChannel: preferences.preferredChannel }),
      ...(preferences.emailNotifications !== undefined && { emailNotifications: preferences.emailNotifications }),
      ...(preferences.chatNotifications !== undefined && { chatNotifications: preferences.chatNotifications }),
      ...(preferences.language && { language: preferences.language }),
    },
  });
}

const __defaultExport = {
  createTicket,
  addTicketReply,
  updateTicketStatus,
  getUserTickets,
  getTicketMessages,
  getCrispConfig,
  getUserSupportPreferences,
  updateUserSupportPreferences,
};

export default __defaultExport;
