??# EXECUTION UPDATE — 2026-04-01



Status: EXECUTADO LOCALMENTE (evidência limitada ao repositório)



## Escopo executado

- Refino PT-BR e tokens Aethel em superfícies críticas (preview, chat, onboarding, billing, marketplace e admin).

- Sweep automatizado em app/components/lib para reduzir utilitários de cor hardcoded.

- Acessibilidade aplicada onde tocado (aria-label, type="button", foco visível).

- Normalização PT-BR em layout global, terminal e gerenciador de workspace.

- Ajustes adicionais em FullscreenIDE, PreviewRuntimeToolbar, ExtensionManager, GitPanelPro, VideoTimeline, DialogueEditor e ControlRigEditor com microcopy operacional em PT-BR.

- Reforço global de foco visível aplicado em `cloud-web-app/web/app/globals.css`.

- Scripts de governança adicionados para bloquear regressões:

  - `tools/check-button-types.mjs` (botões sem type)

  - `tools/check-hardcoded-colors.mjs` (cores hardcoded Tailwind)

  - `package.json` com `qa:button-types` e `qa:hardcoded-colors`.

- Codemod aplicado: adiciona `type="button"` em `<button>` com `onClick` sem type (varredura em app/components/lib).

- Correções adicionais de PT-BR e tokens Aethel em onboarding, billing, settings, dashboard e auth.
- Task system real implementado (persistência em arquivo local) com endpoints `studio/tasks` e validação/aplicação real via API.
- QA Gate agora bloqueia apply quando checks falham (sem simulação).
- Sandbox apply bloqueado para evitar "fake success".


## Superfícies atualizadas (arquivo -> ajuste)

- Layout: `cloud-web-app/web/app/layout.tsx`

  - Metadata principal em PT-BR e skip-link traduzido.

- Terminal: `cloud-web-app/web/components/terminal/TerminalWidget.tsx`

  - Toolbar e busca em PT-BR, botões com type="button" e aria-label.

- Workspace: `cloud-web-app/web/components/workspace/WorkspaceSwitcher.tsx`

  - Semântica de diálogo, labels PT-BR, botões com type="button" e tokens Aethel no estilo.

- Preview: `cloud-web-app/web/components/ide/PreviewPanel.tsx`

  - Prévia CSS em PT-BR e badges operacionais normalizadas.

- Preview runtime: `cloud-web-app/web/components/ide/PreviewRuntimeToolbar.tsx`

  - Microcopy PT-BR com acentuação correta, estados operacionais e acessibilidade.

- Fullscreen IDE: `cloud-web-app/web/components/ide/FullscreenIDE.tsx`

  - Mensagens de erro/rollback, labels de preview e alertas em PT-BR.

- Shell/Explorer: `cloud-web-app/web/components/ide/IDELayout.tsx`, `cloud-web-app/web/components/ide/FileExplorerPro.tsx`

  - Menus em PT-BR e tokens Aethel nas áreas tocadas.

- Chat/IA: `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`

  - Labels PT-BR e controles com aria-label.

- Onboarding: `cloud-web-app/web/components/Onboarding.tsx`, `cloud-web-app/web/components/onboarding/QuickStartWizard.tsx`

  - Tokens Aethel e microcopy PT-BR em etapas e avisos.

- Extensões: `cloud-web-app/web/components/extensions/ExtensionManager.tsx`

  - Rótulos, estados e ações em PT-BR, sem mojibake.

- Terminal/Extensões/Outline: `cloud-web-app/web/components/terminal/XTerminal.tsx`,

  `cloud-web-app/web/components/terminal/IntegratedTerminal.tsx`,

  `cloud-web-app/web/components/extensions/ExtensionManagerPanel.tsx`,

  `cloud-web-app/web/components/outline/OutlinePanel.tsx`,

  `cloud-web-app/web/components/ide/CommandPalette.tsx`

  - Remoção de cores hardcoded em classes utilitárias.

- Onboarding guiado: `cloud-web-app/web/components/onboarding/InteractiveTour.tsx`

  - Substituição de `sky-*` por tokens Aethel e botões com type explícito.

- Billing status: `cloud-web-app/web/components/billing/WalletStatusWidget.tsx`

  - Badges/toggles com tokens Aethel + type="button".

- Settings: `cloud-web-app/web/components/settings/SettingsUI.tsx`

  - Tabs/labels em PT-BR, tokens Aethel e type="button".

- Admin/Security: `cloud-web-app/web/components/dashboard/SecurityDashboard.tsx`

  - Strings PT-BR, tokens de severidade e type="button".

- Auth/Entrada: `cloud-web-app/web/components/auth/AuthExperiencePanel.tsx`

  - Ajustes de tokens Aethel em badges/eyebrow.

- Dashboard AI: `cloud-web-app/web/components/dashboard/DashboardAIChatTab.tsx`

  - Substituição de bordas `sky-*` por tokens Aethel.

- Debug/Keybindings/Feature flags:

  - `cloud-web-app/web/components/debug/AdvancedDebug.tsx`

  - `cloud-web-app/web/components/keybindings/KeybindingsEditor.tsx`

  - `cloud-web-app/web/components/FeatureFlag.tsx`

  - PT-BR, tokens Aethel e type="button".

- Acessibilidade adicional (type="button") aplicada em `cloud-web-app/web/components/search/GlobalSearch.tsx`, `cloud-web-app/web/components/ide/AIAgentsPanelPro.tsx`, `cloud-web-app/web/components/ide/DebugPanel.tsx`, `cloud-web-app/web/components/video/VideoTimelineEditor.tsx`, `cloud-web-app/web/components/physics/FluidSimulationEditor.tsx`, `cloud-web-app/web/components/narrative/QuestEditor.tsx`, `cloud-web-app/web/components/editors/SpriteEditor.tsx` e `cloud-web-app/web/app/profile/page.tsx`.
- Execução real e persistente:
  - `cloud-web-app/web/lib/server/task-store.ts`
  - `cloud-web-app/web/lib/server/qa-gate.ts`
  - `cloud-web-app/web/lib/server/patch-engine.ts`
  - `cloud-web-app/web/lib/server/execution-context.ts`
  - `cloud-web-app/web/lib/server/simulation-guard.ts`
  - `cloud-web-app/web/lib/server/agent-store.ts`
  - `cloud-web-app/web/app/api/studio/tasks/plan/route.ts`
  - `cloud-web-app/web/app/api/studio/tasks/[id]/route.ts`
  - `cloud-web-app/web/app/api/studio/tasks/[id]/run/route.ts`
  - `cloud-web-app/web/app/api/studio/tasks/[id]/validate/route.ts`
  - `cloud-web-app/web/app/api/studio/tasks/[id]/apply/route.ts`
- QA gate em CI:
  - `.github/workflows/ci.yml` (qa:button-types + qa:hardcoded-colors)
- Thinking stream:
  - `cloud-web-app/web/app/api/ai/thinking/[sessionId]/route.ts` (simulação bloqueada quando `AETHEL_DISABLE_SIMULATION` está ativo)
