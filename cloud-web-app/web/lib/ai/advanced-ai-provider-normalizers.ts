export interface ParseResult {
  arguments: Record<string, any>;
  malformed: boolean;
  repaired: boolean;
}

export function repairJsonLike(payload: string): string | null {
  const startIdx = payload.indexOf('{');
  if (startIdx === -1) return null;

  let braceCount = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < payload.length; i++) {
    const char = payload[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return payload.substring(startIdx, i + 1);
        }
      }
    }
  }

  return null;
}

function cleanTrailingCommas(jsonStr: string): string {
  // Strip trailing commas before closing braces/brackets
  return jsonStr.replace(/,\s*([}\]])/g, '$1');
}

export function parseToolArgumentsResult(payload: string): ParseResult {
  const trimmed = payload.trim();
  if (trimmed === '') {
    return { arguments: {}, malformed: false, repaired: false };
  }

  // 1. Try direct parsing first
  try {
    const cleanJson = cleanTrailingCommas(trimmed);
    const parsed = JSON.parse(cleanJson);
    if (parsed && typeof parsed === 'object') {
      const repaired = cleanJson !== trimmed;
      return { arguments: parsed, malformed: false, repaired };
    }
  } catch {
    // Fail-through
  }

  // 2. Try to unwrap markdown code fences if present
  let candidate = trimmed;
  const fenceRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = trimmed.match(fenceRegex);
  if (match) {
    candidate = match[1].trim();
  }

  // 3. Try parsing candidate directly
  try {
    const cleanJson = cleanTrailingCommas(candidate);
    const parsed = JSON.parse(cleanJson);
    if (parsed && typeof parsed === 'object') {
      return { arguments: parsed, malformed: false, repaired: true };
    }
  } catch {
    // Fail-through
  }

  // 4. Try repairJsonLike
  const jsonLike = repairJsonLike(candidate);
  if (jsonLike) {
    try {
      const cleanJson = cleanTrailingCommas(jsonLike);
      const parsed = JSON.parse(cleanJson);
      if (parsed && typeof parsed === 'object') {
        return { arguments: parsed, malformed: false, repaired: true };
      }
    } catch {
      // Fail-through
    }
  }

  return { arguments: {}, malformed: true, repaired: false };
}

export function parseToolArguments(payload: string): Record<string, any> {
  const res = parseToolArgumentsResult(payload);
  return res.malformed ? {} : res.arguments;
}
