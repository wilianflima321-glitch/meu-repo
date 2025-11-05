Quick start: External LLM providers for ai-ide

This package adds a lightweight provider registry so users can configure external LLM providers and use them from the IDE.

How it works (short):
- Providers are stored in preferences under `ai.externalProviders` (array).
- A default provider id is stored under `ai.defaultProvider`.
- The service `LlmProviderService` instantiates a provider and sends requests.
- `CustomHttpProvider` is a minimal HTTP client that sends POST JSON to the configured endpoint with an optional Bearer API key.

Add a provider (quick):
- Open the developer console or run the command `AI: Add LLM Provider` (will prompt you to paste a JSON object) and paste JSON like:

  { "id": "myopenai", "name": "My OpenAI", "type": "custom", "endpoint": "https://api.openai.com/v1/chat/completions", "apiKey": "sk-..." }

- Or edit preferences and add an entry in `ai.externalProviders` manually.
- Set the default provider id in `ai.defaultProvider`.

Security note:
- This basic implementation stores API keys in preferences (which may be insecure). For production, integrate with a secret store or ask the user to provide keys per-session.

Next steps to complete the UX:
- Add a proper dialog UI for adding/removing providers (instead of `prompt`).
- Add provider validation and test-request UI.
- Integrate provider selection in agent flows (e.g., allow Orchestrator to choose provider per-agent/session).