- Guardas de simulação AI:
  - `cloud-web-app/web/app/api/ai/action/route.ts`
  - `cloud-web-app/web/app/api/ai/chat/route.ts`
  - `cloud-web-app/web/app/api/ai/chat-advanced/route.ts`
  - `cloud-web-app/web/app/api/ai/complete/route.ts`
  - `cloud-web-app/web/app/api/ai/inline-completion/route.ts`
  - `cloud-web-app/web/app/api/ai/inline-edit/route.ts`
  - `cloud-web-app/web/app/api/ai/stream/route.ts`
  - `cloud-web-app/web/app/api/ai/context/search/route.ts`
  - `cloud-web-app/web/app/api/ai/agents/route.ts`
  - `cloud-web-app/web/app/api/ai/agents/executions/route.ts`
  - `cloud-web-app/web/app/api/ai/agents/metrics/route.ts`
  - `cloud-web-app/web/app/api/ai/director/[projectId]/route.ts`
  - `cloud-web-app/web/app/api/ai/director/[projectId]/action/route.ts`
  - `cloud-web-app/web/app/api/ai/agent/route.ts` (persistência local de sessão via `agent-store`)


## Varredura local de dívida (app/components/lib)

- Botões sem type="button": **75** ocorrências (scan Python após codemod `onClick`).

- Utilitários de cor hardcoded (bg/text/border/from/to): **134** ocorrências (scan Python).

- Hotspots de microcopy em inglês: **1463** ocorrências (scan Python por padrões-chave).

- Uso de tokens `var(--aethel-*)`: **15323** ocorrências (última contagem registrada).



Observação: `tools/check-button-types.mjs` não rodou aqui por falta de `glob` em `node_modules` raiz; as contagens acima foram obtidas via scan Python no workspace.



Top arquivos (amostra):

- Buttons sem type: `components/extensions/ExtensionManager.tsx`, `components/narrative/DialogueEditor.tsx`, `components/character/ControlRigEditor.tsx`.

- Cores hardcoded: `components/Onboarding.tsx`, `components/onboarding/QuickStartWizard.tsx`, `lib/debug/devtools-provider.tsx`.

- Microcopy inglesa: `components/ide/FullscreenIDE.tsx`, `lib/settings/settings-system.tsx`, `app/admin/apis/page.tsx`.



## Hotspots adicionais (scan parcial via subagentes)

Nota: `rg` bloqueado neste ambiente; scan parcial via Python (top 15). Usar como fila inicial, não como total consolidado.



### Buttons sem type (top 15 parcial)

| Arquivo | Contagem |

| --- | --- |

| `cloud-web-app/web/components/git/GitPanel.tsx` | 14 |

| `cloud-web-app/web/components/editor/SplitEditor.tsx` | 13 |

| `cloud-web-app/web/components/multiplayer/LobbyScreen.tsx` | 13 |

| `cloud-web-app/web/components/terminal/XTerminal.tsx` | 13 |

| `cloud-web-app/web/components/animation/AnimationBlueprintEditor.tsx` | 12 |

| `cloud-web-app/web/components/engine/BlueprintEditor.tsx` | 12 |

| `cloud-web-app/web/components/environment/FoliagePainter.tsx` | 12 |

| `cloud-web-app/web/components/ide/IDELayout.tsx` | 12 |

| `cloud-web-app/web/components/AdminPanel.tsx` | 11 |

| `cloud-web-app/web/components/collaboration/CollaborationPanel.tsx` | 11 |

| `cloud-web-app/web/components/engine/DetailsPanel.tsx` | 11 |

| `cloud-web-app/web/components/engine/LandscapeEditor.tsx` | 11 |

| `cloud-web-app/web/components/ide/DiffViewer.tsx` | 11 |

| `cloud-web-app/web/components/scene-editor/SceneEditor.tsx` | 11 |

| `cloud-web-app/web/components/settings/SettingsPanel.tsx` | 11 |



### Cores hardcoded Tailwind (top 15 parcial)

| Arquivo | Contagem |

| --- | --- |

| `cloud-web-app/web/lib/debug/devtools-provider.tsx` | 14 |

| `cloud-web-app/web/components/character/FacialAnimationEditor.tsx` | 10 |

| `cloud-web-app/web/app/not-found.tsx` | 7 |

| `cloud-web-app/web/components/ServiceWorkerProvider.tsx` | 7 |

| `cloud-web-app/web/components/streaming/pixel-stream-view.tsx` | 7 |

| `cloud-web-app/web/components/ui/GlassmorphismUI.tsx` | 6 |

| `cloud-web-app/web/components/dashboard/DashboardFlowRail.tsx` | 5 |

| `cloud-web-app/web/components/dashboard/JobQueueDashboard.tsx` | 4 |

| `cloud-web-app/web/components/physics/DestructionEditor.tsx` | 4 |

| `cloud-web-app/web/components/settings/SettingsPathConfig.tsx` | 4 |

| `cloud-web-app/web/components/storage/StorageQuotaManager.tsx` | 4 |

| `cloud-web-app/web/components/dashboard/tabs/DownloadTab.tsx` | 4 |

| `cloud-web-app/web/lib/a11y/accessibility.tsx` | 4 |

| `cloud-web-app/web/app/admin/emergency/page.tsx` | 3 |

| `cloud-web-app/web/components/billing/UsageDashboard.tsx` | 3 |



## Gaps reais identificados (com evidência)

### P0

- Preview runtime continua dependente de runtime externo.

  - Evidência: `cloud-web-app/web/components/ide/PreviewRuntimeToolbar.tsx`, `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx`.

- Billing público permanece parcial quando runtime não responde.

  - Evidência: `cloud-web-app/web/components/billing/PublicBillingReadiness.tsx` mostra prontidão parcial.

- Marketplace depende de backend de instalação para paridade ponta a ponta.

  - Evidência: `cloud-web-app/web/app/marketplace/page.tsx` usa endpoints de install/uninstall.



### P1

- Microcopy PT-BR ainda incompleta em várias superfícies (hotspots listados acima).

- Dívida de acessibilidade: grande volume de botões sem type explícito.

- Documento canônico ausente: `docs/master/31_INTERFACE_UX_GAP_EXECUTION_PLAN_2026-03-01.md`.



## Alinhamento de execução (Core Truth)

**Meta:** eliminar simulação e garantir execução real com validação bloqueante.



### Componentes reais já presentes (com evidência)

- Runtime de arquivos real: `cloud-web-app/web/lib/server/filesystem-runtime.ts`.

- Execução de build real: `cloud-web-app/web/lib/server/build-runtime.ts`.

- Runtime de terminal PTY: `cloud-web-app/web/lib/server/terminal-pty-runtime.ts`.

- Validação determinística de mudança: `cloud-web-app/web/lib/server/change-validation.ts`.

- Ledger de execução e rollback: `cloud-web-app/web/lib/server/change-run-ledger.ts`, `cloud-web-app/web/lib/server/change-rollback-store.ts`.

- Apply/rollback reais via API:

  - `cloud-web-app/web/app/api/ai/change/apply/route.ts`

  - `cloud-web-app/web/app/api/ai/change/rollback/route.ts`

  - `cloud-web-app/web/app/api/ai/change/validate/route.ts`



