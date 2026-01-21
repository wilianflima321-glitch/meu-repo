# RELATÓRIO DOC 1–DOC 10 (EVIDÊNCIAS REAIS)

**Escopo:** validação do que existe em código e comparação com documentos, sem suposições. Cada afirmação abaixo aponta para evidência em arquivo.

---

## DOC 1 — Sumário Executivo (Real x Declarado)

**O que existe em código (confirmado):**
- Sandbox de execução com isolamento, validação de padrões perigosos, timeout e sanitização de saída. Evidência: [meu-repo/cloud-web-app/web/lib/sandbox/script-sandbox.ts](meu-repo/cloud-web-app/web/lib/sandbox/script-sandbox.ts)
- Carteira de créditos com cálculo, reserva e ledger via Prisma. Evidência: [meu-repo/cloud-web-app/web/lib/credit-wallet.ts](meu-repo/cloud-web-app/web/lib/credit-wallet.ts)
- Renderização com pós-processamento (SMAA, Bloom, ACES Filmic) no renderer WebGL. Evidência: [meu-repo/cloud-web-app/web/lib/aaa-renderer-impl.ts](meu-repo/cloud-web-app/web/lib/aaa-renderer-impl.ts)
- Loop de jogo com ECS, física WASM (Rapier) e sequenciador. Evidência: [meu-repo/cloud-web-app/web/lib/game-loop.ts](meu-repo/cloud-web-app/web/lib/game-loop.ts)
- Física real com Rapier WASM e wrappers. Evidência: [meu-repo/cloud-web-app/web/lib/physics-engine-real.ts](meu-repo/cloud-web-app/web/lib/physics-engine-real.ts)
- Pipeline de assets no web (importadores) e pipeline AAA com tipagem extensa. Evidências: [meu-repo/cloud-web-app/web/lib/asset-pipeline.ts](meu-repo/cloud-web-app/web/lib/asset-pipeline.ts), [meu-repo/cloud-web-app/web/lib/aaa-asset-pipeline.ts](meu-repo/cloud-web-app/web/lib/aaa-asset-pipeline.ts)
- Downloader e processor de assets no server. Evidências: [meu-repo/server/src/services/asset-downloader.ts](meu-repo/server/src/services/asset-downloader.ts), [meu-repo/server/src/services/asset-processor.ts](meu-repo/server/src/services/asset-processor.ts)
- WebGPU renderer no desktop (Theia fork). Evidência: [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/render/webgpu-renderer.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/render/webgpu-renderer.ts)
- Deep Context Engine implementado em código. Evidência: [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/context/deep-context-engine.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/context/deep-context-engine.ts)

**O que os docs declaram (comparação):**
- Segurança, confiabilidade, críticos e guardrails declarados como “Production Ready”. Evidência: [meu-repo/RELIABILITY_SECURITY.md](meu-repo/RELIABILITY_SECURITY.md)
- Checklist de deploy cobrindo testes, segurança, performance e observabilidade. Evidência: [meu-repo/DEPLOYMENT_CHECKLIST.md](meu-repo/DEPLOYMENT_CHECKLIST.md)
- Docker e serviços locais (Postgres/Redis/Web/Nginx). Evidência: [meu-repo/DOCKER_SETUP.md](meu-repo/DOCKER_SETUP.md)
- Integrações UI prontas com pendências de backend (LSP/DAP/Git/Terminal). Evidência: [meu-repo/INTEGRATION_STATUS.md](meu-repo/INTEGRATION_STATUS.md)
- Limitações de IA e partes “a implementar”. Evidência: [meu-repo/ANALISE_PROFUNDA_LIMITACOES_IA_E_SOLUCOES.md](meu-repo/ANALISE_PROFUNDA_LIMITACOES_IA_E_SOLUCOES.md)
- Plano tático com tarefas de limpeza e módulos “mock” no admin. Evidência: [meu-repo/PLANO_ACAO_TECNICA_2026.md](meu-repo/PLANO_ACAO_TECNICA_2026.md)

---

## DOC 2 — Core de Engine (Jogo/Filme)

