export function generateSandboxWorkerCode(): string {
  return `
      'use strict';

      const _postMessage = postMessage;

      const safeAPIs = {
        console: {
          log: (...args) => collectLog('log', args),
          warn: (...args) => collectLog('warn', args),
          error: (...args) => collectLog('error', args),
          info: (...args) => collectLog('info', args),
        },
        Math: Math,
        JSON: {
          parse: JSON.parse,
          stringify: JSON.stringify,
        },
        Date: Date,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        parseInt: parseInt,
        parseFloat: parseFloat,
        isNaN: isNaN,
        isFinite: isFinite,
      };

      let executionLogs = [];

      function collectLog(level, args) {
        const message = args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch {
            return '[Circular]';
          }
        }).join(' ');

        executionLogs.push({
          level,
          message,
          timestamp: Date.now(),
        });
      }

      function safeExecute(code, context, allowedAPIs) {
        executionLogs = [];
        const startTime = (self.performance?.now?.() ?? Date.now());
        const startMemory = 0;

        try {
          const scope = { ...context };

          const apiMap = {
            console: 'console',
            math: 'Math',
            json: 'JSON',
            date: 'Date',
            array: 'Array',
            object: 'Object',
            string: 'String',
            number: 'Number',
            boolean: 'Boolean',
          };

          for (const api of allowedAPIs) {
            const mapped = apiMap[api];
            if (mapped && safeAPIs[mapped]) {
              scope[mapped] = safeAPIs[mapped];
            }
            if (api === 'number') {
              scope.parseInt = safeAPIs.parseInt;
              scope.parseFloat = safeAPIs.parseFloat;
              scope.isNaN = safeAPIs.isNaN;
              scope.isFinite = safeAPIs.isFinite;
            }
          }

          const scopeKeys = Object.keys(scope);
          const scopeValues = Object.values(scope);
          const wrappedCode = '"use strict";\\n' + code;
          const fn = new Function(...scopeKeys, wrappedCode);
          const result = fn(...scopeValues);

          return {
            success: true,
            result: result,
            executionTime: (self.performance?.now?.() ?? Date.now()) - startTime,
            memoryUsed: startMemory,
            logs: executionLogs,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message || 'Unknown error',
            executionTime: (self.performance?.now?.() ?? Date.now()) - startTime,
            memoryUsed: startMemory,
            logs: executionLogs,
          };
        }
      }

      self.onmessage = function(event) {
        const { type, payload } = event.data;

        if (type === 'execute') {
          const { id, code, context, allowedAPIs, memoryLimit } = payload;
          const result = safeExecute(code, context, allowedAPIs);
          _postMessage({
            type: 'result',
            payload: { id, result },
          });
        }
      };

      _postMessage({ type: 'ready' });
    `;
}