### Gaps críticos confirmados (execução real ainda não end-to-end)

- **Task system persistente inexistente (antes)**: `cloud-web-app/web/app/api/studio/tasks/*` retornava `studioNotImplemented`.
-  - Atualização: implementado com `task-store` em `.aethel/tasks` (persistência local por usuário).
- **Agent mode sem persistência de estado**: sessões em memória.

  - Evidência: `cloud-web-app/web/app/api/ai/agent/route.ts` usa `activeAgents` em memória.

- **Execução com simulação ainda presente**: sandbox apply retorna "simulation completed".
-  - Atualização: sandbox apply agora bloqueado (`SANDBOX_SIMULATION_DISABLED`).
- **QA não bloqueante global**: regras e scripts existem, mas não estão integrados como gate obrigatório de execução/merge.
-  - Atualização: QA Gate bloqueia apply no runtime; CI ainda precisa de integração.
- **Context engine sem persistência**: não há store único de contexto/estado do agente por task.

  - Evidência: ausência de store em `cloud-web-app/web/lib/server` ou `cloud-web-app/web/lib/ai` para tasks.

### Simulações/partial ainda presentes (evidência local)

- **Thinking simulada**: `cloud-web-app/web/app/api/ai/thinking/[sessionId]/route.ts` contém `runtimeMode: 'simulated_preview'` e `simulateThinkingProgress(...)` (agora bloqueado por `AETHEL_DISABLE_SIMULATION`, retornando 501).
- **Sandbox apply com mensagens de simulação**: `cloud-web-app/web/app/api/ai/change/apply/route.ts` ainda contém texto de "sandbox simulation" (mesmo com bloqueio ativo).
- **Bloqueio por env**: `cloud-web-app/web/lib/server/simulation-guard.ts` agora impede fallback demo/partial quando `AETHEL_DISABLE_SIMULATION` está ativo.
  - `AETHEL_DISABLE_SIMULATION` (default: ativo) bloqueia simulação/demos.
  - `AETHEL_ALLOW_PARTIAL=true` permite manter respostas PARTIAL para UX preview.
- **Modo não implementado**: `cloud-web-app/web/app/api/ai/3d/generate/route.ts` retorna 501 (`Mode not implemented`).
- **CapabilityStatus PARTIAL em rotas AI** (exposição de execução parcial):
  - `cloud-web-app/web/app/api/ai/agents/route.ts`
  - `cloud-web-app/web/app/api/ai/agents/executions/route.ts`
  - `cloud-web-app/web/app/api/ai/agents/metrics/route.ts`
  - `cloud-web-app/web/app/api/ai/action/route.ts`
  - `cloud-web-app/web/app/api/ai/chat/route.ts`
  - `cloud-web-app/web/app/api/ai/chat-advanced/route.ts`
  - `cloud-web-app/web/app/api/ai/complete/route.ts`
  - `cloud-web-app/web/app/api/ai/context/search/route.ts`
  - `cloud-web-app/web/app/api/ai/inline-completion/route.ts`
  - `cloud-web-app/web/app/api/ai/inline-edit/route.ts`
  - `cloud-web-app/web/app/api/ai/stream/route.ts`
  - `cloud-web-app/web/app/api/ai/change/feedback/route.ts`
  - `cloud-web-app/web/app/api/ai/change/readiness/route.ts`
  - `cloud-web-app/web/app/api/ai/change/rollback/route.ts`
  - `cloud-web-app/web/app/api/ai/change/runs/route.ts`
  - `cloud-web-app/web/app/api/ai/director/[projectId]/route.ts`
- **Studio gate parcial**:
  - `cloud-web-app/web/app/api/studio/_lib/studio-gate.ts`
  - `cloud-web-app/web/app/api/studio/access/full/route.ts`
  - `cloud-web-app/web/app/api/studio/access/full/[id]/route.ts`



### No-simulation policy (estado atual)

- Há resposta explícita de simulação no modo sandbox (capabilityStatus `PARTIAL`).

- Ainda não existe bloqueio central que impeça outputs "simulados" de serem tratados como execução real.



### Fluxo de execução alvo (textual)

1) Task intake ? 2) Context load ? 3) Patch plan ? 4) Validation gate ? 5) Apply (workspace) ? 6) Verify (tests/QA) ? 7) Ledger + Task state update ? 8) Result entregue com evidência.



### Arquitetura alvo (proposta de implementação)

**Novos módulos necessários (propostos):**

- `cloud-web-app/web/lib/server/execution-engine.ts` (orquestra task ? patch ? validate ? apply ? verify).

- `cloud-web-app/web/lib/server/task-store.ts` (persistência de tasks: id, status, steps, logs, resultados).

- `cloud-web-app/web/lib/server/qa-gate.ts` (QA blocking engine + regras).

- `cloud-web-app/web/lib/server/patch-engine.ts` (geração de diff estruturado e aplicação segura).

- `cloud-web-app/web/lib/server/execution-context.ts` (contexto carregado, dependências, snapshot).



**Endpoints necessários (propostos):**

- `POST /api/studio/tasks/plan` ? gerar plano real.

- `POST /api/studio/tasks/[id]/run` ? execução real com estado persistido.

- `POST /api/studio/tasks/[id]/validate` ? validação QA obrigatória.

- `POST /api/studio/tasks/[id]/apply` ? aplicação real com rollback.



**Dependências de infraestrutura (propostas):**

- Persistência (DB) para tasks e logs de execução.

- Hook de CI para falha automática se QA falhar (scripts já criados).



## Benchmark Aethel Engine vs Líderes de Mercado 2026 (fornecido pelo usuário; pendente de validação)

**Aviso de escopo:** todo o conteúdo abaixo foi fornecido pelo solicitante e **não foi validado nesta execução**. Deve ser tratado como **baseline de planejamento** até nova checagem com evidência no repositório e/ou testes reais. Os números podem divergir das contagens locais desta execução.
**Reconciliação local (2026-04-03):** preflight indica preview/billing **ready** (env completo), mas runtime local continua sem validação final (APP_RUNTIME_UNREACHABLE).

**Data da auditoria:** 2026-04-01
**Versão:** v2.0.0
**Branch:** audit/ux-shell-ptbr-2026-04-01

### Resumo executivo
**Status atual do Aethel Engine (estimativas fornecidas)**
- Superfícies inventariadas: 434 arquivos (app/), 325 (components/), 386 (lib/)
- Sistema de tokens: `var(--aethel-*)` definido em `styles/globals.css` e `styles/design-tokens.css`
- Gaps P0: 120+ botões sem `type="button"`, 160+ linhas com cores hardcoded
- Microcopy PT-BR: drift de inglês em 200+ ocorrências (Preview, Refresh, Loading, etc.)
- Blockers operacionais: `node_modules` ausente, `STRIPE_WEBHOOK_SECRET` missing, Docker daemon

**Reconciliação local (2026-04-03)**
- `.env.local` e `.env` contêm chaves de preview/billing/AI (preflight confirma **preview/billing ready**).
- `node_modules` ausente na raiz, mas presente em `cloud-web-app/web/node_modules`.
- Produção local ainda **não** está pronta: `APP_RUNTIME_UNREACHABLE` em `http://localhost:3000` durante o probe.

