export interface SendRequestOptions {
  input: string;
  // Use unknown for settings to avoid allowing unconstrained `any` in common APIs
  settings?: Record<string, unknown>;
  // cancellationToken, tools, etc. can be added later
}

// backward-compatible alias some files expected
export type LlmRequestPayload = SendRequestOptions;

export interface LlmProviderResponse {
  status: number;
  // provider responses are unstructured; use `unknown` at the common boundary
  body: unknown;
  // optional warnings produced by verification / provider (soft-warn)
  warnings?: string[];
}
export type LlmProviderType = 'custom' | 'aethel';

export interface ILlmProvider {
  id: string;
  name: string;
  type: LlmProviderType;
  description?: string;
  isEnabled?: boolean;
  sendRequest(options: SendRequestOptions): Promise<LlmProviderResponse>;
}
