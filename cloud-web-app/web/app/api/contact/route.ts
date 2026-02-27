import { NextRequest, NextResponse } from 'next/server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { getUserFromRequest } from '@/lib/auth-server';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

async function getEmailService() {
  const { emailService } = await import('@/lib/email-system');
  return emailService;
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      scope: 'contact-post',
      key: getRequestIp(request),
      max: 20,
      windowMs: 60 * 60 * 1000,
      message: 'Too many contact requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const company = String(body?.company || '').trim();
    const reason = String(body?.reason || '').trim();
    const message = String(body?.message || '').trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'name, email e message são obrigatórios' },
        { status: 400 }
      );
    }

    const authUser = getUserFromRequest(request);
    const destination =
      process.env.SUPPORT_EMAIL ||
      process.env.CONTACT_EMAIL ||
      process.env.EMAIL_FROM ||
      'support@aethel.io';

    const subject = `Contato (${reason || 'geral'}) - ${name}`;
    const html = `
      <h2>Novo contato recebido</h2>
      <p><strong>Nome:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${company ? `<p><strong>Empresa:</strong> ${company}</p>` : ''}
      ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
      ${authUser?.userId ? `<p><strong>User ID:</strong> ${authUser.userId}</p>` : ''}
      <p><strong>Mensagem:</strong></p>
      <p>${message.replace(/\n/g, '<br />')}</p>
    `;

    const emailService = await getEmailService();
    const result = await emailService.send({
      to: { email: destination },
      subject,
      html,
      replyTo: { email, name },
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (error) {
    console.error('Contact error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
