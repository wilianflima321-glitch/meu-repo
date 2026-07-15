import type { ErrorInfo } from 'react';
import { createComponentLogger } from '@/lib/observability/logger';
import type { ErrorReport } from './ErrorBoundary.contracts';

export const errorBoundaryLog = createComponentLogger('ErrorBoundary');

export class ErrorReporterService {
  private static instance: ErrorReporterService;
  private errors: ErrorReport[] = [];
  private maxErrors = 100;
  private listeners: Set<(errors: ErrorReport[]) => void> = new Set();

  static getInstance(): ErrorReporterService {
    if (!ErrorReporterService.instance) {
      ErrorReporterService.instance = new ErrorReporterService();
    }
    return ErrorReporterService.instance;
  }

  report(error: Error, context?: Record<string, unknown>, errorInfo?: ErrorInfo): ErrorReport {
    const report: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      error,
      errorInfo,
      componentStack: errorInfo?.componentStack ?? undefined,
      context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userId: this.getUserId(),
    };

    this.errors.unshift(report);

    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    this.notifyListeners();

    if (process.env.NODE_ENV === 'development') {
      errorBoundaryLog.error('Error boundary captured render failure', error, {
        action: 'report',
        errorId: report.id,
        url: report.url,
        userId: report.userId,
      });
      errorBoundaryLog.debug('Error boundary context snapshot', {
        action: 'report-context',
        errorId: report.id,
        context,
        componentStack: errorInfo?.componentStack,
      });
    }

    this.sendToBackend(report).catch(() => {});

    return report;
  }

  private getUserId(): string | undefined {
    try {
      const userData = localStorage.getItem('aethel_user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user.userId;
      }
    } catch {}
    return undefined;
  }

  private async sendToBackend(report: ErrorReport): Promise<void> {
    try {
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...report,
          error: {
            name: report.error.name,
            message: report.error.message,
            stack: report.error.stack,
          },
        }),
      });
    } catch {
      // Silent fail - do not create infinite error loops.
    }
  }

  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  getLastError(): ErrorReport | null {
    return this.errors[0] || null;
  }

  clear(): void {
    this.errors = [];
    this.notifyListeners();
  }

  subscribe(listener: (errors: ErrorReport[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.errors]));
  }
}

export const errorReporter = ErrorReporterService.getInstance();