**Confirmado em código:**
- Loop principal com ECS, física, sequenciador e renderização. Evidência: [meu-repo/cloud-web-app/web/lib/game-loop.ts](meu-repo/cloud-web-app/web/lib/game-loop.ts)
- Física WASM real via Rapier e wrappers. Evidência: [meu-repo/cloud-web-app/web/lib/physics-engine-real.ts](meu-repo/cloud-web-app/web/lib/physics-engine-real.ts)
- Renderização com pós-processamento cinematográfico (Bloom, SMAA, ACES). Evidência: [meu-repo/cloud-web-app/web/lib/aaa-renderer-impl.ts](meu-repo/cloud-web-app/web/lib/aaa-renderer-impl.ts)

**Limitações/alertas reais:**
- Worker de física no web possui fallback para mock Rapier se falhar o carregamento. Evidência: [meu-repo/cloud-web-app/web/public/workers/physics.worker.js](meu-repo/cloud-web-app/web/public/workers/physics.worker.js)

---

## DOC 3 — Pipeline de Assets (Web + Server)

**Confirmado em código:**
- Pipeline web com importadores de textura/áudio/modelo e metadados básicos. Evidência: [meu-repo/cloud-web-app/web/lib/asset-pipeline.ts](meu-repo/cloud-web-app/web/lib/asset-pipeline.ts)
- Pipeline AAA com tipagem extensa para mesh/texture/material/prefab e LODs. Evidência: [meu-repo/cloud-web-app/web/lib/aaa-asset-pipeline.ts](meu-repo/cloud-web-app/web/lib/aaa-asset-pipeline.ts)
- Serviço de download com cache, retry e checksum. Evidência: [meu-repo/server/src/services/asset-downloader.ts](meu-repo/server/src/services/asset-downloader.ts)
- Processor de assets com conversão e LODs. Evidência: [meu-repo/server/src/services/asset-processor.ts](meu-repo/server/src/services/asset-processor.ts)

**Limitações/alertas reais:**
- Simplificação de modelo usa gltf-transform/gltf-pipeline quando disponível, com fallback. Evidência: [meu-repo/server/src/services/asset-processor.ts](meu-repo/server/src/services/asset-processor.ts)

---

## DOC 4 — Render & Editor (IDE/WebGPU)

**Confirmado em código:**
- WebGPU renderer com pipelines, draw/dispatch e eventos. Evidência: [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/render/webgpu-renderer.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/render/webgpu-renderer.ts)
- Renderizador WebGL com pipeline cinematográfico no web. Evidência: [meu-repo/cloud-web-app/web/lib/aaa-renderer-impl.ts](meu-repo/cloud-web-app/web/lib/aaa-renderer-impl.ts)

**Doc vs código:**
- Documento de integração afirma UI pronta, mas lista pendências de backend (LSP/DAP/Git/Terminal). Evidência: [meu-repo/INTEGRATION_STATUS.md](meu-repo/INTEGRATION_STATUS.md)

---

## DOC 5 — IA, Sandbox e Custos

**Confirmado em código:**
- Sandbox com validação de padrões perigosos, timeout e sanitização. Evidência: [meu-repo/cloud-web-app/web/lib/sandbox/script-sandbox.ts](meu-repo/cloud-web-app/web/lib/sandbox/script-sandbox.ts)
- Credit Wallet com reserva, ledger e cálculo de custos. Evidência: [meu-repo/cloud-web-app/web/lib/credit-wallet.ts](meu-repo/cloud-web-app/web/lib/credit-wallet.ts)
- Administração de settings com RBAC e audit log. Evidência: [meu-repo/cloud-web-app/web/app/api/admin/ide-settings/route.ts](meu-repo/cloud-web-app/web/app/api/admin/ide-settings/route.ts)
- Deep Context Engine implementado (núcleo de contexto). Evidência: [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/context/deep-context-engine.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/context/deep-context-engine.ts)

