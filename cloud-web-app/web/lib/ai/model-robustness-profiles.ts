/**
 * Per-model robustness profiles.
 *
 * Every frontier model has characteristic failure modes. Gemini is cheap and
 * fast but hallucinates and "gets lazy" (truncates code, skims context). GPT
 * models can be sycophantic and over-eager. Reasoning models (o1/o3) ignore
 * tool schemas. Open models (Llama/Qwen/DeepSeek/Mistral) emit fragile JSON.
 *
 * This module encodes those weaknesses once and turns them into concrete,
 * additive mitigations that the provider layer can apply on every call:
 *  - extra system-prompt hardening tailored to the model's weakness,
 *  - a temperature ceiling (capping hallucination-prone models),
 *  - how many times malformed tool arguments should be repaired/retried,
 *  - whether the answer must be grounded in supplied evidence.
 *
 * The goal is not to insult any model but to extract its best behavior and
 * route around its known limitations so the end user gets a reliable result.
 */

export type ModelFamily =
  | 'gemini'
  | 'openai-gpt'
  | 'openai-reasoning'
  | 'claude'
  | 'deepseek'
  | 'llama'
  | 'qwen'
  | 'mistral'
  | 'grok'
  | 'generic';

export interface ModelWeaknessProfile {
  /** Tendency to invent APIs, files, or facts not in context (0..1). */
  hallucination: number;
  /** Tendency to truncate output, skim context, or stop early (0..1). */
  laziness: number;
  /** Tendency to emit malformed/garbage tool-call JSON (0..1). */
  toolJsonFragility: number;
  /** Tendency to pad answers with filler/preamble (0..1). */
  verbosity: number;
  /** Tendency to agree with the user instead of verifying (0..1). */
  sycophancy: number;
}

export interface ModelRobustnessProfile {
  family: ModelFamily;
  weaknesses: ModelWeaknessProfile;
  /** Upper bound for sampling temperature; high values amplify hallucination. */
  maxTemperature: number;
  /** Number of repair attempts allowed for malformed tool arguments. */
  toolArgRepairAttempts: number;
  /** When true, answers must cite/stay within supplied evidence. */
  requireGrounding: boolean;
  /** Additive system-prompt text that counters this family's weaknesses. */
  systemPromptHardening: string;
}

const GROUNDING_RULES =
  'Ground every claim in the provided context, files, and evidence. ' +
  'If a fact is not present in the context, say you do not know instead of inventing it. ' +
  'Never reference files, functions, APIs, routes, or config that you have not actually seen in the provided material.';

const COMPLETENESS_RULES =
  'Do not abbreviate code with comments like "// ... rest unchanged" or "// same as above"; emit the complete, runnable result. ' +
  'Read the entire provided context before answering and address every part of the request. Do not stop early.';

const ANTI_SYCOPHANCY_RULES =
  'Do not simply agree with the user. Verify assumptions against the real state of the project and flag anything that is wrong, risky, or missing, even if it contradicts the request.';

const TOOL_JSON_RULES =
  'When calling a tool, output strictly valid JSON for the arguments: no markdown fences, no comments, no trailing commas, no prose around the JSON. Include every required parameter.';

