/**
 * AIChatPanelPro pure utilities — extracted to keep the orchestrator slim.
 */

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCost(value: number): string | null {
  if (value === undefined || Number.isNaN(value)) return null;
  if (value >= 10) return `$${value.toFixed(0)}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}
