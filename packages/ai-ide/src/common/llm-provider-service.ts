import { SendRequestOptions, LlmProviderResponse } from './llm-provider';

// Common abstract service token used by both browser and common/runtime code.
// Implementations in browser (and later node) should implement/extend this class
// so common code can depend on it without importing browser-specific modules.
export abstract class LlmProviderService {
  /**
   * Send a request to the configured provider. Returns a provider-shaped response.
   */
  abstract sendRequestToProvider(providerId: string | undefined, options: SendRequestOptions): Promise<LlmProviderResponse>;

  /** Optional event emitter consumers can subscribe to for provider warnings */
  // use `unknown` to avoid allowing `any` in common APIs; consumers can cast if needed
  onDidProviderWarning?: (ev: unknown) => void;

  /**
   * Optional streaming API. Implementations may override to provide an
   * AsyncIterable of streaming chunks. Default implementation throws so
   * callers can detect non-supported providers gracefully.
   */
  async *streamRequestToProvider(_providerId: string | undefined, _options: SendRequestOptions): AsyncIterable<unknown> {
    throw new Error('Streaming not supported by this LlmProviderService implementation');
  }
}

export default LlmProviderService;