**Doc vs código:**
- Documento reconhece partes “a implementar” (memória persistente e análise de assets). Evidência: [meu-repo/ANALISE_PROFUNDA_LIMITACOES_IA_E_SOLUCOES.md](meu-repo/ANALISE_PROFUNDA_LIMITACOES_IA_E_SOLUCOES.md)

---

## DOC 6 — Segurança & Confiabilidade

**Documentado:**
- Chaos testing, critics, guardrails e trilha imutável. Evidência: [meu-repo/RELIABILITY_SECURITY.md](meu-repo/RELIABILITY_SECURITY.md)

**Confirmado em código (amostra):**
- Sandbox com bloqueio de padrões perigosos e isolamento por Worker. Evidência: [meu-repo/cloud-web-app/web/lib/sandbox/script-sandbox.ts](meu-repo/cloud-web-app/web/lib/sandbox/script-sandbox.ts)

**Alertas:**
- Documento declara “Production Ready”, mas não há verificação automática no código analisado aqui. Necessário mapear implementações mencionadas no doc (ex.: caminhos `src/common/reliability/*`) se essa base for parte do build real. Evidência do doc: [meu-repo/RELIABILITY_SECURITY.md](meu-repo/RELIABILITY_SECURITY.md)

---

## DOC 7 — Deploy, Infra e Operação

**Documentado:**
- Checklist completo de build/teste/segurança/perf/observabilidade. Evidência: [meu-repo/DEPLOYMENT_CHECKLIST.md](meu-repo/DEPLOYMENT_CHECKLIST.md)
- Docker Compose com Postgres/Redis/Web/Nginx e variáveis de ambiente. Evidência: [meu-repo/DOCKER_SETUP.md](meu-repo/DOCKER_SETUP.md)

---

## DOC 8 — Mocks, Stubs e Placeholders (onde existem)

**Confirmado em código:**
- Worker de build/export operacional (ZIP, S3/local, manifesto e assets opcionais). Evidência: [meu-repo/cloud-web-app/web/server/workers/build-queue-worker.ts](meu-repo/cloud-web-app/web/server/workers/build-queue-worker.ts)
- Física worker com fallback de mock Rapier. Evidência: [meu-repo/cloud-web-app/web/public/workers/physics.worker.js](meu-repo/cloud-web-app/web/public/workers/physics.worker.js)
- Delta patch do auto-updater aplica via bspatch/xdelta3 quando disponível. Evidência: [meu-repo/server/src/services/auto-updater.ts](meu-repo/server/src/services/auto-updater.ts)
- Auth offline usa usuário mock para desenvolvimento. Evidência: [meu-repo/server/src/services/offline-auth.ts](meu-repo/server/src/services/offline-auth.ts)
- Hook de assets menciona substituição de dados mock por dados reais. Evidência: [meu-repo/cloud-web-app/web/hooks/useProjectAssets.ts](meu-repo/cloud-web-app/web/hooks/useProjectAssets.ts)

---

## DOC 9 — Gaps vs Unreal (apenas o que é verificável)

**Coberturas parciais reais:**
- Física (Rapier WASM) e loop de jogo com ECS. Evidências: [meu-repo/cloud-web-app/web/lib/physics-engine-real.ts](meu-repo/cloud-web-app/web/lib/physics-engine-real.ts), [meu-repo/cloud-web-app/web/lib/game-loop.ts](meu-repo/cloud-web-app/web/lib/game-loop.ts)
- Render com pós-processamento cinematográfico. Evidência: [meu-repo/cloud-web-app/web/lib/aaa-renderer-impl.ts](meu-repo/cloud-web-app/web/lib/aaa-renderer-impl.ts)
- Pipeline de assets e serviços de download/processamento. Evidências: [meu-repo/cloud-web-app/web/lib/asset-pipeline.ts](meu-repo/cloud-web-app/web/lib/asset-pipeline.ts), [meu-repo/server/src/services/asset-downloader.ts](meu-repo/server/src/services/asset-downloader.ts), [meu-repo/server/src/services/asset-processor.ts](meu-repo/server/src/services/asset-processor.ts)

