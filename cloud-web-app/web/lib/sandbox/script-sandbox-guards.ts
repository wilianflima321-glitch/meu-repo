// ============================================================================
// PADRÕES PERIGOSOS
// ============================================================================

export const DANGEROUS_PATTERNS = [
  // Acesso a protótipos
  /__proto__/,
  /Object\s*\.\s*prototype/,
  /Array\s*\.\s*prototype/,
  /constructor\s*\[/,
  /constructor\s*\.\s*constructor/,
  /prototype\s*\[/,

  // Manipulação de escopo
  /\beval\b/,
  /\bFunction\b\s*\(/,
  /new\s+Function/,

  // Acesso ao DOM
  /\bdocument\b/,
  /\bwindow\b/,
  /\bglobalThis\b/,
  /\bself\b/,

  // Node.js específicos
  /\brequire\b/,
  /\bimport\b\s*\(/,
  /\bprocess\b/,
  /\b__dirname\b/,
  /\b__filename\b/,

  // Fetch e comunicação
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,

  // Storage
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bindexedDB\b/,

  // Workers (prevenir escape)
  /\bWorker\b/,
  /\bSharedWorker\b/,
  /\bServiceWorker\b/,

  // Timing attacks
  /\bperformance\b\.now/,

  // Módulos perigosos
  /child_process/,
  /fs\s*\./,
];

export function validateScript(code: string): { valid: boolean; reason?: string } {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      return { valid: false, reason: `Blocked by pattern: ${pattern.toString()}` };
    }
  }
  return { valid: true };
}

export function sanitizeOutput(
  output: unknown,
  options?: {
    maxDepth?: number;
    maxSize?: number;
    maxArrayLength?: number;
    maxStringLength?: number;
  }
): unknown {
  const opts = {
    maxDepth: options?.maxDepth ?? 6,
    maxSize: options?.maxSize ?? 100_000,
    maxArrayLength: options?.maxArrayLength ?? 5000,
    maxStringLength: options?.maxStringLength ?? 10_000,
  };

  const seen = new WeakSet<object>();
  let size = 0;

  const sanitize = (value: unknown, depth: number): unknown => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      const truncated = value.length > opts.maxStringLength
        ? `${value.slice(0, opts.maxStringLength)}[truncated]`
        : value;
      size += truncated.length;
      return truncated
        .replace(/<script/gi, '&lt;script')
        .replace(/on\w+\s*=/gi, 'data-attr=');
    }
    if (typeof value === 'function') return '[Function]';
    if (typeof value !== 'object') return value;

    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (depth > opts.maxDepth) return '[MaxDepth]';

    if (Array.isArray(value)) {
      const arr: unknown[] = [];
      const limit = Math.min(value.length, opts.maxArrayLength);
      for (let i = 0; i < limit; i++) {
        arr.push(sanitize(value[i], depth + 1));
        if (size > opts.maxSize) return arr;
      }
      if (value.length > opts.maxArrayLength) {
        arr.push('[Truncated]');
      }
      return arr;
    }

    const obj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      obj[key] = sanitize(val, depth + 1);
      if (size > opts.maxSize) break;
    }
    return obj;
  };

  return sanitize(output, 0);
}
