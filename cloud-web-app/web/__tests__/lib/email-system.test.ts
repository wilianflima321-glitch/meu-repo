import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadEmailService() {
  vi.resetModules();
  return import('@/lib/email-system');
}

describe('email-system runtime provider', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
    delete process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.EMAIL_ALLOW_MOCK;
    process.env.LOG_LEVEL = 'fatal';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    process.env = originalEnv;
  });

  it('auto-selects Resend when RESEND_API_KEY is available', async () => {
    process.env.RESEND_API_KEY = 'resend_test_key';
    process.env.EMAIL_FROM = 'noreply@example.com';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'resend_email_123' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { emailService } = await loadEmailService();
    const result = await emailService.send({
      to: { email: 'builder@example.com' },
      subject: 'Welcome',
      html: '<p>Welcome</p>',
    });

    expect(result).toMatchObject({
      success: true,
      provider: 'resend',
      id: 'resend_email_123',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer resend_test_key',
        }),
      }),
    );
  });

  it('fails explicitly when a real provider is configured without a key', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { emailService } = await loadEmailService();
    const result = await emailService.send({
      to: { email: 'builder@example.com' },
      subject: 'Welcome',
      html: '<p>Welcome</p>',
    });

    expect(result).toMatchObject({
      success: false,
      provider: 'resend',
    });
    expect(result.error).toContain('configured without an API key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows mock provider outside production (dev/test)', async () => {
    process.env.NODE_ENV = 'test';
    const { emailService } = await loadEmailService();
    const honesty = emailService.getProviderHonesty();
    expect(honesty.provider).toBe('mock');
    expect(honesty.failClosed).toBe(false);

    const result = await emailService.send({
      to: { email: 'builder@example.com' },
      subject: 'Dev mock',
      html: '<p>ok</p>',
    });
    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock');
  });

  it('fails closed in production when no provider/API key is configured — BLOCKER 10', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.EMAIL_API_KEY;
    delete process.env.EMAIL_ALLOW_MOCK;

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { emailService } = await loadEmailService();
    const honesty = emailService.getProviderHonesty();
    expect(honesty.failClosed).toBe(true);
    expect(honesty.configured).toBe(false);

    const result = await emailService.send({
      to: { email: 'builder@example.com' },
      subject: 'Must not silently mock',
      html: '<p>nope</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured in production|forbidden in production/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed in production when EMAIL_PROVIDER=mock without EMAIL_ALLOW_MOCK — BLOCKER 10', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_PROVIDER = 'mock';
    delete process.env.EMAIL_ALLOW_MOCK;

    const { emailService } = await loadEmailService();
    const result = await emailService.send({
      to: { email: 'builder@example.com' },
      subject: 'Explicit mock blocked',
      html: '<p>nope</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/forbidden in production/i);
  });

  it('allows explicit EMAIL_ALLOW_MOCK=1 override in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_ALLOW_MOCK = '1';

    const { emailService } = await loadEmailService();
    const honesty = emailService.getProviderHonesty();
    expect(honesty.failClosed).toBe(false);
    expect(honesty.provider).toBe('mock');

    const result = await emailService.send({
      to: { email: 'builder@example.com' },
      subject: 'Explicit override',
      html: '<p>ok</p>',
    });
    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock');
  });

  it('fails closed for unimplemented ses/smtp instead of silent mock — BLOCKER 10 depth', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_PROVIDER = 'ses';
    process.env.EMAIL_API_KEY = 'not-a-real-ses-wire';

    const { emailService } = await loadEmailService();
    const result = await emailService.send({
      to: { email: 'builder@example.com' },
      subject: 'SES not wired',
      html: '<p>nope</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ses.*not implemented|refuse silent mock/i);
  });
});