**Gaps evidenciados por docs (não confirmados em código neste recorte):**
- Documento lista features Unreal-like ainda “próximos passos” (Blueprint/Level/Material/Animation/Profiling). Evidência: [meu-repo/INTEGRATION_STATUS.md](meu-repo/INTEGRATION_STATUS.md)
- Documento de limitações reconhece partes “a implementar”. Evidência: [meu-repo/ANALISE_PROFUNDA_LIMITACOES_IA_E_SOLUCOES.md](meu-repo/ANALISE_PROFUNDA_LIMITACOES_IA_E_SOLUCOES.md)

---

## DOC 10 — Plano de Ação Prioritário (baseado em evidências)

**P0 — Remover/fechar gaps operacionais (produção):**
1. ✅ Substituir placeholder de LOD/simplificação por pipeline real (gltf-transform/gltf-pipeline). Evidência: [meu-repo/server/src/services/asset-processor.ts](meu-repo/server/src/services/asset-processor.ts)
2. ✅ Implementar build/export real no worker (ZIP, S3/local, manifesto/assets). Evidência: [meu-repo/cloud-web-app/web/server/workers/build-queue-worker.ts](meu-repo/cloud-web-app/web/server/workers/build-queue-worker.ts)
3. Remover dependência de mock Rapier no worker ou garantir bundling offline de Rapier. Evidência: [meu-repo/cloud-web-app/web/public/workers/physics.worker.js](meu-repo/cloud-web-app/web/public/workers/physics.worker.js)
4. ✅ Implementar delta patch real no auto-updater (bspatch/xdelta3). Evidência: [meu-repo/server/src/services/auto-updater.ts](meu-repo/server/src/services/auto-updater.ts)

**P1 — Alinhar docs com o código real:**
1. Atualizar doc de confiabilidade para mapear arquivos reais e status. Evidência do doc: [meu-repo/RELIABILITY_SECURITY.md](meu-repo/RELIABILITY_SECURITY.md)
2. Sincronizar “Integração Status” com implementações reais do backend. Evidência: [meu-repo/INTEGRATION_STATUS.md](meu-repo/INTEGRATION_STATUS.md)

**P2 — Evolução do editor/engine:**
1. Consolidar pipeline AAA e assets no backend com processamento real. Evidências: [meu-repo/cloud-web-app/web/lib/aaa-asset-pipeline.ts](meu-repo/cloud-web-app/web/lib/aaa-asset-pipeline.ts), [meu-repo/server/src/services/asset-processor.ts](meu-repo/server/src/services/asset-processor.ts)
2. Formalizar testes e observabilidade conforme checklist. Evidência do doc: [meu-repo/DEPLOYMENT_CHECKLIST.md](meu-repo/DEPLOYMENT_CHECKLIST.md)

---

## Conclusão
O repositório contém núcleos reais de engine (render, física, loop), pipeline de assets e sistemas de IA (sandbox/credit/admin settings). Há evidências de stubs/placeholder em componentes críticos (build/export, LOD simplification, delta updates, fallback de física). Os documentos descrevem uma visão mais ampla, com parte já implementada (ex.: Deep Context Engine) e parte explicitamente “a implementar”.

---

## Atualizações recentes (2026-01-15)
- Preview real de assets (imagem/áudio/vídeo/GLTF) no navegador. Evidência: [meu-repo/cloud-web-app/web/components/assets/ContentBrowserConnected.tsx](meu-repo/cloud-web-app/web/components/assets/ContentBrowserConnected.tsx)
- Export real de assets e manifesto com URLs assinadas quando S3 está ativo. Evidência: [meu-repo/cloud-web-app/web/server/workers/build-queue-worker.ts](meu-repo/cloud-web-app/web/server/workers/build-queue-worker.ts)
- LODs gerados no export (gltf-transform) e guardrails de download. Evidências: [meu-repo/cloud-web-app/web/server/workers/build-queue-worker.ts](meu-repo/cloud-web-app/web/server/workers/build-queue-worker.ts), [meu-repo/server/src/services/asset-downloader.ts](meu-repo/server/src/services/asset-downloader.ts)