**Comparação com líderes (percentuais fornecidos)**
- Preview/Runtime: 65%
- Chat/IA Agent: 70%
- IDE Shell/UX: 60%
- Acessibilidade WCAG 2.2 AA: 45%
- Billing/Marketplace: 68%

### Métricas detalhadas por categoria (percentuais fornecidos)
- Preview/Runtime: 65% vs Vercel (95%), Replit (88%)
- Chat/IA Agent: 70% vs Cursor (92%), Copilot (90%)
- IDE Shell/UX: 60% vs VS Code (98%), Cursor (94%)
- Acessibilidade: 45% vs VS Code (95%), Figma (88%)
- Marketplace: 68% vs Figma (90%), Adobe (85%)
- Billing/Pricing: 72% vs Stripe (98%), Vercel (92%)

---

## Comparação detalhada de recursos (fornecido pelo usuário; pendente de validação)

### 1) Preview/Runtime
**Comparação detalhada**
| Recurso | Vercel | Replit | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Preview Deployment automático | Por PR/Branch | Instant | Manual/E2B | P0 |
| Preview URL único por deploy | Sim | Sim | Parcial | P1 |
| Hot Module Replacement (HMR) | Sim | Sim | Não | P0 |
| Runtime Health Monitoring | Vercel Analytics | Built-in | `/api/preview/runtime-health` | P1 |
| Auto-discovery de runtime | Sim | Sim | `/api/preview/runtime-discover` | P1 |
| Sync file/workspace | Git-based | Real-time | `/runtime-sync`, `/runtime-sync-file` | P1 |
| Provisionamento de runtime | Automático | Instant | E2B API (requer token) | P0 |
| Feedback visual no preview | Comments | Annotations | Não implementado | P2 |

**Recomendações prioritárias (fornecidas)**
- [P0] Implementar HMR para preview em tempo real (sem websocket/SSE detectado no repositório).
- [P0] Automatizar preview deployment por branch/PR (PreviewPanel.tsx exige seleção manual de runtime).
- [P1] Melhorar feedback visual de sync/readiness (PreviewPanel.tsx indica "Preview desatualizado" sem timestamp/diff).
- [P1] Adicionar telemetria de latência/saúde do runtime (`/api/preview/runtime-health` retorna status simples).

### 2) Chat/IA Agent
**Comparação de capacidades de agente**
| Recurso | Cursor | GitHub Copilot | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Agent Mode (multi-step) | Agent mode (Plan/Ask) | Agent mode GA | Chat only | P0 |
| Background agents | Cloud handoff | Copilot cloud agent | Não | P0 |
| Context awareness (codebase) | @Codebase, @Docs | Workspace context | CodebaseContextPanel | P1 |
| Quick prompts/shortcuts | Agent skills (75+) | Custom agents | 8 prompts fixos | P1 |
| Voice input/TTS | Não | Não | useVoiceRecording (pt-BR) | Vantagem |
| Attachment support (images) | Sim | Vision models | selectedModel.supportsVision | P1 |
| Code review/regenerate | Self-review | Copilot code review | Regenerate button only | P1 |
| Apply code directly | Direct apply | Accept/reject | Copy only | P0 |
| Streaming response | Sim | Sim | streamingContent prop | P2 |
| Model selector | Claude/GPT/custom | GPT-5/Claude/custom | Dropdown com badges | P2 |

**GAP crítico identificado (fornecido)**
- Ausência de Agent Mode multi-step com persistência de estado.

**Evidência citada (não validada nesta execução)**
- `AIChatPanelPro.tsx`: chat request/response simples.
- Ausência de `agent-loop.ts`/`multi-step-executor.ts` em `lib/`.
- `/api/ai/chat` e `/api/ai/stream`: single-turn, sem state persistence.

**Recomendações (fornecidas)**
- [P0] Implementar Agent Mode multi-step com persistência de estado.
- [P0] Criar sistema de "Apply Code" com preview de diff.
- [P0] Adicionar background agents com cloud handoff.
- [P1] Expandir context awareness: @Docs externo, @Git history, @Database schema.
- [P1] Criar biblioteca de Agent Skills customizáveis.

### 3) IDE Shell/UX
**Workbench e navegação**
| Recurso | VS Code | Cursor | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Command Palette | Ctrl+Shift+P | Ctrl+Shift+P | `CommandPalette.tsx` | P2 |
| Keyboard Shortcuts | Totalmente customizável | VS Code keybindings | Hardcoded em `IDELayout` | P1 |
| Sidebar panels | Explorer/Search/Git/Extensions | + AI | explorer/search/git/ai/extensions | P2 |
| Bottom panel | Terminal/Output/Problems/Debug | Same | terminal/output/problems/debug/ports | P2 |
| Layout persistence | localStorage | Cloud sync | localStorage (`aethel.workbench.layout`) | P1 |
| Drag-and-drop panels | Sim | Sim | Não | P2 |
| Split editors | Horizontal/Vertical | Horizontal/Vertical | Não implementado | P1 |
| Breadcrumb navigation | Sim | Sim | Não | P2 |
| Minimap | Sim | Sim | Não | P2 |
| Go to Definition/References | LSP-based | LSP-based | LSP mock-only | P0 |

**Evidências citadas (não validadas nesta execução)**
- `IDELayout.tsx`: shortcuts hardcoded sem UI de customização.
- `FileExplorerPro.tsx`: ausência de drag-and-drop.
- `lib/lsp/lsp-client.ts`: mock sem integração real com language servers.
- Ausência de `SplitEditor.tsx`/`EditorGroup.tsx`.
- `PreviewPanel.tsx`: preview sempre sidebar, não dockável.

**Roadmap de paridade UX (fornecido)**
- [P0] Integrar LSP real (Go to Definition, Find References, Rename Symbol).
- [P1] Implementar split editors horizontal/vertical.
- [P1] Adicionar drag-and-drop de panels e files.
- [P2] Criar sistema de keybindings customizável.
- [P2] Adicionar minimap e breadcrumb navigation.

### 4) Acessibilidade WCAG 2.2 AA
**Critérios (fornecidos)**
| Critério WCAG 2.2 | VS Code | Figma | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| 2.4.7 Focus Visible (A) | Outline customizável | Focus rings | Inconsistent | P0 |
| 2.4.11 Focus Not Obscured (Min) (AA) | Sim | Sim | Não validado | P0 |
| 2.4.13 Focus Appearance (AAA) | 2px outline, 3:1 contrast | 1px default | Não implementado | P1 |
| 2.5.7 Dragging Movements (AA) | Pointer + keyboard | Pointer + keyboard | Sem drag alternatives | P1 |
| 2.5.8 Target Size (Min) (AA) | 24x24px min | 24x24px min | Alguns < 24px | P0 |
| 3.2.6 Consistent Help (A) | Help sempre visível | ? icon consistente | Help não consistente | P1 |
| 3.3.7 Redundant Entry (A) | Autocomplete | Form memory | Não implementado | P2 |
| 3.3.8 Accessible Authentication (Min) (AA) | Sem CAPTCHA | Sem CAPTCHA | Sem CAPTCHA | OK |
| 2.1.1 Keyboard (A) | 100% keyboard nav | Full keyboard | Parcial | P0 |
| 1.4.3 Contrast (Min) (AA) | 4.5:1 text, 3:1 UI | WCAG checker | Não validado | P0 |
| 4.1.3 Status Messages (AA) | aria-live | Screen reader | Alguns componentes | P1 |
| Screen Reader Support | NVDA/JAWS/VoiceOver | Completo | Não testado | P0 |

