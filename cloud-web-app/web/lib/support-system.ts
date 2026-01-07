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

// ============================================================================
// CONFIGURATION
// ============================================================================

const resend = new Resend(process.env.RESEND_API_KEY);

const CRISP_WEBSITE_ID = process.env.CRISP_WEBSITE_ID;
const CRISP_API_ID = process.env.CRISP_API_ID;
const CRISP_API_KEY = process.env.CRISP_API_KEY;

const SUPPORT_EMAIL = 'support@aethel.dev';
const NOREPLY_EMAIL = 'noreply@aethel.dev';

// ============================================================================
// TYPES
// ============================================================================

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketCategory = 
  | 'billing' 
  | 'technical' 
  | 'account' 
  | 'feature_request' 
  | 'bug_report' 
  | 'other';

export interface SupportTicket {
  id: string;
  userId: string;
  email: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  channel: 'email' | 'chat' | 'web';
  assignedTo?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'agent' | 'system';
  content: string;
  attachments?: string[];
  createdAt: Date;
}

export interface UserPreferences {
  preferredChannel: 'chat' | 'email' | 'both';
  emailNotifications: boolean;
  chatNotifications: boolean;
  language: string;
}

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
  const data: any = {
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
// EMAIL NOTIFICATIONS
// ============================================================================

/**
 * Envia confirmação de ticket criado
 */
async function sendTicketConfirmation(ticket: SupportTicket): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Support] Resend not configured, skipping email');
    return;
  }

  try {
    await resend.emails.send({
      from: NOREPLY_EMAIL,
      to: ticket.email,
      subject: `[Ticket #${ticket.id.slice(-6)}] ${ticket.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Aethel Engine</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Suporte ao Cliente</p>
            </div>
            <div class="content">
              <h2>Recebemos sua solicitação!</h2>
              <p>Obrigado por entrar em contato. Nossa equipe responderá em breve.</p>
              
              <div class="ticket-info">
                <p><strong>Ticket:</strong> #${ticket.id.slice(-6)}</p>
                <p><strong>Assunto:</strong> ${ticket.subject}</p>
                <p><strong>Categoria:</strong> ${formatCategory(ticket.category)}</p>
                <p><strong>Prioridade:</strong> ${formatPriority(ticket.priority)}</p>
              </div>
              
              <p><strong>Sua mensagem:</strong></p>
              <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 10px 0;">
                ${ticket.message}
              </div>
              
              <p>Você pode acompanhar o status do seu ticket ou adicionar mais informações respondendo este email.</p>
              
              <a href="${process.env.NEXTAUTH_URL}/support/tickets/${ticket.id}" class="button">
                Ver Ticket
              </a>
            </div>
            <div class="footer">
              <p>Aethel Engine - Cloud Game Development Platform</p>
              <p>Este é um email automático. Para suporte, responda este email ou use o chat.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('[Support] Failed to send confirmation email:', error);
  }
}

/**
 * Envia notificação de resposta ao usuário
 */
async function sendReplyNotificationToUser(
  ticket: SupportTicket,
  reply: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  try {
    await resend.emails.send({
      from: SUPPORT_EMAIL,
      to: ticket.email,
      subject: `Re: [Ticket #${ticket.id.slice(-6)}] ${ticket.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .reply { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h2>Nova resposta no seu ticket</h2>
              <p>Nossa equipe respondeu ao seu ticket #${ticket.id.slice(-6)}:</p>
              
              <div class="reply">
                ${reply.replace(/\n/g, '<br>')}
              </div>
              
              <a href="${process.env.NEXTAUTH_URL}/support/tickets/${ticket.id}" class="button">
                Responder
              </a>
              
              <p style="margin-top: 20px; color: #6b7280;">
                Você também pode responder diretamente a este email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('[Support] Failed to send reply notification:', error);
  }
}

/**
 * Envia notificação de resolução
 */
async function sendResolutionNotification(ticket: SupportTicket): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  try {
    await resend.emails.send({
      from: NOREPLY_EMAIL,
      to: ticket.email,
      subject: `[Resolvido] Ticket #${ticket.id.slice(-6)} - ${ticket.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f0fdf4; padding: 30px; border: 1px solid #86efac; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h2 style="color: #166534;">✓ Ticket Resolvido</h2>
              <p>Seu ticket #${ticket.id.slice(-6)} foi marcado como resolvido.</p>
              <p><strong>Assunto:</strong> ${ticket.subject}</p>
              
              <p>Se você ainda precisar de ajuda, pode reabrir este ticket respondendo este email ou criando um novo.</p>
              
              <hr style="border: none; border-top: 1px solid #86efac; margin: 20px 0;">
              
              <p style="color: #6b7280;">
                <strong>Ficamos felizes em ajudar!</strong><br>
                Se tiver um momento, avalie nosso atendimento.
              </p>
              
              <div style="margin-top: 20px;">
                <a href="${process.env.NEXTAUTH_URL}/support/feedback?ticket=${ticket.id}&rating=5" style="text-decoration: none; margin-right: 10px;">😊 Ótimo</a>
                <a href="${process.env.NEXTAUTH_URL}/support/feedback?ticket=${ticket.id}&rating=3" style="text-decoration: none; margin-right: 10px;">😐 OK</a>
                <a href="${process.env.NEXTAUTH_URL}/support/feedback?ticket=${ticket.id}&rating=1" style="text-decoration: none;">😞 Ruim</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('[Support] Failed to send resolution notification:', error);
  }
}

/**
 * Notifica a equipe sobre novo ticket
 */
async function notifyTeam(ticket: SupportTicket, newMessage?: string): Promise<void> {
  // Slack notification
  if (process.env.SLACK_SUPPORT_WEBHOOK) {
    try {
      await fetch(process.env.SLACK_SUPPORT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newMessage 
            ? `📩 Nova resposta no ticket #${ticket.id.slice(-6)}`
            : `🎫 Novo ticket de suporte`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: newMessage
                  ? `*📩 Nova resposta no ticket #${ticket.id.slice(-6)}*`
                  : `*🎫 Novo ticket de suporte*\n\n*Assunto:* ${ticket.subject}\n*Categoria:* ${formatCategory(ticket.category)}\n*Prioridade:* ${formatPriority(ticket.priority)}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `>${(newMessage || ticket.message).substring(0, 200)}${(newMessage || ticket.message).length > 200 ? '...' : ''}`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Ver Ticket' },
                  url: `${process.env.NEXTAUTH_URL}/admin/support/tickets/${ticket.id}`,
                },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      console.error('[Support] Failed to notify Slack:', error);
    }
  }
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
// HELPERS
// ============================================================================

function determinePriority(category: TicketCategory, message: string): TicketPriority {
  // Billing sempre alta
  if (category === 'billing') return 'high';
  
  // Bug report com palavras urgentes
  if (category === 'bug_report') {
    const urgentWords = ['crash', 'broken', 'not working', 'urgent', 'emergency', 'down'];
    if (urgentWords.some(w => message.toLowerCase().includes(w))) {
      return 'urgent';
    }
    return 'high';
  }
  
  // Feature request sempre baixa
  if (category === 'feature_request') return 'low';
  
  return 'normal';
}

function formatCategory(category: TicketCategory): string {
  const labels: Record<TicketCategory, string> = {
    billing: 'Faturamento',
    technical: 'Técnico',
    account: 'Conta',
    feature_request: 'Sugestão',
    bug_report: 'Bug',
    other: 'Outro',
  };
  return labels[category] || category;
}

function formatPriority(priority: TicketPriority): string {
  const labels: Record<TicketPriority, string> = {
    low: '🟢 Baixa',
    normal: '🔵 Normal',
    high: '🟠 Alta',
    urgent: '🔴 Urgente',
  };
  return labels[priority] || priority;
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
      language: true,
    },
  });

  return {
    preferredChannel: (prefs?.supportChannel as 'chat' | 'email' | 'both') || 'both',
    emailNotifications: prefs?.emailNotifications ?? true,
    chatNotifications: true,
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
      language: preferences.language || 'pt-BR',
    },
    update: {
      ...(preferences.preferredChannel && { supportChannel: preferences.preferredChannel }),
      ...(preferences.emailNotifications !== undefined && { emailNotifications: preferences.emailNotifications }),
      ...(preferences.language && { language: preferences.language }),
    },
  });
}

export default {
  createTicket,
  addTicketReply,
  updateTicketStatus,
  getUserTickets,
  getTicketMessages,
  getCrispConfig,
  getUserSupportPreferences,
  updateUserSupportPreferences,
};
