import { createComponentLogger } from '@/lib/observability/logger'

import { EmailTemplates } from './email-system.templates';
import type {
  EmailProvider,
  EmailTemplate,
  EmailAddress,
  EmailAttachment,
  EmailOptions,
  EmailResult,
  EmailStats
} from './email-system.types';

export { EmailTemplates } from './email-system.templates';
export type {
  EmailProvider,
  EmailTemplate,
  EmailAddress,
  EmailAttachment,
  EmailOptions,
  EmailResult,
  EmailStats
} from './email-system.types';

const log = createComponentLogger('email-system')


/**
 * Aethel Engine email and communication runtime.
 *
 * Transactional sending, provider routing, queueing and delivery tracking.
 */

// ============================================================================
// EMAIL SERVICE
// ============================================================================

export class EmailService {
  private static instance: EmailService;
  private provider: EmailProvider;
  private apiKey?: string;
  private fromAddress: EmailAddress;
  private queue: EmailOptions[] = [];
  private processing = false;

  private constructor() {
    const configuredProvider = process.env.EMAIL_PROVIDER as EmailProvider | undefined;
    const resendKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
    const sendGridKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;

    this.provider = configuredProvider || (resendKey ? 'resend' : 'mock');
    this.apiKey =
      this.provider === 'resend'
        ? resendKey
        : this.provider === 'sendgrid'
          ? sendGridKey
          : process.env.EMAIL_API_KEY;
    this.fromAddress = {
      email: process.env.EMAIL_FROM || 'noreply@aethel.dev',
      name: 'Aethel Engine',
    };
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Envia email usando template
   */
  async sendTemplate(
    template: EmailTemplate,
    to: EmailAddress | EmailAddress[],
    data: Record<string, unknown>,
    options?: Partial<EmailOptions>
  ): Promise<EmailResult> {
    const templateConfig = EmailTemplates[template];
    if (!templateConfig) {
      throw new Error(`Template "${template}" not found`);
    }

    const subject = typeof templateConfig.subject === 'function'
      ? templateConfig.subject(data)
      : templateConfig.subject;

    return this.send({
      to,
      subject,
      html: templateConfig.html(data),
      text: templateConfig.text?.(data),
      template,
      templateData: data,
      ...options,
    });
  }

  /**
   * Envia email direto
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    const email: EmailOptions = {
      ...options,
      from: options.from || this.fromAddress,
      trackOpens: options.trackOpens ?? true,
      trackClicks: options.trackClicks ?? true,
    };

    // Se tem data de envio futura, adiciona à fila
    if (email.sendAt && email.sendAt > new Date()) {
      this.queue.push(email);
      return {
        id: `queued_${Date.now()}`,
        success: true,
        provider: this.provider,
        timestamp: new Date(),
        recipients: this.normalizeRecipients(email.to),
      };
    }

    return this.sendNow(email);
  }

  /**
   * Envia imediatamente
   */
  private async sendNow(email: EmailOptions): Promise<EmailResult> {
    const recipients = this.normalizeRecipients(email.to);

    try {
      if (this.provider !== 'mock' && !this.apiKey) {
        throw new Error(`Email provider "${this.provider}" is configured without an API key`);
      }

      switch (this.provider) {
        case 'sendgrid':
          return await this.sendViaSendGrid(email, recipients);
        case 'resend':
          return await this.sendViaResend(email, recipients);
        case 'ses':
          return await this.sendViaSES(email, recipients);
        case 'smtp':
          return await this.sendViaSMTP(email, recipients);
        default:
          return this.mockSend(email, recipients);
      }
    } catch (error) {
      log.error('[Email] Send failed', error);
      return {
        id: `error_${Date.now()}`,
        success: false,
        provider: this.provider,
        timestamp: new Date(),
        recipients,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * SendGrid integration
   */
  private async sendViaSendGrid(
    email: EmailOptions,
    recipients: string[]
  ): Promise<EmailResult> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: recipients.map(email => ({ email })),
          cc: email.cc?.map(addr => ({ email: addr.email })),
          bcc: email.bcc?.map(addr => ({ email: addr.email })),
        }],
        from: { email: email.from?.email, name: email.from?.name },
        reply_to: email.replyTo ? { email: email.replyTo.email } : undefined,
        subject: email.subject,
        content: [
          { type: 'text/plain', value: email.text || '' },
          { type: 'text/html', value: email.html || '' },
        ].filter(c => c.value),
        tracking_settings: {
          open_tracking: { enable: email.trackOpens },
          click_tracking: { enable: email.trackClicks },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid error: ${response.status}`);
    }

    return {
      id: response.headers.get('x-message-id') || `sg_${Date.now()}`,
      success: true,
      provider: 'sendgrid',
      timestamp: new Date(),
      recipients,
    };
  }

  /**
   * Resend integration
   */
  private async sendViaResend(
    email: EmailOptions,
    recipients: string[]
  ): Promise<EmailResult> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${email.from?.name} <${email.from?.email}>`,
        to: recipients,
        cc: email.cc?.map(a => a.email),
        bcc: email.bcc?.map(a => a.email),
        reply_to: email.replyTo?.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
        tags: email.tags?.map(t => ({ name: t, value: t })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Resend error');
    }

    return {
      id: data.id,
      success: true,
      provider: 'resend',
      timestamp: new Date(),
      recipients,
    };
  }

  /**
   * AWS SES integration
   */
  private async sendViaSES(
    email: EmailOptions,
    recipients: string[]
  ): Promise<EmailResult> {
    // Implementação AWS SES seria aqui
    return this.mockSend(email, recipients);
  }

  /**
   * SMTP integration
   */
  private async sendViaSMTP(
    email: EmailOptions,
    recipients: string[]
  ): Promise<EmailResult> {
    // Implementação SMTP com nodemailer seria aqui
    return this.mockSend(email, recipients);
  }

  /**
   * Mock send para desenvolvimento
   */
  private mockSend(
    email: EmailOptions,
    recipients: string[]
  ): EmailResult {
    log.info('[Email Mock]', {
      to: recipients,
      subject: email.subject,
      template: email.template,
    });

    const id = `mock_${Date.now()}`;
    return {
      id,
      messageId: id,
      success: true,
      provider: 'mock',
      timestamp: new Date(),
      recipients,
    };
  }

  /**
   * Normaliza destinatários
   */
  private normalizeRecipients(
    to: EmailAddress | EmailAddress[]
  ): string[] {
    if (Array.isArray(to)) {
      return to.map(addr => addr.email);
    }
    return [to.email];
  }

  /**
   * Processa fila de emails agendados
   */
  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const now = new Date();
      const ready = this.queue.filter(e => !e.sendAt || e.sendAt <= now);
      this.queue = this.queue.filter(e => e.sendAt && e.sendAt > now);

      for (const email of ready) {
        await this.sendNow(email);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Envia email de teste
   */
  async sendTestEmail(to: string): Promise<EmailResult> {
    return this.sendTemplate('welcome', { email: to }, {
      name: 'Teste',
      dashboardUrl: 'https://aethel.dev/dashboard',
      docsUrl: 'https://docs.aethel.dev',
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const emailService = EmailService.getInstance();

const emailSystem = {
  EmailService,
  emailService,
  EmailTemplates,
};

export default emailSystem;
