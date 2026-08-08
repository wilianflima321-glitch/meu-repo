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

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isMockEmailExplicitlyAllowed(): boolean {
  return process.env.EMAIL_ALLOW_MOCK === '1' || process.env.EMAIL_ALLOW_MOCK === 'true';
}

function resolveEmailProvider(input: {
  configuredProvider?: EmailProvider
  resendKey?: string
  sendGridKey?: string
}): { provider: EmailProvider; failClosedReason: string | null } {
  const { configuredProvider, resendKey, sendGridKey } = input
  const production = isProductionRuntime()
  const allowMock = isMockEmailExplicitlyAllowed()

  let provider: EmailProvider
  if (configuredProvider) {
    provider = configuredProvider
  } else if (resendKey) {
    provider = 'resend'
  } else if (sendGridKey) {
    provider = 'sendgrid'
  } else if (!production || allowMock) {
    provider = 'mock'
  } else {
    // Production without real provider config — never silently mock.
    return {
      provider: 'mock',
      failClosedReason:
        'Email provider not configured in production — set EMAIL_PROVIDER + API key (RESEND_API_KEY / SENDGRID_API_KEY), or EMAIL_ALLOW_MOCK=1 for an explicit non-default override',
    }
  }

  if (provider === 'mock' && production && !allowMock) {
    return {
      provider: 'mock',
      failClosedReason:
        'Email mock provider is forbidden in production — configure a real provider or set EMAIL_ALLOW_MOCK=1 explicitly',
    }
  }

  return { provider, failClosedReason: null }
}

export class EmailService {
  private static instance: EmailService | null = null;
  private provider: EmailProvider;
  private apiKey?: string;
  private fromAddress: EmailAddress;
  private queue: EmailOptions[] = [];
  private processing = false;
  /** Set when production path would have silently mocked — send fails closed. */
  private failClosedReason: string | null = null;

  private constructor() {
    const configuredProvider = process.env.EMAIL_PROVIDER as EmailProvider | undefined;
    const resendKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
    const sendGridKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;

    const resolved = resolveEmailProvider({ configuredProvider, resendKey, sendGridKey });
    this.provider = resolved.provider;
    this.failClosedReason = resolved.failClosedReason;
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

    if (this.failClosedReason) {
      log.warn('[Email] Production fail-closed — mock provider blocked', {
        reason: this.failClosedReason,
      });
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /** Test / process-reload helper — never call from product send paths. */
  static resetInstanceForTests(): void {
    EmailService.instance = null;
  }

  /** Honest probe for readiness / marketing — never invents a configured provider. */
  getProviderHonesty(): {
    provider: EmailProvider
    configured: boolean
    mockAllowedInCurrentEnv: boolean
    failClosed: boolean
    failClosedReason: string | null
  } {
    return {
      provider: this.provider,
      configured: this.failClosedReason === null && this.provider !== 'mock',
      mockAllowedInCurrentEnv: !isProductionRuntime() || isMockEmailExplicitlyAllowed(),
      failClosed: this.failClosedReason !== null,
      failClosedReason: this.failClosedReason,
    };
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
    const recipients = this.normalizeRecipients(email.to);

    // Fail closed before queueing — never invent a successful scheduled send in prod.
    if (this.failClosedReason) {
      return {
        id: `error_${Date.now()}`,
        success: false,
        provider: this.provider,
        timestamp: new Date(),
        recipients,
        error: this.failClosedReason,
      };
    }

    if (email.sendAt && email.sendAt > new Date()) {
      this.queue.push(email);
      return {
        id: `queued_${Date.now()}`,
        success: true,
        provider: this.provider,
        timestamp: new Date(),
        recipients,
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
      if (this.failClosedReason) {
        throw new Error(this.failClosedReason);
      }

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
        case 'mock':
          return this.mockSend(email, recipients);
        default:
          throw new Error(
            `Email provider "${String(this.provider)}" is not supported — refuse silent mock`,
          );
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
   * AWS SES integration — not wired; fail closed (never silent mock).
   */
  private async sendViaSES(
    _email: EmailOptions,
    _recipients: string[]
  ): Promise<EmailResult> {
    throw new Error(
      'Email provider "ses" is not implemented — refuse silent mock (configure resend or sendgrid)',
    );
  }

  /**
   * SMTP integration — not wired; fail closed (never silent mock).
   */
  private async sendViaSMTP(
    _email: EmailOptions,
    _recipients: string[]
  ): Promise<EmailResult> {
    throw new Error(
      'Email provider "smtp" is not implemented — refuse silent mock (configure resend or sendgrid)',
    );
  }

  /**
   * Mock send for development / test only — production path must fail closed first.
   */
  private mockSend(
    email: EmailOptions,
    recipients: string[]
  ): EmailResult {
    if (isProductionRuntime() && !isMockEmailExplicitlyAllowed()) {
      throw new Error(
        'Email mock provider is forbidden in production — configure a real provider or set EMAIL_ALLOW_MOCK=1 explicitly',
      );
    }

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
