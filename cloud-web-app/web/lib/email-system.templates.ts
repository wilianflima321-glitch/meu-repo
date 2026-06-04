/**
 * Transactional email templates for the Aethel email runtime.
 */

import type { EmailTemplate } from './email-system.types';

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

interface TemplateConfig {
  subject: string | ((data: Record<string, any>) => string);
  html: (data: Record<string, any>) => string;
  text?: (data: Record<string, any>) => string;
}

const BaseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
  .header h1 { color: white; margin: 0; font-size: 24px; }
  .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
  .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
  .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
  .button:hover { background: #4f46e5; }
  .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
`;

const wrapInLayout = (content: string, data?: Record<string, unknown>) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aethel Engine</title>
  <style>${BaseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎮 Aethel Engine</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Aethel Engine. Todos os direitos reservados.</p>
      <p>
        <a href="${data?.unsubscribeUrl || '#'}">Gerenciar preferências</a> |
        <a href="${data?.privacyUrl || '#'}">Política de Privacidade</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

export const EmailTemplates: Record<EmailTemplate, TemplateConfig> = {
  // AUTH TEMPLATES
  welcome: {
    subject: (data) => `Bem-vindo ao Aethel Engine, ${data.name}! 🎮`,
    html: (data) => wrapInLayout(`
      <h2>Olá ${data.name}! 👋</h2>
      <p>Estamos muito felizes em ter você conosco!</p>
      <p>O Aethel Engine é a plataforma definitiva para criação de jogos com IA. Com ela você pode:</p>
      <ul>
        <li>🎨 Criar jogos incríveis com ferramentas visuais</li>
        <li>🤖 Usar IA para acelerar seu desenvolvimento</li>
        <li>👥 Colaborar em tempo real com sua equipe</li>
        <li>🚀 Publicar para múltiplas plataformas</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl}" class="button">Começar Agora</a>
      </p>
      <p>Precisa de ajuda? Confira nossa <a href="${data.docsUrl}">documentação</a> ou entre em contato.</p>
    `, data),
    text: (data) => `Olá ${data.name}! Bem-vindo ao Aethel Engine. Acesse ${data.dashboardUrl} para começar.`,
  },

  verify_email: {
    subject: 'Verifique seu email - Aethel Engine',
    html: (data) => wrapInLayout(`
      <h2>Verificação de Email</h2>
      <p>Olá ${data.name},</p>
      <p>Por favor, clique no botão abaixo para verificar seu endereço de email:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.verifyUrl}" class="button">Verificar Email</a>
      </p>
      <p>Ou copie e cole este link no seu navegador:</p>
      <div class="highlight">
        <code>${data.verifyUrl}</code>
      </div>
      <p><em>Este link expira em 24 horas.</em></p>
    `, data),
  },
  magic_link: {
    subject: 'Your Aethel sign-in link',
    html: (data) => wrapInLayout(`
      <h2>Sign in to Aethel</h2>
      <p>Use this secure one-time link to continue your work in Aethel Studio.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.magicLinkUrl}" class="button">Sign in to Aethel</a>
      </p>
      <p>This link expires in ${data.expiryMinutes || 15} minutes and can be used once.</p>
      <p>If you did not request this email, you can safely ignore it.</p>
    `, data),
    text: (data) =>
      `Sign in to Aethel: ${data.magicLinkUrl}\n\nThis link expires in ${data.expiryMinutes || 15} minutes and can be used once.`,
  },

  password_reset: {
    subject: 'Redefinição de Senha - Aethel Engine',
    html: (data) => wrapInLayout(`
      <h2>Redefinição de Senha</h2>
      <p>Olá ${data.name},</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.resetUrl}" class="button">Redefinir Senha</a>
      </p>
      <p><strong>⚠️ Se você não solicitou isso, ignore este email.</strong></p>
      <p><em>Este link expira em 1 hora.</em></p>
    `, data),
  },

  password_changed: {
    subject: '🔒 Senha Alterada - Aethel Engine',
    html: (data) => wrapInLayout(`
      <h2>Senha Alterada com Sucesso</h2>
      <p>Olá ${data.name},</p>
      <p>Sua senha foi alterada em <strong>${data.timestamp}</strong>.</p>
      <div class="highlight">
        <p><strong>Dispositivo:</strong> ${data.device}</p>
        <p><strong>IP:</strong> ${data.ip}</p>
        <p><strong>Localização:</strong> ${data.location}</p>
      </div>
      <p><strong>⚠️ Se você não fez essa alteração, entre em contato imediatamente.</strong></p>
    `, data),
  },

  login_alert: {
    subject: '🔐 Novo Login Detectado - Aethel Engine',
    html: (data) => wrapInLayout(`
      <h2>Novo Login em sua Conta</h2>
      <p>Olá ${data.name},</p>
      <p>Detectamos um novo login em sua conta:</p>
      <div class="highlight">
        <p><strong>Data/Hora:</strong> ${data.timestamp}</p>
        <p><strong>Dispositivo:</strong> ${data.device}</p>
        <p><strong>Navegador:</strong> ${data.browser}</p>
        <p><strong>IP:</strong> ${data.ip}</p>
        <p><strong>Localização:</strong> ${data.location}</p>
      </div>
      <p><strong>⚠️ Se não foi você, proteja sua conta imediatamente.</strong></p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.securityUrl}" class="button">Revisar Segurança</a>
      </p>
    `, data),
  },

  mfa_enabled: {
    subject: '✅ Autenticação em Dois Fatores Ativada',
    html: (data) => wrapInLayout(`
      <h2>MFA Ativado com Sucesso!</h2>
      <p>Olá ${data.name},</p>
      <p>A autenticação em dois fatores foi ativada em sua conta.</p>
      <p>Sua conta agora está mais segura! 🛡️</p>
      <div class="highlight">
        <p><strong>Códigos de Recuperação:</strong></p>
        <p>Guarde esses códigos em um lugar seguro. Cada um pode ser usado apenas uma vez.</p>
        <code>${data.recoveryCodes?.join(' | ')}</code>
      </div>
    `, data),
  },

  // NOTIFICATION TEMPLATES
  invite_to_project: {
    subject: (data) => `${data.inviterName} convidou você para "${data.projectName}"`,
    html: (data) => wrapInLayout(`
      <h2>Convite para Projeto</h2>
      <p>Olá ${data.name},</p>
      <p><strong>${data.inviterName}</strong> convidou você para colaborar no projeto:</p>
      <div class="highlight">
        <h3 style="margin: 0;">${data.projectName}</h3>
        <p style="margin: 5px 0 0;">${data.projectDescription || 'Sem descrição'}</p>
      </div>
      <p>Função: <strong>${data.role}</strong></p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.acceptUrl}" class="button">Aceitar Convite</a>
      </p>
      <p><em>Este convite expira em 7 dias.</em></p>
    `, data),
  },

  project_shared: {
    subject: (data) => `Projeto "${data.projectName}" compartilhado com você`,
    html: (data) => wrapInLayout(`
      <h2>Projeto Compartilhado</h2>
      <p>Olá ${data.name},</p>
      <p><strong>${data.sharedBy}</strong> compartilhou o projeto "${data.projectName}" com você.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.projectUrl}" class="button">Abrir Projeto</a>
      </p>
    `, data),
  },

  comment_mention: {
    subject: (data) => `${data.mentionedBy} mencionou você em "${data.fileName}"`,
    html: (data) => wrapInLayout(`
      <h2>Nova Menção</h2>
      <p>Olá ${data.name},</p>
      <p><strong>${data.mentionedBy}</strong> mencionou você em um comentário:</p>
      <div class="highlight">
        <p><strong>Arquivo:</strong> ${data.fileName}</p>
        <p><strong>Comentário:</strong></p>
        <blockquote style="border-left: 3px solid #6366f1; padding-left: 15px; margin: 10px 0;">
          ${data.comment}
        </blockquote>
      </div>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.commentUrl}" class="button">Ver Comentário</a>
      </p>
    `, data),
  },

  task_assigned: {
    subject: (data) => `Nova tarefa atribuída: ${data.taskTitle}`,
    html: (data) => wrapInLayout(`
      <h2>Nova Tarefa</h2>
      <p>Olá ${data.name},</p>
      <p><strong>${data.assignedBy}</strong> atribuiu uma tarefa para você:</p>
      <div class="highlight">
        <h3 style="margin: 0;">${data.taskTitle}</h3>
        <p style="margin: 10px 0;">${data.taskDescription}</p>
        <p><strong>Prazo:</strong> ${data.dueDate || 'Sem prazo definido'}</p>
        <p><strong>Prioridade:</strong> ${data.priority}</p>
      </div>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.taskUrl}" class="button">Ver Tarefa</a>
      </p>
    `, data),
  },

  build_complete: {
    subject: (data) => `Build ${data.success ? 'concluído' : 'falhou'}: ${data.projectName}`,
    html: (data) => wrapInLayout(`
      <h2>Build ${data.success ? '✅ Concluído' : '❌ Falhou'}</h2>
      <p>Olá ${data.name},</p>
      <p>O build do projeto <strong>${data.projectName}</strong> foi ${data.success ? 'concluído com sucesso' : 'encerrado com erros'}.</p>
      <div class="highlight">
        <p><strong>Duração:</strong> ${data.duration}</p>
        <p><strong>Versão:</strong> ${data.version}</p>
        ${!data.success ? `<p><strong>Erro:</strong> ${data.errorMessage}</p>` : ''}
      </div>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.buildUrl}" class="button">Ver Detalhes</a>
      </p>
    `, data),
  },

  export_ready: {
    subject: (data) => `Export pronto: ${data.fileName}`,
    html: (data) => wrapInLayout(`
      <h2>Export Pronto! 📦</h2>
      <p>Olá ${data.name},</p>
      <p>Seu arquivo está pronto para download:</p>
      <div class="highlight">
        <p><strong>Arquivo:</strong> ${data.fileName}</p>
        <p><strong>Tamanho:</strong> ${data.fileSize}</p>
        <p><strong>Formato:</strong> ${data.format}</p>
      </div>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.downloadUrl}" class="button">Download</a>
      </p>
      <p><em>O link expira em 24 horas.</em></p>
    `, data),
  },

  // BILLING TEMPLATES
  subscription_created: {
    subject: '🎉 Assinatura Confirmada - Aethel Engine',
    html: (data) => wrapInLayout(`
      <h2>Assinatura Confirmada!</h2>
      <p>Olá ${data.name},</p>
      <p>Sua assinatura do plano <strong>${data.planName}</strong> foi ativada com sucesso!</p>
      <div class="highlight">
        <p><strong>Plano:</strong> ${data.planName}</p>
        <p><strong>Valor:</strong> ${data.price}/mês</p>
        <p><strong>Próxima cobrança:</strong> ${data.nextBillingDate}</p>
      </div>
      <p>Agora você tem acesso a:</p>
      <ul>
        ${(data.features as string[])?.map(f => `<li>${f}</li>`).join('')}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl}" class="button">Acessar Dashboard</a>
      </p>
    `, data),
  },

  subscription_cancelled: {
    subject: 'Assinatura Cancelada - Aethel Engine',
    html: (data) => wrapInLayout(`
      <h2>Assinatura Cancelada</h2>
      <p>Olá ${data.name},</p>
      <p>Sua assinatura foi cancelada conforme solicitado.</p>
      <div class="highlight">
        <p><strong>Acesso até:</strong> ${data.accessUntil}</p>
      </div>
      <p>Você ainda pode acessar sua conta com recursos limitados após essa data.</p>
      <p>Se mudar de ideia, você pode reativar sua assinatura a qualquer momento.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.reactivateUrl}" class="button">Reativar Assinatura</a>
      </p>
    `, data),
  },

  payment_success: {
    subject: '✅ Pagamento Confirmado - Aethel Engine',
    html: (data) => wrapInLayout(`
      <h2>Pagamento Confirmado</h2>
      <p>Olá ${data.name},</p>
      <p>Seu pagamento foi processado com sucesso!</p>
      <div class="highlight">
        <p><strong>Valor:</strong> ${data.amount}</p>
        <p><strong>Data:</strong> ${data.date}</p>
        <p><strong>Referência:</strong> ${data.reference}</p>
      </div>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.invoiceUrl}" class="button">Ver Fatura</a>
      </p>
    `, data),
  },

  payment_failed: {
    subject: '⚠️ Falha no Pagamento - Ação Necessária',
    html: (data) => wrapInLayout(`
      <h2>Falha no Pagamento</h2>
      <p>Olá ${data.name},</p>
      <p>Houve um problema ao processar seu pagamento.</p>
      <div class="highlight">
        <p><strong>Motivo:</strong> ${data.reason}</p>
        <p><strong>Valor:</strong> ${data.amount}</p>
      </div>
      <p><strong>⚠️ Por favor, atualize seus dados de pagamento para evitar a suspensão da conta.</strong></p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.updatePaymentUrl}" class="button">Atualizar Pagamento</a>
      </p>
    `, data),
  },

  invoice: {
    subject: (data) => `Fatura #${data.invoiceNumber} - Aethel Engine`,
    html: (data) => wrapInLayout(`
      <h2>Fatura #${data.invoiceNumber}</h2>
      <p>Olá ${data.name},</p>
      <p>Segue sua fatura:</p>
      <div class="highlight">
        <p><strong>Número:</strong> ${data.invoiceNumber}</p>
        <p><strong>Data:</strong> ${data.date}</p>
        <p><strong>Valor:</strong> ${data.amount}</p>
        <p><strong>Status:</strong> ${data.status}</p>
      </div>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.invoiceUrl}" class="button">Ver Fatura Completa</a>
      </p>
    `, data),
  },

  trial_ending: {
    subject: '⏰ Seu trial termina em breve!',
    html: (data) => wrapInLayout(`
      <h2>Seu Trial Está Acabando</h2>
      <p>Olá ${data.name},</p>
      <p>Seu período de teste termina em <strong>${data.daysLeft} dias</strong>.</p>
      <p>Para continuar aproveitando todos os recursos, faça upgrade para um plano pago:</p>
      <div class="highlight">
        <h3>Plano ${data.recommendedPlan}</h3>
        <p>${data.planPrice}/mês</p>
        <ul>
          ${(data.planFeatures as string[])?.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.upgradeUrl}" class="button">Fazer Upgrade</a>
      </p>
    `, data),
  },

  plan_upgrade: {
    subject: '🚀 Upgrade realizado com sucesso!',
    html: (data) => wrapInLayout(`
      <h2>Upgrade Realizado!</h2>
      <p>Olá ${data.name},</p>
      <p>Parabéns! Seu plano foi atualizado para <strong>${data.newPlan}</strong>.</p>
      <p>Novos recursos disponíveis:</p>
      <ul>
        ${(data.newFeatures as string[])?.map(f => `<li>✨ ${f}</li>`).join('')}
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl}" class="button">Explorar Recursos</a>
      </p>
    `, data),
  },

  // MARKETING TEMPLATES
  newsletter: {
    subject: (data) => data.subject as string,
    html: (data) => wrapInLayout(`${data.content}`, data),
  },

  product_update: {
    subject: (data) => `🆕 ${data.title} - Aethel Engine`,
    html: (data) => wrapInLayout(`
      <h2>${data.title}</h2>
      <p>Olá ${data.name},</p>
      ${data.content}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.learnMoreUrl}" class="button">Saiba Mais</a>
      </p>
    `, data),
  },

  feature_announcement: {
    subject: (data) => `✨ Nova Feature: ${data.featureName}`,
    html: (data) => wrapInLayout(`
      <h2>Nova Feature: ${data.featureName}</h2>
      <p>Olá ${data.name},</p>
      <p>${data.description}</p>
      ${data.imageUrl ? `<img src="${data.imageUrl}" alt="${data.featureName}" style="max-width: 100%; border-radius: 8px;" />` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.tryItUrl}" class="button">Experimentar Agora</a>
      </p>
    `, data),
  },

  // DIGEST TEMPLATES
  daily_digest: {
    subject: '📊 Resumo Diário - Aethel Engine',
    html: (data) => wrapInLayout(`
      <h2>Seu Resumo Diário</h2>
      <p>Olá ${data.name},</p>
      <p>Aqui está o que aconteceu hoje:</p>

      ${data.projectUpdates ? `
      <h3>📁 Atualizações de Projetos</h3>
      <ul>
        ${(data.projectUpdates as string[]).map(u => `<li>${u}</li>`).join('')}
      </ul>
      ` : ''}

      ${data.comments ? `
      <h3>💬 Novos Comentários</h3>
      <ul>
        ${(data.comments as string[]).map(c => `<li>${c}</li>`).join('')}
      </ul>
      ` : ''}

      ${data.tasks ? `
      <h3>✅ Tarefas</h3>
      <ul>
        ${(data.tasks as string[]).map(t => `<li>${t}</li>`).join('')}
      </ul>
      ` : ''}

      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl}" class="button">Ver Dashboard</a>
      </p>
    `, data),
  },

  weekly_summary: {
    subject: '📈 Resumo Semanal - Aethel Engine',
    html: (data) => wrapInLayout(`
      <h2>Seu Resumo Semanal</h2>
      <p>Olá ${data.name},</p>
      <p>Confira o que aconteceu esta semana:</p>

      <div class="highlight">
        <h3>📊 Estatísticas</h3>
        <p>Commits: <strong>${data.stats?.commits || 0}</strong></p>
        <p>Arquivos modificados: <strong>${data.stats?.filesChanged || 0}</strong></p>
        <p>Tempo no editor: <strong>${data.stats?.timeSpent || '0h'}</strong></p>
      </div>

      ${data.highlights ? `
      <h3>🌟 Destaques</h3>
      <ul>
        ${(data.highlights as string[]).map(h => `<li>${h}</li>`).join('')}
      </ul>
      ` : ''}

      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl}" class="button">Ver Detalhes</a>
      </p>
    `, data),
  },
};
