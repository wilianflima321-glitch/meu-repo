export function interpolate(template: string, values: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values.hasOwnProperty(key) ? String(values[key]) : match;
  });
}

// ============================================================================
// LOCALIZATION MANAGER
// ============================================================================