const FAMILY_PROFILES: Record<ModelFamily, ModelRobustnessProfile> = {
  gemini: {
    family: 'gemini',
    weaknesses: { hallucination: 0.8, laziness: 0.7, toolJsonFragility: 0.5, verbosity: 0.4, sycophancy: 0.5 },
    maxTemperature: 0.4,
    toolArgRepairAttempts: 2,
    requireGrounding: true,
    systemPromptHardening: [
      'MODEL RELIABILITY DIRECTIVE (high-context model prone to hallucination and skimming):',
      GROUNDING_RULES,
      COMPLETENESS_RULES,
      TOOL_JSON_RULES,
      'Before concluding, re-check each statement against the supplied context and remove anything you cannot support.',
    ].join('\n'),
  },
  'openai-gpt': {
    family: 'openai-gpt',
    weaknesses: { hallucination: 0.45, laziness: 0.45, toolJsonFragility: 0.2, verbosity: 0.5, sycophancy: 0.6 },
    maxTemperature: 0.6,
    toolArgRepairAttempts: 1,
    requireGrounding: true,
    systemPromptHardening: [
      'MODEL RELIABILITY DIRECTIVE:',
      ANTI_SYCOPHANCY_RULES,
      COMPLETENESS_RULES,
      GROUNDING_RULES,
    ].join('\n'),
  },
  'openai-reasoning': {
    family: 'openai-reasoning',
    weaknesses: { hallucination: 0.35, laziness: 0.3, toolJsonFragility: 0.4, verbosity: 0.3, sycophancy: 0.3 },
    maxTemperature: 1,
    toolArgRepairAttempts: 2,
    requireGrounding: true,
    systemPromptHardening: [
      'MODEL RELIABILITY DIRECTIVE (reasoning model with weak tool/function adherence):',
      'Follow tool schemas exactly when tools are provided.',
      GROUNDING_RULES,
    ].join('\n'),
  },
  claude: {
    family: 'claude',
    weaknesses: { hallucination: 0.3, laziness: 0.35, toolJsonFragility: 0.2, verbosity: 0.6, sycophancy: 0.4 },
    maxTemperature: 0.7,
    toolArgRepairAttempts: 1,
    requireGrounding: true,
    systemPromptHardening: [
      'MODEL RELIABILITY DIRECTIVE:',
      'Skip lengthy preamble; lead with the result. ' + COMPLETENESS_RULES,
      GROUNDING_RULES,
    ].join('\n'),
  },
  deepseek: {
    family: 'deepseek',
    weaknesses: { hallucination: 0.55, laziness: 0.5, toolJsonFragility: 0.6, verbosity: 0.4, sycophancy: 0.45 },
    maxTemperature: 0.5,
    toolArgRepairAttempts: 3,
    requireGrounding: true,
    systemPromptHardening: [
      'MODEL RELIABILITY DIRECTIVE (open model with fragile tool JSON):',
      TOOL_JSON_RULES,
      GROUNDING_RULES,
      COMPLETENESS_RULES,
    ].join('\n'),
  },
  llama: {
    family: 'llama',
    weaknesses: { hallucination: 0.6, laziness: 0.55, toolJsonFragility: 0.6, verbosity: 0.4, sycophancy: 0.5 },
    maxTemperature: 0.5,
    toolArgRepairAttempts: 3,
    requireGrounding: true,
    systemPromptHardening: [
      'MODEL RELIABILITY DIRECTIVE (open model with fragile tool JSON):',
      TOOL_JSON_RULES,
      GROUNDING_RULES,
      COMPLETENESS_RULES,
    ].join('\n'),
  },
  qwen: {
    family: 'qwen',
    weaknesses: { hallucination: 0.55, laziness: 0.5, toolJsonFragility: 0.55, verbosity: 0.4, sycophancy: 0.5 },
    maxTemperature: 0.5,
    toolArgRepairAttempts: 3,
    requireGrounding: true,
    systemPromptHardening: [
      'MODEL RELIABILITY DIRECTIVE (open model with fragile tool JSON):',
      TOOL_JSON_RULES,
      GROUNDING_RULES,
      COMPLETENESS_RULES,
    ].join('\n'),
  },
  mistral: {
    family: 'mistral',
    weaknesses: { hallucination: 0.55, laziness: 0.5, toolJsonFragility: 0.5, verbosity: 0.4, sycophancy: 0.5 },
    maxTemperature: 0.5,
    toolArgRepairAttempts: 2,
    requireGrounding: true,
    systemPromptHardening: [
      'MODEL RELIABILITY DIRECTIVE:',
      TOOL_JSON_RULES,
      GROUNDING_RULES,
      COMPLETENESS_RULES,
    ].join('\n'),
  },
  grok: {
    family: 'grok',
    weaknesses: { hallucination: 0.5, laziness: 0.45, toolJsonFragility: 0.35, verbosity: 0.45, sycophancy: 0.45 },
    maxTemperature: 0.6,
    toolArgRepairAttempts: 2,
    requireGrounding: true,
    systemPromptHardening: [
      'MODEL RELIABILITY DIRECTIVE:',
      GROUNDING_RULES,
      COMPLETENESS_RULES,
    ].join('\n'),
  },
  generic: {
    family: 'generic',
    weaknesses: { hallucination: 0.5, laziness: 0.5, toolJsonFragility: 0.45, verbosity: 0.45, sycophancy: 0.5 },
    maxTemperature: 0.6,
    toolArgRepairAttempts: 2,
    requireGrounding: true,
    systemPromptHardening: [
      'MODEL RELIABILITY DIRECTIVE:',
      GROUNDING_RULES,
      COMPLETENESS_RULES,
      TOOL_JSON_RULES,
    ].join('\n'),
  },
};