**Gaps críticos citados (não validados nesta execução)**
- Botões sem type (ex.: rg scan com 120+ matches).
- Hardcoded colors (ex.: bg-slate/text-zinc/...).
- Focus visible inconsistente (ex.: FileExplorerPro.tsx linha 35–48).
- Target size < 24px (ex.: PreviewRuntimeToolbar.tsx, AIChatPanelPro.tsx).
- Keyboard navigation incompleta (menus/contextos não navegáveis integralmente).
- Contraste não validado (ex.: `--aethel-text-quaternary` vs `--aethel-surface-tertiary`).

**Plano de conformidade (fornecido)**
- [P0] Corrigir botões sem `type="button"`.
- [P0] Validar contraste (alvo 4.5:1 texto, 3:1 UI).
- [P0] Focus visible consistente (`:focus-visible` com outline 2px / 3:1 contraste).
- [P0] Ajustar target size min 24x24px + espaçamento.
- [P1] Completar navegação por teclado (menus, modals, context menus).
- [P1] Adicionar `aria-live` para status messages.
- [P1] Testar com NVDA/JAWS/VoiceOver.
- [P2] Redundant entry prevention (autocomplete para formulários repetidos).

### 5) Marketplace/Extensions
**Ecossistema de extensões (fornecido)**
| Recurso | VS Code | Figma | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Número de extensões | 40.000+ | 2.000+ plugins | Mock API | P0 |
| Search/Filter | Full-text + tags | Category + search | Search + category | P2 |
| Install/Uninstall | 1-click | 1-click | POST `/api/marketplace/install` | P2 |
| Ratings/Reviews | Sim | Sim | rating/downloads display only | P1 |
| Auto-updates | Automático | Notificações | Não | P1 |
| Publishing API | `vsce` CLI | Figma Community | Não documentado | P0 |
| Extension Permissions | Granular | OAuth scopes | Não implementado | P0 |
| Developer Docs | Extenso | Plugin API docs | Não publicado | P0 |

**Roadmap (fornecido)**
- [P0] Documentar e publicar Extension API + SDK.
- [P0] Criar sistema de permissões granulares.
- [P1] Implementar reviews/ratings reais com moderação.
- [P1] Adicionar auto-update de extensões.
- [P2] Criar CLI de publishing (`aethel-ext publish`).

### 6) Billing/Pricing
**Sistema de cobrança e gerenciamento (fornecido)**
| Recurso | Stripe | Vercel | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Customer Portal | Hosted portal | Built-in | `/api/billing/portal` | P1 |
| Subscription management | Upgrade/downgrade | Self-service | SubscriptionStatusWidget | P1 |
| Invoice automation | Auto-generate + email | Automático | Não implementado | P1 |
| Usage-based billing | Metered billing | Por request | `/api/billing/usage` | P2 |
| Payment methods | Card/ACH/SEPA/etc. | Card + invoice | Stripe integration | P2 |
| Webhooks | 100+ event types | Custom webhooks | `/api/billing/webhook` (missing secret) | P0 |
| Proration | Automático | Sim | Não validado | P1 |
| Billing readiness UI | Dashboard | Settings page | PublicBillingReadiness.tsx | P2 |

**Blocker operacional (fornecido)**
- `STRIPE_WEBHOOK_SECRET` sem configuração real.
  - Reconciliação local (2026-04-03): preflight de billing passou com STRIPE_* e price IDs configurados; ainda falta validação de checkout/webhook em runtime.

**Ações para paridade (fornecidas)**
- [P0] Configurar `STRIPE_WEBHOOK_SECRET` via Stripe CLI/Dashboard.
- [P1] Implementar invoice auto-generation.
- [P1] Adicionar proration logic.
- [P2] Criar customer portal UI próprio.

### 7) Admin/Monitoring
**Observabilidade e administração (fornecido)**
| Recurso | Linear | Vercel | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Triage intelligence | AI auto-routing | N/A | Manual | P2 |
| Metrics dashboard | Velocity/cycle time | Observability Plus | AdminDashboardPro.tsx | P1 |
| Onboarding analytics | N/A | N/A | `/api/admin/onboarding/stats` | Vantagem |
| Real-time logs | N/A | Live logs | Não | P1 |
| Error tracking | Sentry integration | Vercel Analytics | Console.error only | P0 |
| Performance monitoring | N/A | Web Vitals | WebVitalsReporter.tsx | P2 |
| Security events | N/A | Audit logs | SecurityDashboard.tsx (mock) | P1 |
| User session replay | N/A | Integrations | Não | P2 |

**Roadmap (fornecido)**
- [P0] Integrar error tracking (Sentry/Rollbar).
- [P1] Implementar real-time logs (WebSocket/SSE).
- [P1] Ativar security audit logs.
- [P2] Adicionar session replay (FullStory/LogRocket).

### 8) Sistema de Tokens de Design
**Comparação de design systems (fornecido)**
| Aspecto | Figma Variables | Material Design 3 | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Token naming convention | Semantic + DTCG | Material tokens | --aethel-* custom | P2 |
| Theming (light/dark) | Variable modes | Dynamic color | [data-theme='light'] | P2 |
| Token documentation | Auto-generated | Material.io | Inline comments | P1 |
| Consistency enforcement | Figma plugin checks | Linter rules | Manual review | P0 |
| Hardcoded color detection | Automated | Lint warnings | Grep scan only | P0 |
| Cross-platform export | JSON/CSS/iOS/Android | Multi-platform | CSS only | P2 |

**Token drift (fornecido)**
- 160+ hardcoded colors detectados (ex.: VideoTimeline.tsx, TimeMachineSlider.tsx, DesignSystem.tsx, AdminDashboardPro.tsx).

**Plano de governança (fornecido)**
- [P0] Criar ESLint rule para bloquear hardcoded colors.
- [P0] Refatorar hardcoded colors para tokens.
- [P1] Documentar uso de tokens (Storybook/exemplos).
- [P1] Adicionar CI check para falhar build em cores hardcoded.
- [P2] Migrar para naming DTCG.

### 9) Microcopy e Localização PT-BR
**Consistência de idioma (fornecido)**
- Drift de inglês: 200+ termos misturados (Preview/Refresh/Loading/etc.).

**Plano de normalização (fornecido)**
- [P0] Centralizar strings em `lib/locales/pt-BR.ts`.
- [P0] Refatorar termos ingleses para referências centralizadas.
- [P1] Implementar i18n (next-i18next ou similar).
- [P1] CI check para strings hardcoded em inglês.
- [P2] Documentar glossário PT-BR.

---

