import { logger } from '@/lib/observability/logger';
import { Resend } from 'resend';
import { formatCategory, formatPriority } from './support-formatters';
import type { SupportTicket } from './support-types';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_EMAIL = 'support@aethel.dev';
const NOREPLY_EMAIL = 'noreply@aethel.dev';

// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

/**
 * Envia confirmação de ticket criado
 */
export async function sendTicketConfirmation(ticket: SupportTicket): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('[Support] Resend not configured, skipping email');
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
    logger.error('[Support] Failed to send confirmation email:', error);
  }
}

/**
 * Envia notificação de resposta ao usuário
 */
export async function sendReplyNotificationToUser(
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
    logger.error('[Support] Failed to send reply notification:', error);
  }
}

/**
 * Envia notificação de resolução
 */
export async function sendResolutionNotification(ticket: SupportTicket): Promise<void> {
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
    logger.error('[Support] Failed to send resolution notification:', error);
  }
}

/**
 * Notifica a equipe sobre novo ticket
 */
export async function notifyTeam(ticket: SupportTicket, newMessage?: string): Promise<void> {
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
      logger.error('[Support] Failed to notify Slack:', error);
    }
  }
}

