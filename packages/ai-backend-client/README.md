# @theia/ai-backend-client

Aethel Backend API Client for Theia Desktop IDE.

## Overview

This package provides a **centralized API client** to connect the Theia Desktop IDE to the Aethel Backend (`http://localhost:8000`). It eliminates the need for direct AI SDK calls (OpenAI, Anthropic, etc.) from the desktop, routing all AI requests through the backend for:

- ✅ **Unified telemetry** and logging
- ✅ **Centralized billing** tracking
- ✅ **Rate limiting** enforcement
- ✅ **API key management** in one place
- ✅ **Consistent error handling**

## Architecture

```
Desktop IDE (Theia)
  └─> @theia/ai-openai (SHIM)
        └─> @theia/ai-backend-client
              └─> HTTP/SSE → Backend (FastAPI)
                              └─> OpenAI SDK
```

**Before** (8 duplicate AI clients):
```typescript
// Each AI package called providers directly
import { OpenAI } from 'openai';
const client = new OpenAI({ apiKey: 'sk-...' });
const response = await client.chat.completions.create({ ... });
```

**After** (centralized):
```typescript
// All AI packages route through backend
import { getDefaultClient } from '@theia/ai-backend-client';
const client = getDefaultClient();
const response = await client.chat({ provider: 'openai', model: 'gpt-4', ... });
```

## Installation

```bash
cd cloud-ide-desktop/aethel_theia_fork/packages/ai-backend-client
yarn install
yarn build
```

## Usage

### Basic Chat Request

```typescript
import { getDefaultClient, ChatCompletionRequest } from '@theia/ai-backend-client';

const client = getDefaultClient();

const request: ChatCompletionRequest = {
  provider: 'openai',
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ],
  temperature: 0.7,
  max_tokens: 500
};

const response = await client.chat(request);
console.log(response.content); // AI response text
console.log(response.usage);   // Token usage
```

### Streaming Chat

```typescript
for await (const chunk of client.chatStream(request)) {
  process.stdout.write(chunk); // Print each token as it arrives
}
```

### Health Check

```typescript
const health = await client.health();
console.log(health.status); // "ok"
console.log(health.version); // "1.0.0"
```

### Model Management

```typescript
// Load a model
await client.loadModel({
  model_name: 'llama2',
  provider: 'ollama',
  device: 'cuda'
});

// List loaded models
const models = await client.listModels();
console.log(models); // ['llama2', 'gpt-4', ...]

// Unload a model
await client.unloadModel('llama2');
```

## Configuration

Set environment variables:

```bash
# Backend URL (default: http://localhost:8000)
export AETHEL_BACKEND_URL=http://localhost:8000

# Optional: Backend auth token
export AETHEL_BACKEND_TOKEN=your-jwt-token-here

# Enable debug logging
export NODE_ENV=development
```

## API Reference

### `AethelAIBackendClient`

Main client class for interacting with the Aethel Backend.

#### Constructor

```typescript
new AethelAIBackendClient(config: AethelBackendClientConfig)
```

**Config Options**:
- `baseUrl`: Backend URL (e.g., `http://localhost:8000`)
- `token?`: JWT auth token
- `timeout?`: Request timeout in ms (default: 60000)
- `retries?`: Number of retries on network errors (default: 3)
- `enableLogging?`: Enable console logging (default: false)

#### Methods

- `chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>`
- `chatStream(request: ChatCompletionRequest): AsyncGenerator<string>`
- `loadModel(request: ModelLoadRequest): Promise<LoadModelResponse>`
- `runInference(request: InferenceRequest): Promise<InferenceResponse>`
- `listModels(): Promise<string[]>`
- `unloadModel(modelName: string): Promise<{ status: string }>`
- `getGPUInfo(): Promise<any>`
- `health(): Promise<Health>`

### Helper Functions

- `getDefaultClient()`: Get singleton client instance
- `setDefaultClient(client: AethelAIBackendClient)`: Set singleton instance

## Error Handling

All errors are caught and returned in the response:

```typescript
const response = await client.chat(request);
if (response.error) {
  console.error('AI request failed:', response.error);
  // Possible errors:
  // - "HTTP 503: Service Unavailable"
  // - "No response from backend (connection refused or timeout)"
  // - "API key not configured for provider: openai"
}
```

## Integration with AI Providers

This package is used by all AI provider shims:

- `@theia/ai-openai` → Routes to backend `/ai-runtime/chat?provider=openai`
- `@theia/ai-anthropic` → Routes to backend `/ai-runtime/chat?provider=anthropic`
- `@theia/ai-ollama` → Routes to backend `/ai-runtime/chat?provider=ollama`
- `@theia/ai-hugging-face` → Routes to backend `/ai-runtime/chat?provider=huggingface`
- `@theia/ai-google` → Routes to backend `/ai-runtime/chat?provider=google`

## Testing

```bash
yarn test
```

## License

EPL-2.0

## Related

- Backend API: `cloud-admin-ia/backend/app/api/ai_runtime.py`
- Web Client: `cloud-web-app/web/lib/api.ts` (AethelAPIClient)
- Documentation: `ANALISE_IDE_COMPLETA_OUT2025.md`