## Matriz de Priorização (fornecido pelo usuário; pendente de validação)

### P0 - Blockers críticos
- HMR para preview runtime
- Agent mode multi-step
- Botões sem type
- Focus visible inconsistente
- Contraste não validado
- LSP real
- `STRIPE_WEBHOOK_SECRET`
- Extension publishing API
- Hardcoded colors
- Termos em inglês

### P1 - Alta prioridade
- Background agents
- Apply code com preview diff
- Split editors
- Keyboard navigation completa
- Target size < 24px
- Invoice auto-generation
- Extension permissions
- Real-time logs

### P2 - Backlog
- Drag-and-drop de panels/files
- Minimap/breadcrumbs
- Keybindings editor
- Feedback visual no preview
- Session replay
- Redundant entry prevention
- Multi-idioma com i18n
- DTCG migration

---

## Roadmap recomendado (fornecido pelo usuário; pendente de validação)

### Fase 1: Conformidade básica (4–6 semanas)
- Corrigir botões sem `type="button"`
- Configurar `STRIPE_WEBHOOK_SECRET`
- Implementar focus visible consistente
- Validar contraste de cores
- Refatorar hardcoded colors para tokens
- Criar arquivo centralizado de strings PT-BR
- Refatorar termos em inglês

### Fase 2: Paridade de recursos core (8–12 semanas)
- Implementar HMR para preview runtime
- Criar Agent Mode multi-step
- Integrar LSP real
- Implementar Apply Code com diff preview
- Adicionar split editors
- Completar keyboard navigation

### Fase 3: Ecossistema e observabilidade (6–8 semanas)
- Documentar Extension API + SDK
- Implementar permissões granulares
- Integrar error tracking
- Criar real-time logs via WebSocket/SSE
- Adicionar security audit logs

### Fase 4: Polimento e diferenciação (contínuo)
- Background agents com cloud handoff
- Expandir voz/TTS para workflows voice-first
- Session replay para debug UX
- Drag-and-drop avançado de panels
- Multi-idioma completo
- DTCG migration

---

## Score card final (fornecido pelo usuário; pendente de validação)

**Conclusão executiva (fornecida)**
Aethel Engine v2.0.0 demonstra fundação sólida com arquitetura bem pensada e sistema de tokens CSS robusto. Entretanto, enfrenta gaps significativos em acessibilidade WCAG 2.2 AA (45% vs 95% dos líderes), UX de IDE (60% vs 98% VS Code) e capacidades de IA agent (70% vs 92% Cursor).

**Vantagens competitivas (fornecidas)**
- Voice input PT-BR nativo.
- Onboarding analytics detalhado.
- Sistema de first-value tracking.

**Blockers críticos (fornecidos)**
- 120+ botões sem type.
- 160+ hardcoded colors.
- 200+ termos em inglês.
- Ausência de agent mode multi-step.
- LSP mock-only.
- `STRIPE_WEBHOOK_SECRET` missing.
## Validações

- Build/lint/testes **não executados nesta rodada** (sem claim de sucesso).
- Preflight local executado (2026-04-03):
  - Preview runtime: **ready** (env e2b completo).
  - Billing runtime: **ready** (Stripe keys + price IDs completos).
  - Production runtime: **partial** (APP_RUNTIME_UNREACHABLE em `http://localhost:3000`).
  - Nota: readiness valida env/closure; ainda requer validação de runtime em UI (checkout, webhook, preview toolbar).



## Traceability note

Todas as afirmações acima estão ligadas a arquivos reais do repositório e não inferem runtime externo.



---




## Comparação detalhada de recursos (fornecida pelo usuário; pendente de validação)



**Data da auditoria:** 2026-04-01

**Versão:** v2.0.0

**Branch:** audit/ux-shell-ptbr-2026-04-01



### 1) Preview/Runtime

| Recurso | Vercel | Replit | Aethel Engine | Gap |

| --- | --- | --- | --- | --- |

| Preview deployment automático | Por PR/Branch | Instant | Manual/E2B | P0 |

| Preview URL único por deploy | Sim | Sim | Parcial | P1 |

| Hot Module Replacement (HMR) | Sim | Sim | Não | P0 |

| Runtime health monitoring | Vercel Analytics | Built-in | /api/preview/runtime-health | P1 |

| Auto-discovery de runtime | Sim | Sim | /api/preview/runtime-discover | P1 |

| Sync file/workspace | Git-based | Real-time | /runtime-sync, /runtime-sync-file | P1 |

| Provisionamento de runtime | Automático | Instant | E2B API (requer token) | P0 |

| Feedback visual no preview | Comments | Annotations | Não implementado | P2 |



**Recomendações prioritárias**

- [P0] Implementar HMR para preview em tempo real.

- [P0] Automatizar preview deployment por branch/PR.

- [P1] Melhorar feedback visual de sync/readiness com timestamp/diff.

- [P1] Adicionar telemetria de latência/saúde do runtime.



### 2) Chat/IA Agent

| Recurso | Cursor | GitHub Copilot | Aethel Engine | Gap |

| --- | --- | --- | --- | --- |

| Agent Mode (multi-step) | Agent mode (Plan/Ask) | Agent mode GA | Chat only | P0 |

| Background agents | Cloud handoff | Copilot cloud agent | Não | P0 |

| Context awareness (codebase) | @Codebase, @Docs | Workspace context | CodebaseContextPanel | P1 |

| Quick prompts/shortcuts | Agent skills (75+) | Custom agents | 8 prompts fixos | P1 |

| Voice input/TTS | Não | Não | useVoiceRecording (pt-BR) | Vantagem |

| Attachment support (images) | Sim | Vision models | selectedModel.supportsVision | P1 |

| Code review/regenerate | Self-review | Copilot code review | Regenerate button only | P1 |

| Apply code directly | Direct apply | Accept/reject | Copy only | P0 |

| Streaming response | Sim | Sim | streamingContent prop | P2 |

| Model selector | Claude, GPT, custom | GPT-5, Claude, custom | Dropdown com badges | P2 |



**Gap crítico**

- Ausência de Agent Mode multi-step com persistência de estado.



**Recomendações para paridade**

- [P0] Implementar Agent Mode multi-step com persistência.

- [P0] Criar Apply Code com preview de diff.

- [P0] Adicionar background agents com cloud handoff.

- [P1] Expandir context awareness (@Docs, @Git history, @Database schema).

- [P1] Criar biblioteca de Agent Skills customizáveis.



### 3) IDE Shell/UX

| Recurso | VS Code | Cursor | Aethel Engine | Gap |

| --- | --- | --- | --- | --- |

| Command palette | Ctrl+Shift+P | Ctrl+Shift+P | CommandPalette.tsx | P2 |

| Keyboard shortcuts | Customizável | VS Code keybindings | Hardcoded em IDELayout | P1 |

| Sidebar panels | Explorer/Search/Git/Extensions | Same + AI | explorer/search/git/ai/extensions | P2 |

| Bottom panel | Terminal/Output/Problems/Debug | Same | terminal/output/problems/debug/ports | P2 |

| Layout persistence | localStorage | Cloud sync | localStorage (aethel.workbench.layout) | P1 |