/**
 * Identify a model family from its id, tolerating provider prefixes such as
 * `openrouter/`, `google/`, vendor suffixes, and date stamps.
 */
export function detectModelFamily(modelId: string): ModelFamily {
  const id = String(modelId || '').toLowerCase();

  if (!id) return 'generic';
  if (id.includes('gemini') || id.includes('gemma')) return 'gemini';
  // Reasoning models must be checked before the generic gpt/o-series catch.
  if (/(^|[/\-])o[134](-|$|\b)/.test(id) || id.includes('o1-') || id.includes('o3-') || id.includes('o4-')) {
    return 'openai-reasoning';
  }
  if (id.includes('gpt') || id.includes('chatgpt') || id.includes('openai/')) return 'openai-gpt';
  if (id.includes('claude') || id.includes('anthropic')) return 'claude';
  if (id.includes('deepseek')) return 'deepseek';
  if (id.includes('llama') || id.includes('meta-llama')) return 'llama';
  if (id.includes('qwen')) return 'qwen';
  if (id.includes('mistral') || id.includes('mixtral') || id.includes('codestral')) return 'mistral';
  if (id.includes('grok')) return 'grok';

  return 'generic';
}

export function getModelRobustnessProfile(modelId: string): ModelRobustnessProfile {
  return FAMILY_PROFILES[detectModelFamily(modelId)];
}

/**
 * Clamp a requested temperature to the model's reliability ceiling. Returns the
 * input unchanged when it is already safe, and leaves `undefined` untouched so
 * provider defaults still apply when the caller did not request a temperature.
 */
export function clampTemperatureForModel(
  modelId: string,
  temperature: number | undefined
): number | undefined {
  if (typeof temperature !== 'number' || Number.isNaN(temperature)) return temperature;
  const ceiling = getModelRobustnessProfile(modelId).maxTemperature;
  return Math.min(temperature, ceiling);
}

const HARDENING_MARKER = 'MODEL RELIABILITY DIRECTIVE';

/**
 * Append model-specific reliability hardening to the first system message
 * (or prepend a new system message when none exists). Idempotent: the marker
 * prevents double-injection if called more than once on the same array.
 */
export function applyModelRobustnessHardening<T extends { role: string; content: string }>(
  messages: T[],
  modelId: string
): T[] {
  const profile = getModelRobustnessProfile(modelId);
  const hardening = profile.systemPromptHardening.trim();
  if (!hardening) return messages;
  if (messages.some((message) => message.role === 'system' && message.content.includes(HARDENING_MARKER))) {
    return messages;
  }

  const firstSystemIndex = messages.findIndex((message) => message.role === 'system');
  if (firstSystemIndex === -1) {
    const systemMessage = { role: 'system', content: hardening } as T;
    return [systemMessage, ...messages];
  }

  return messages.map((message, index) =>
    index === firstSystemIndex
      ? ({ ...message, content: `${message.content}\n\n${hardening}` } as T)
      : message
  );
}
