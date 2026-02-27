/**
 * Email API - Aethel Engine
 * POST /api/email/send - Envia email
 * POST /api/email/template - Envia email com template
 * 
 * Integra com o sistema de email em lib/email-system.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

// Importação dinâmica do sistema de email (evita erros no build)
async function getEmailService() {
  const { emailService } = await import('@/lib/email-system');
  return emailService;
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'email-post',
      key: user.userId,
      max: 120,
      windowMs: 60 * 60 * 1000,
      message: 'Too many email send requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json();
    
    const { action, to, template, subject, html, data } = body;
    
    if (action === 'send') {
      // Envio direto
      if (!to || !subject || !html) {
        return NextResponse.json(
          { success: false, error: 'to, subject and html are required' },
          { status: 400 }
        );
      }
      
      const emailService = await getEmailService();
      const result = await emailService.send({
        to,
        subject,
        html,
      });
      
      return NextResponse.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });
    }
    
    if (action === 'template') {
      // Envio com template
      if (!to || !template) {
        return NextResponse.json(
          { success: false, error: 'to and template are required' },
          { status: 400 }
        );
      }
      
      const emailService = await getEmailService();
      const result = await emailService.sendTemplate(template, to, data || {});
      
      return NextResponse.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "send" or "template"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to send email:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