| Drag-and-drop panels | Sim | Sim | Não | P2 |

| Split editors | Horizontal/Vertical | Horizontal/Vertical | Não | P1 |

| Breadcrumb navigation | Sim | Sim | Não | P2 |

| Minimap | Sim | Sim | Não | P2 |

| Go to definition/references | LSP-based | LSP-based | LSP mock-only | P0 |



**Roadmap de paridade UX**

- [P0] Integrar LSP real (Go to Definition, Find References, Rename Symbol).

- [P1] Implementar split editors horizontal/vertical.

- [P1] Adicionar drag-and-drop de panels e files.

- [P2] Criar keybindings customizável.

- [P2] Adicionar minimap e breadcrumbs.



### 4) Acessibilidade WCAG 2.2 AA

| Critério | VS Code | Figma | Aethel Engine | Gap |

| --- | --- | --- | --- | --- |

| 2.4.7 Focus Visible (A) | Outline customizável | Focus rings | Inconsistente | P0 |

| 2.4.11 Focus Not Obscured (Min) (AA) | Sim | Sim | Não validado | P0 |

| 2.4.13 Focus Appearance (AAA) | 2px/3:1 contraste | 1px default | Não implementado | P1 |

| 2.5.7 Dragging Movements (AA) | Pointer + teclado | Pointer + teclado | Sem alternativas | P1 |

| 2.5.8 Target Size (Min) (AA) | 24x24px | 24x24px | Alguns < 24px | P0 |

| 3.2.6 Consistent Help (A) | Ajuda constante | Ajuda consistente | Não consistente | P1 |

| 3.3.7 Redundant Entry (A) | Autocomplete | Form memory | Não implementado | P2 |

| 3.3.8 Accessible Auth (AA) | Sem CAPTCHA | Sem CAPTCHA | Sem CAPTCHA | OK |

| 2.1.1 Keyboard (A) | 100% | Completo | Parcial | P0 |

| 1.4.3 Contrast (AA) | 4.5:1 texto | WCAG checker | Não validado | P0 |

| 4.1.3 Status Messages (AA) | aria-live | SR | Parcial | P1 |

| Screen reader support | NVDA/JAWS/VoiceOver | Completo | Não testado | P0 |



**Plano de conformidade**

- [P0] Corrigir botões sem type explícito.

- [P0] Validar contraste 4.5:1 texto e 3:1 UI.

- [P0] Focus visible consistente (outline 2px + 3:1).

- [P0] Ajustar target size mínimo 24x24px.

- [P1] Completar navegação por teclado em menus/contextos.

- [P1] Adicionar aria-live para status messages.

- [P1] Testar com NVDA/JAWS/VoiceOver.

- [P2] Redundant entry prevention (autocomplete).



### 5) Marketplace/Extensions

| Recurso | VS Code | Figma | Aethel Engine | Gap |

| --- | --- | --- | --- | --- |

| Número de extensões | 40k+ | 2k+ | Mock API | P0 |

| Search/filter | Full-text + tags | Category + search | Search + category | P2 |

| Install/uninstall | 1-click | 1-click | POST /api/marketplace/install | P2 |

| Ratings/reviews | Sim | Sim | Display only | P1 |

| Auto-updates | Automático | Notificações | Não | P1 |

| Publishing API | vsce CLI | Figma Community | Não documentado | P0 |

| Extension permissions | Granular | OAuth scopes | Não implementado | P0 |

| Developer docs | Extenso | Plugin API docs | Não publicado | P0 |



**Roadmap**

- [P0] Documentar e publicar Extension API + SDK.

- [P0] Criar sistema de permissões granulares.

- [P1] Implementar reviews/ratings com moderação.

- [P1] Adicionar auto-update de extensões.

- [P2] Criar CLI de publishing (aethel-ext publish).



### 6) Billing/Pricing

| Recurso | Stripe | Vercel | Aethel Engine | Gap |

| --- | --- | --- | --- | --- |

| Customer portal | Hosted portal | Built-in | /api/billing/portal | P1 |

| Subscription management | Upgrade/downgrade | Self-service | SubscriptionStatusWidget | P1 |

| Invoice automation | Auto-generate | Automático | Não implementado | P1 |

| Usage-based billing | Metered billing | Por request | /api/billing/usage | P2 |

| Payment methods | Card/ACH/SEPA | Card + invoice | Stripe integration | P2 |

| Webhooks | 100+ events | Custom webhooks | /api/billing/webhook | P0 |

| Proration | Automático | Sim | Não validado | P1 |

| Billing readiness UI | Dashboard | Settings page | PublicBillingReadiness.tsx | P2 |



**Ações para paridade billing**

- [P0] Configurar STRIPE_WEBHOOK_SECRET.

- [P1] Implementar invoice auto-generation.

- [P1] Adicionar proration logic.

- [P2] Criar customer portal UI próprio.



### 7) Admin/Monitoring

| Recurso | Linear | Vercel | Aethel Engine | Gap |

| --- | --- | --- | --- | --- |

| Triage intelligence | AI auto-routing | N/A | Manual | P2 |

| Metrics dashboard | Cycle time | Observability Plus | AdminDashboardPro.tsx | P1 |

| Onboarding analytics | N/A | N/A | /api/admin/onboarding/stats | Vantagem |

| Real-time logs | N/A | Live logs | Não | P1 |

| Error tracking | Sentry integration | Vercel Analytics | Console.error only | P0 |

| Performance monitoring | N/A | Web Vitals | WebVitalsReporter.tsx | P2 |

| Security events | N/A | Audit logs | SecurityDashboard.tsx (mock) | P1 |

| User session replay | N/A | Integrations | Não | P2 |



**Observability roadmap**

- [P0] Integrar error tracking (Sentry/Rollbar).

- [P1] Implementar real-time logs (WebSocket/SSE).

- [P1] Ativar security audit logs.

- [P2] Adicionar session replay (FullStory/LogRocket).



### 8) Sistema de tokens de design

| Aspecto | Figma Variables | Material Design 3 | Aethel Engine | Gap |

| --- | --- | --- | --- | --- |

| Naming convention | Semantic + DTCG | Material tokens | --aethel-* custom | P2 |

| Theming (light/dark) | Variable modes | Dynamic color | data-theme='light' | P2 |

| Token documentation | Auto-generated | Material.io | Inline comments | P1 |

| Consistency enforcement | Plugin checks | Lint rules | Manual review | P0 |

| Hardcoded color detection | Automated | Lint warnings | Grep scan | P0 |

| Cross-platform export | JSON/CSS/iOS/Android | Multi-platform | CSS only | P2 |



**Plano de governança de tokens**

- [P0] Criar ESLint rule para bloquear hardcoded colors.

- [P0] Refatorar hardcoded colors para tokens.

- [P1] Documentar token usage (Storybook/exemplos).

- [P1] Adicionar CI check para cores hardcoded.

- [P2] Migrar para DTCG.



### 9) Microcopy e localização PT-BR

**Drift de inglês:** termos UI misturados (Preview/Refresh/Loading etc.).



**Plano de normalização**

- [P0] Centralizar strings em lib/locales/pt-BR.ts.

