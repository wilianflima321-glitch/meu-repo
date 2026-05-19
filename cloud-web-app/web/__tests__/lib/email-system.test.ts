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
    process.env.LOG_LEVEL = 'fatal';
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
});