Se quiser, prossigo com uma **versão expandida** do relatório incluindo verificação de arquivos adicionais (ex.: backend de serviços citados em RELIABILITY_SECURITY.md) e a **matriz completa “Doc claim → Arquivo real → Status”**.

---

## Complementos (novos docs verificados)

### 1) Onboarding/instalador e “primeiro uso”
- Documento estratégico afirma necessidade de instalador/wizard e aponta que hoje depende de script. Evidência: [ALINHAMENTO_ESTRATEGICO_FINAL_GAPS.md](ALINHAMENTO_ESTRATEGICO_FINAL_GAPS.md)
- Script real de lançamento agora pode executar instalador opcional e iniciar backend + portal. Evidência: [AETHEL_LAUNCH.ps1](AETHEL_LAUNCH.ps1)
- Documento de monetização/UX repete a lacuna do instalador inteligente. Evidência: [ROADMAP_MONETIZACAO_XP_FINAL.md](ROADMAP_MONETIZACAO_XP_FINAL.md)
- Documento de auditoria confirma ausência de onboarding e necessidade de wizard visual. Evidência: [AUDITORIA_TECNICA_FINAL_COMPLETA.md](AUDITORIA_TECNICA_FINAL_COMPLETA.md)

### 2) Tutoriais e expectativa de instaladores
- O tutorial “Hello World” referencia instaladores via `install.ps1`/`install.sh`. Evidência: [docs/HELLO_WORLD_TUTORIAL.md](docs/HELLO_WORLD_TUTORIAL.md)
- O setup real já inclui instaladores e o launcher suporta setup opcional, reduzindo o conflito. Evidências: [docs/HELLO_WORLD_TUTORIAL.md](docs/HELLO_WORLD_TUTORIAL.md), [AETHEL_LAUNCH.ps1](AETHEL_LAUNCH.ps1)

### 3) Reivindicações de “implementação 100% real” (necessita validação adicional)
- Documento declara “Zero Mocks” e lista módulos (wizard, viewport, audio graph, asset pipeline service etc.). Evidência: [AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md](AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md)
- Documento de UX inclui blocos de código que parecem exemplos conceituais de wizard. Evidência: [meu-repo/USABILIDADE_EXPERIENCIA_USUARIO.md](meu-repo/USABILIDADE_EXPERIENCIA_USUARIO.md)
- Documento de resumo de implementação lista vários arquivos e serviços “produzidos”. Evidência: [IMPLEMENTATION_SUMMARY_2025.md](IMPLEMENTATION_SUMMARY_2025.md)

**Observação de validação:** os arquivos citados acima precisam de conferência individual dentro do repositório (ex.: `game-creation-wizard.tsx`, `welcome-wizard.tsx`, `onboarding-service.ts`, `asset-pipeline-service.ts`, `webgpu-viewport.tsx`, `audio-graph-editor.tsx`, `motion-capture.ts`). Caso você queira, faço a checagem e marco cada item como **encontrado** ou **não encontrado** com links diretos.

---

## Checagem direta dos arquivos citados (resultado)

**Status geral:** há itens encontrados e itens ausentes (checagem por caminhos reais no workspace).