- [P0] Refatorar termos ingleses para referências centralizadas.

- [P1] Implementar i18n (next-i18next ou similar).

- [P1] CI check para strings hardcoded em inglês.

- [P2] Documentar glossário PT-BR.



### Score Card Final (fornecido pelo usuário; pendente de validação)

- Aethel Engine v2.0.0 tem base sólida e tokens robustos.

- Gaps críticos: botões sem type, hardcoded colors, termos em inglês, ausência de agent mode multi-step, LSP mock-only e STRIPE_WEBHOOK_SECRET missing.

- Vantagens competitivas: voz PT-BR nativa, onboarding analytics, first-value tracking.





---



## Próximos passos por blocos (fornecido pelo usuário; pendente de validação)



### 1) Preview/Runtime

**Gap principal:** preview ainda manual/E2B, sem HMR e sem deploy automático por branch/PR.



**Recomendações prioritárias**

- [P0] Implementar HMR para preview em tempo real (sem websocket/SSE detectado no repositório).

- [P0] Automatizar preview deployment por branch/PR (PreviewPanel.tsx exige seleção manual de runtime).

- [P1] Melhorar feedback visual de sync/readiness (PreviewPanel.tsx indica "Preview desatualizado" sem timestamp/diff).

- [P1] Adicionar telemetria de latência/saúde do runtime (`/api/preview/runtime-health` retorna status simples).



### 2) Chat/IA Agent

**Gap crítico:** ausência de Agent Mode multi-step com persistência de estado.



**Recomendações para paridade**

- [P0] Implementar Agent Mode multi-step com persistência de estado.

- [P0] Criar sistema de "Apply Code" com preview de diff.

- [P0] Adicionar background agents com cloud handoff.

- [P1] Expandir context awareness: @Docs externo, @Git history, @Database schema.

- [P1] Criar biblioteca de Agent Skills customizáveis.



### 3) IDE Shell/UX

**Gaps relevantes:** LSP real, split editors e drag-and-drop de painéis/arquivos.



**Roadmap de paridade UX**

- [P0] Integrar LSP real (Go to Definition, Find References, Rename Symbol).

- [P1] Implementar split editors horizontal/vertical.

- [P1] Adicionar drag-and-drop de panels e files.

- [P2] Criar sistema de keybindings customizável.

- [P2] Adicionar minimap e breadcrumb navigation.



### 4) Acessibilidade WCAG 2.2 AA

**Gaps críticos (fornecidos):** focus visible inconsistente, target size < 24px, keyboard nav parcial.



**Plano de conformidade**

- [P0] Corrigir botões sem `type="button"`.

- [P0] Validar contraste (alvo 4.5:1 texto, 3:1 UI).

- [P0] Focus visible consistente (`:focus-visible` com outline 2px / 3:1 contraste).

- [P0] Ajustar target size min 24x24px + espaçamento.

- [P1] Completar navegação por teclado (menus, modals, context menus).

- [P1] Adicionar `aria-live` para status messages.

- [P1] Testar com NVDA/JAWS/VoiceOver.

- [P2] Redundant entry prevention (autocomplete para formulários repetidos).



### 5) Marketplace/Extensions

**Gaps críticos:** publishing API, permissões, docs e auto-update.



**Roadmap**

- [P0] Documentar e publicar Extension API + SDK.

- [P0] Criar sistema de permissões granulares.

- [P1] Implementar reviews/ratings reais com moderação.

- [P1] Adicionar auto-update de extensões.

- [P2] Criar CLI de publishing (`aethel-ext publish`).



### 6) Billing/Pricing

**Blocker:** `STRIPE_WEBHOOK_SECRET` sem configuração real.



**Ações**

- [P0] Configurar `STRIPE_WEBHOOK_SECRET` via Stripe CLI/Dashboard.

- [P1] Implementar invoice auto-generation.

- [P1] Adicionar proration logic.

- [P2] Criar customer portal UI próprio.



### 7) Admin/Monitoring

**Gaps:** error tracking real-time e logs.



**Roadmap**

- [P0] Integrar error tracking (Sentry/Rollbar).

- [P1] Implementar real-time logs (WebSocket/SSE).

- [P1] Ativar security audit logs.

- [P2] Adicionar session replay (FullStory/LogRocket).



### 8) Sistema de Tokens de Design

**Gaps:** enforcement automático + hardcoded colors.



**Plano de governança**

- [P0] Criar ESLint rule para bloquear `bg-slate-*`, `text-zinc-*`, etc.

- [P0] Refatorar hardcoded colors para tokens.

- [P1] Documentar uso de tokens (Storybook/exemplos).

- [P1] Adicionar CI check para falhar build em cores hardcoded.

- [P2] Migrar para naming DTCG.



### 9) Microcopy e Localização PT-BR

**Problema:** drift de inglês com termos UI misturados.



**Plano de normalização**

- [P0] Centralizar strings em `lib/locales/pt-BR.ts`.

- [P0] Refatorar termos ingleses para referências centralizadas.

- [P1] Implementar i18n (next-i18next ou similar).

- [P1] CI check para strings hardcoded em inglês.

- [P2] Documentar glossário PT-BR.



---



## Matriz de Priorização (fornecido pelo usuário; pendente de validação)



### P0 - Blockers Críticos

- HMR para preview runtime

- Agent mode multi-step

- Botões sem type

- Focus visible inconsistente

- Contraste não validado

- LSP real

- `STRIPE_WEBHOOK_SECRET`

- Extension publishing API

- Hardcoded colors

- Termos em inglês



### P1 - Alta prioridade

- Background agents

- Apply code com preview diff

- Split editors

- Keyboard navigation completa

- Target size < 24px

- Invoice auto-generation

- Extension permissions

- Real-time logs



### P2 - Backlog

- Drag-and-drop de panels/files

- Minimap/breadcrumbs

- Keybindings editor

- Feedback visual no preview

- Session replay

- Redundant entry prevention

- Multi-idioma com i18n

- DTCG migration



---



## Roadmap recomendado (fornecido pelo usuário; pendente de validação)



### Fase 1: Conformidade básica (4–6 semanas)

- Corrigir botões sem `type="button"`

- Configurar `STRIPE_WEBHOOK_SECRET`

- Implementar focus visible consistente

- Validar contraste de cores

- Refatorar hardcoded colors para tokens

- Criar arquivo centralizado de strings PT-BR

- Refatorar termos em inglês



### Fase 2: Paridade de recursos core (8–12 semanas)

- Implementar HMR para preview runtime

- Criar Agent Mode multi-step

- Integrar LSP real

- Implementar Apply Code com diff preview

- Adicionar split editors

- Completar keyboard navigation



### Fase 3: Ecossistema e observabilidade (6–8 semanas)

- Documentar Extension API + SDK

- Implementar permissões granulares

- Integrar error tracking

- Criar real-time logs via WebSocket/SSE

- Adicionar security audit logs



### Fase 4: Polimento e diferenciação (contínuo)

- Background agents com cloud handoff

- Expandir voz/TTS para workflows voice-first

- Session replay para debug UX

- Drag-and-drop avançado de panels

- Multi-idioma completo
