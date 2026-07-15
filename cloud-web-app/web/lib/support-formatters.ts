import type { TicketCategory, TicketPriority } from './support-types';

export function determinePriority(category: TicketCategory, message: string): TicketPriority {
  if (category === 'billing') return 'high';

  if (category === 'bug_report') {
    const urgentWords = ['crash', 'broken', 'not working', 'urgent', 'emergency', 'down'];
    if (urgentWords.some(word => message.toLowerCase().includes(word))) {
      return 'urgent';
    }
    return 'high';
  }

  if (category === 'feature_request') return 'low';

  return 'normal';
}

export function formatCategory(category: TicketCategory): string {
  const labels: Record<TicketCategory, string> = {
    billing: 'Faturamento',
    technical: 'Tecnico',
    account: 'Conta',
    feature_request: 'Sugestao',
    bug_report: 'Bug',
    other: 'Outro',
  };
  return labels[category] || category;
}

export function formatPriority(priority: TicketPriority): string {
  const labels: Record<TicketPriority, string> = {
    low: 'Baixa',
    normal: 'Normal',
    high: 'Alta',
    urgent: 'Urgente',
  };
  return labels[priority] || priority;
}
