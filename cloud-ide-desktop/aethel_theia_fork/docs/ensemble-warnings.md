# Ensemble warnings and verificationMode

Este documento descreve como a IDE trata `warnings` provenientes de provedores LLM e o modo de verificação `soft`/`strict`.

Conceitos principais
- `EnsembleProvider`: executa múltiplos provedores e agrega respostas. Se algum provedor retornar `warnings` (array de strings), o `EnsembleProvider` agrupa e deduplica essas mensagens e atribui ao campo `response.warnings`.
- `LlmProviderService.onDidProviderWarning`: um evento emitido quando uma resposta de provedor contém avisos. A payload é `{ providerId, warnings, options }`.
- `verificationMode`: configuração por provedor/ensemble que pode ser `soft` (retorna avisos, não bloqueia) ou `strict` (bloqueia e retorna erro HTTP 422 em dev/mock).

Como funciona na prática
- Quando um provedor retorna `warnings`, o `LlmProviderService` dispara `onDidProviderWarning`.
- A camada de ativação da IDE (arquivo `ai-ide-activation-service.ts`) subscreve esse evento e exibe um banner não-bloqueante com um resumo e botão de detalhes. Também exibe um `MessageService.warn(...)` curto.

Verificador (mock)
- O verificador dev (`tools/llm-mock/lib/verifier.js`) contém checagens determinísticas para detectar conteúdos sensíveis: armas, fumaça, violência, auto-harm, drogas, nudity, anomalias de cronologia, frases de auto-harm e cenários envolvendo crianças.
- Flags de verificação utilizadas (exemplos): `no_weapons`, `no_self_harm`, `chronology_checks`, `drug_checks`, `child_safety`.

Testes
- Tests unitários do verificador estão em `tools/llm-mock/__tests__` e cobrem as novas regras.
- Um teste smoke para verificar a emissão de eventos está em `tools/tests/llm_provider_service_smoke.js`.

Próximos passos
- Criar teste Playwright que execute o fluxo UI completo (criar ensemble com `verificationMode: 'soft'` e verificar o banner). Há um scaffold em `examples/playwright/tests/soft-warn.spec.ts`.