| Item citado no doc | Status | Evidência do doc | Observação |
| --- | --- | --- | --- |
| [packages/onboarding/welcome-wizard.tsx](packages/onboarding/welcome-wizard.tsx) | ❌ Não encontrado | [meu-repo/USABILIDADE_EXPERIENCIA_USUARIO.md](meu-repo/USABILIDADE_EXPERIENCIA_USUARIO.md) | Trecho aparenta ser exemplo conceitual. |
| [wizards/game-creation-wizard.tsx](wizards/game-creation-wizard.tsx) | ✅ Encontrado | [AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md](AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md) | Local real: [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/wizards/game-creation-wizard.tsx](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/wizards/game-creation-wizard.tsx) |
| [preview/webgpu-viewport.tsx](preview/webgpu-viewport.tsx) | ❌ Não encontrado | [AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md](AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md) | Há renderer WebGPU em [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/render/webgpu-renderer.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/render/webgpu-renderer.ts). |
| [audio/audio-graph-editor.tsx](audio/audio-graph-editor.tsx) | ❌ Não encontrado | [AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md](AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md) | Existe engine em [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/audio/audio-graph-engine.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/audio/audio-graph-engine.ts). |
| [services/motion-capture.ts](services/motion-capture.ts) | ✅ Encontrado | [AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md](AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md) | Locais reais: [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/services/motion-capture.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/services/motion-capture.ts) e [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/services/motion-capture-real.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/services/motion-capture-real.ts). |
| [common/asset-pipeline-service.ts](common/asset-pipeline-service.ts) | ❌ Não encontrado | [AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md](AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md) | Existe OAuth Sketchfab em [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/services/sketchfab-oauth.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/services/sketchfab-oauth.ts). |
| [services/backend-socket.ts](services/backend-socket.ts) | ✅ Encontrado | [AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md](AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md) | Local real: [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/services/backend-socket.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/services/backend-socket.ts). |
| [browser/frontend-module.ts](browser/frontend-module.ts) | ✅ Encontrado | [AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md](AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md) | Local real: [meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/frontend-module.ts](meu-repo/cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/browser/frontend-module.ts). |
| [server/src/services/onboarding-service.ts](server/src/services/onboarding-service.ts) | ❌ Não encontrado | [IMPLEMENTATION_SUMMARY_2025.md](IMPLEMENTATION_SUMMARY_2025.md) | Onboarding real no backend: [meu-repo/server/src/onboarding/onboarding-wizard.ts](meu-repo/server/src/onboarding/onboarding-wizard.ts). |
| [server/src/api/health-routes.ts](server/src/api/health-routes.ts) | ✅ Encontrado | [IMPLEMENTATION_SUMMARY_2025.md](IMPLEMENTATION_SUMMARY_2025.md) | Local real: [meu-repo/server/src/api/health-routes.ts](meu-repo/server/src/api/health-routes.ts). |
| [WalletUI.tsx](WalletUI.tsx) | ❌ Não encontrado | [IMPLEMENTATION_SUMMARY_2025.md](IMPLEMENTATION_SUMMARY_2025.md) | Não localizado no workspace. |
| [useWebSocket.ts](useWebSocket.ts) | ❌ Não encontrado | [IMPLEMENTATION_SUMMARY_2025.md](IMPLEMENTATION_SUMMARY_2025.md) | Não localizado no workspace. |
| [macos-installer.sh](macos-installer.sh) | ❌ Não encontrado | [IMPLEMENTATION_SUMMARY_2025.md](IMPLEMENTATION_SUMMARY_2025.md) | Não localizado no workspace. |
| [linux-installer.sh](linux-installer.sh) | ✅ Encontrado | [IMPLEMENTATION_SUMMARY_2025.md](IMPLEMENTATION_SUMMARY_2025.md) | Local real: [meu-repo/installers/linux/install-aethel.sh](meu-repo/installers/linux/install-aethel.sh). |
| [windows-uninstaller.ps1](windows-uninstaller.ps1) | ✅ Encontrado | [IMPLEMENTATION_SUMMARY_2025.md](IMPLEMENTATION_SUMMARY_2025.md) | Local real: [meu-repo/installers/windows/uninstall-aethel.ps1](meu-repo/installers/windows/uninstall-aethel.ps1). |

---

## Contradições documentais confirmadas

1. Documento afirma “Zero Mocks” e “Implementação 100% realizada”, mas há fallback de mock de física no worker. Evidências: [AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md](AETHEL_ENGINE_COMPLETE_IMPLEMENTATION.md), [meu-repo/cloud-web-app/web/public/workers/physics.worker.js](meu-repo/cloud-web-app/web/public/workers/physics.worker.js)
2. Tutorial aponta instaladores online, porém o script real de launch não instala dependências nem habilita o frontend por padrão. Evidências: [docs/HELLO_WORLD_TUTORIAL.md](docs/HELLO_WORLD_TUTORIAL.md), [AETHEL_LAUNCH.ps1](AETHEL_LAUNCH.ps1)
