// Re-export the browser implementation as the canonical service.
// The ai-ide package keeps the concrete provider service in the browser layer.
export * from '../browser/llm-provider-service';
