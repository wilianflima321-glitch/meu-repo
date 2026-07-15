import { useCallback, useMemo } from 'react';

import { Logger } from './logging-system';
import type { AuditAction, AuditResource, LogLevel } from './logging-system.types';

export function useLogger(context?: Record<string, unknown>) {
  const logger = useMemo(() => Logger.getInstance(), []);

  const logWithContext = useCallback((
    level: LogLevel,
    message: string,
    additionalContext?: Record<string, unknown>
  ) => {
    logger[level as 'debug'](message, { ...context, ...additionalContext });
  }, [logger, context]);

  return {
    debug: (msg: string, ctx?: Record<string, unknown>) => logWithContext('debug', msg, ctx),
    info: (msg: string, ctx?: Record<string, unknown>) => logWithContext('info', msg, ctx),
    warn: (msg: string, ctx?: Record<string, unknown>) => logWithContext('warn', msg, ctx),
    error: (msg: string, error?: Error, ctx?: Record<string, unknown>) => {
      logger.error(msg, error, { ...context, ...ctx });
    },
    audit: (
      action: AuditAction,
      resourceType: AuditResource,
      resourceId: string,
      options?: Parameters<typeof logger.audit>[3]
    ) => {
      logger.audit(action, resourceType, resourceId, options);
    },
    time: logger.time.bind(logger),
  };
}
