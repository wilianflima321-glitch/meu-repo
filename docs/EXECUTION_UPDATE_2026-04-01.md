# EXECUTION UPDATE — 2026-04-01

Status: EXECUTADO LOCALMENTE (evidência limitada ao repositório)
Atualização: 2026-04-04

## Escopo executado

- Refino PT-BR e tokens Aethel em superfícies críticas do shell (preview, chat, onboarding, billing, marketplace e admin).
- Sweep automatizado para remover utilitários de cor hardcoded em app/components/lib.
- Acessibilidade aplicada onde tocado (aria-label, type="button", foco visível).
- Normalização PT-BR em layout global, terminal e gerenciador de workspace.
- Ajustes em FullscreenIDE, PreviewRuntimeToolbar, ExtensionManager, GitPanelPro, VideoTimeline, DialogueEditor e ControlRigEditor com microcopy operacional em PT-BR.
- Reforço global de foco visível aplicado em `cloud-web-app/web/app/globals.css`.
- Governança QA adicionada:
  1. `tools/check-button-types.mjs` (botões sem type)
  2. `tools/check-hardcoded-colors.mjs` (cores hardcoded Tailwind)
  3. `package.json` com `qa:button-types` e `qa:hardcoded-colors`
- Codemod aplicado: adiciona `type="button"` em `<button>` com `onClick` sem type (varredura em app/components/lib).
- Execução real e persistente:
  1. `cloud-web-app/web/lib/server/task-store.ts`
  2. `cloud-web-app/web/lib/server/qa-gate.ts`
  3. `cloud-web-app/web/lib/server/patch-engine.ts`
  4. `cloud-web-app/web/lib/server/execution-context.ts`
  5. `cloud-web-app/web/lib/server/simulation-guard.ts`
  6. `cloud-web-app/web/lib/server/agent-store.ts`
  7. `cloud-web-app/web/app/api/studio/tasks/plan/route.ts`
  8. `cloud-web-app/web/app/api/studio/tasks/[id]/route.ts`
  9. `cloud-web-app/web/app/api/studio/tasks/[id]/run/route.ts`
  10. `cloud-web-app/web/app/api/studio/tasks/[id]/validate/route.ts`
  11. `cloud-web-app/web/app/api/studio/tasks/[id]/apply/route.ts`
- QA gate em CI: `.github/workflows/ci.yml` (qa:button-types + qa:hardcoded-colors)
- Thinking stream bloqueado quando `AETHEL_DISABLE_SIMULATION` está ativo: `cloud-web-app/web/app/api/ai/thinking/[sessionId]/route.ts`
- Guardas de simulação AI aplicados em rotas de chat/agents/stream/director.

## Superfícies atualizadas (arquivo -> ajuste)

- Layout: `cloud-web-app/web/app/layout.tsx`
- Terminal: `cloud-web-app/web/components/terminal/TerminalWidget.tsx`
- Workspace: `cloud-web-app/web/components/workspace/WorkspaceSwitcher.tsx`
- Preview: `cloud-web-app/web/components/ide/PreviewPanel.tsx`
- Preview runtime: `cloud-web-app/web/components/ide/PreviewRuntimeToolbar.tsx`
- Fullscreen IDE: `cloud-web-app/web/components/ide/FullscreenIDE.tsx`
- Shell/Explorer: `cloud-web-app/web/components/ide/IDELayout.tsx`, `cloud-web-app/web/components/ide/FileExplorerPro.tsx`
- Chat/IA: `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`
- Onboarding: `cloud-web-app/web/components/Onboarding.tsx`, `cloud-web-app/web/components/onboarding/QuickStartWizard.tsx`
- Extensões: `cloud-web-app/web/components/extensions/ExtensionManager.tsx`
- Terminal/Extensões/Outline: `cloud-web-app/web/components/terminal/XTerminal.tsx`, `cloud-web-app/web/components/terminal/IntegratedTerminal.tsx`, `cloud-web-app/web/components/extensions/ExtensionManagerPanel.tsx`, `cloud-web-app/web/components/outline/OutlinePanel.tsx`, `cloud-web-app/web/components/ide/CommandPalette.tsx`
- Onboarding guiado: `cloud-web-app/web/components/onboarding/InteractiveTour.tsx`
- Billing status: `cloud-web-app/web/components/billing/WalletStatusWidget.tsx`
- Settings: `cloud-web-app/web/components/settings/SettingsUI.tsx`
- Admin/Security: `cloud-web-app/web/components/dashboard/SecurityDashboard.tsx`
- Auth/Entrada: `cloud-web-app/web/components/auth/AuthExperiencePanel.tsx`
- Dashboard AI: `cloud-web-app/web/components/dashboard/DashboardAIChatTab.tsx`
- Debug/Keybindings/Feature flags: `cloud-web-app/web/components/debug/AdvancedDebug.tsx`, `cloud-web-app/web/components/keybindings/KeybindingsEditor.tsx`, `cloud-web-app/web/components/FeatureFlag.tsx`
- Acessibilidade adicional (type="button") aplicada em `cloud-web-app/web/components/search/GlobalSearch.tsx`, `cloud-web-app/web/components/ide/AIAgentsPanelPro.tsx`, `cloud-web-app/web/components/ide/DebugPanel.tsx`, `cloud-web-app/web/components/video/VideoTimelineEditor.tsx`, `cloud-web-app/web/components/physics/FluidSimulationEditor.tsx`, `cloud-web-app/web/components/narrative/QuestEditor.tsx`, `cloud-web-app/web/components/editors/SpriteEditor.tsx` e `cloud-web-app/web/app/profile/page.tsx`.

## Validações e preflight

- Build/lint/testes não executados nesta rodada (sem claim de sucesso).
- Preflight local executado (2026-04-03):
  1. Preview runtime: ready (env e2b completo).
  2. Billing runtime: ready (Stripe keys + price IDs completos).
  3. Production runtime: partial (APP_RUNTIME_UNREACHABLE em `http://localhost:3000`).

## Varredura local de dívida (app/components/lib)

- Botões sem type="button": 0 ocorrências (scan com glob via `cloud-web-app/web/node_modules`).
- Utilitários de cor hardcoded (bg/text/border/from/to): 0 ocorrências (após sweep local).
- Hotspots de microcopy em inglês: 1463 ocorrências.
- Uso de tokens `var(--aethel-*)`: 15323 ocorrências (última contagem registrada).

Observação: `tools/check-button-types.mjs` não rodou aqui por falta de `glob` em `node_modules` raiz. As contagens acima foram obtidas por scan local do workspace.

Amostra de arquivos com botões sem type (não exaustivo):
- Nenhuma ocorrência após o sweep atual.

Amostra de arquivos com cores hardcoded (não exaustivo):
- Nenhuma ocorrência após o sweep atual.

## Benchmark Aethel Engine vs Líderes de Mercado 2026 (fornecido pelo usuário; pendente de validação)

Aviso de escopo: todo o conteúdo desta seção foi fornecido pelo solicitante e não foi validado nesta execução. Deve ser tratado como baseline de planejamento até nova checagem com evidência no repositório e testes reais.

Data da auditoria: 2026-04-01
Versão: v2.0.0
Branch: audit/ux-shell-ptbr-2026-04-01

### Resumo executivo (fornecido)

Status atual do Aethel Engine
- Superfícies inventariadas: 434 arquivos (app/), 325 (components/), 386 (lib/)
- Sistema de tokens: `var(--aethel-*)` definido em `styles/globals.css` e `styles/design-tokens.css`
- Gaps P0: 0 botões sem `type="button"`, 0 linhas com cores hardcoded (ajustado pós-sweep local)
- Microcopy PT-BR: drift de inglês em 200+ ocorrências (Preview, Refresh, Loading, etc.)
- Blockers operacionais: `node_modules` raiz ausente (há `node_modules` em `cloud-web-app/web`), `STRIPE_WEBHOOK_SECRET` presente em `.env.local` mas sem validação de webhook real, Docker daemon não verificado

Comparação com líderes (percentuais fornecidos)
- Preview/Runtime: 65%
- Chat/IA Agent: 70%
- IDE Shell/UX: 60%
- Acessibilidade WCAG 2.2 AA: 45%
- Billing/Marketplace: 68%

Métricas detalhadas por categoria (percentuais fornecidos)
- Preview/Runtime: 65% vs Vercel (95%), Replit (88%)
- Chat/IA Agent: 70% vs Cursor (92%), Copilot (90%)
- IDE Shell/UX: 60% vs VS Code (98%), Cursor (94%)
- Acessibilidade: 45% vs VS Code (95%), Figma (88%)
- Marketplace: 68% vs Figma (90%), Adobe (85%)
- Billing/Pricing: 72% vs Stripe (98%), Vercel (92%)

### Comparação de recursos (fornecido)

1) Preview/Runtime

| Recurso | Vercel | Replit | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Preview Deployment Automático | Por PR/Branch | Instant | Manual/E2B | P0 |
| Preview URL Único por Deploy | Sim | Sim | Parcial | P1 |
| Hot Module Replacement (HMR) | Sim | Sim | Não | P0 |
| Runtime Health Monitoring | Vercel Analytics | Built-in | /api/preview/runtime-health | P1 |
| Auto-discovery de Runtime | Sim | Sim | /api/preview/runtime-discover | P1 |
| Sync File/Workspace | Git-based | Real-time | /runtime-sync, /runtime-sync-file | P1 |
| Provisionamento de Runtime | Automático | Instant | E2B API (requer token) | P0 |
| Feedback Visual no Preview | Comments | Annotations | Não implementado | P2 |

Recomendações prioritárias
- [P0] Implementar HMR para preview em tempo real.
- [P0] Automatizar preview deployment por branch/PR.
- [P1] Melhorar feedback visual de sync/readiness.
- [P1] Adicionar telemetria de latência/saúde do runtime.

2) Chat/IA Agent

| Recurso | Cursor | GitHub Copilot | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Agent Mode (Multi-step) | Agent mode (Plan/Ask) | Agent mode GA | Chat only | P0 |
| Background Agents | Cloud handoff | Copilot cloud agent | Não | P0 |
| Context Awareness (Codebase) | @Codebase, @Docs | Workspace context | CodebaseContextPanel | P1 |
| Quick Prompts/Shortcuts | Agent skills (75+) | Custom agents | 8 prompts fixos | P1 |
| Voice Input/TTS | Não | Não | useVoiceRecording (pt-BR) | Vantagem |
| Attachment Support (Images) | Sim | Vision models | selectedModel.supportsVision | P1 |
| Code Review/Regenerate | Self-review | Copilot code review | Regenerate button only | P1 |
| Apply Code Directly | Direct apply | Accept/reject | Copy only | P0 |
| Streaming Response | Sim | Sim | streamingContent prop | P2 |
| Model Selector | Claude, GPT, custom | GPT-5, Claude, custom | Dropdown com badges | P2 |

Recomendações para paridade
- [P0] Implementar Agent Mode multi-step com persistência.
- [P0] Criar Apply Code com preview de diff.
- [P0] Adicionar background agents com cloud handoff.
- [P1] Expandir context awareness (@Docs, @Git history, @Database schema).
- [P1] Criar biblioteca de Agent Skills customizáveis.

3) IDE Shell/UX

| Recurso | VS Code | Cursor | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Command Palette | Ctrl+Shift+P | Ctrl+Shift+P | CommandPalette.tsx | P2 |
| Keyboard Shortcuts | Totalmente customizável | VS Code keybindings | Hardcoded em IDELayout | P1 |
| Sidebar Panels | Explorer/Search/Git/Extensions | Same + AI | explorer/search/git/ai/extensions | P2 |
| Bottom Panel | Terminal/Output/Problems/Debug | Same | terminal/output/problems/debug/ports | P2 |
| Layout Persistence | localStorage | Cloud sync | localStorage (aethel.workbench.layout) | P1 |
| Drag-and-Drop Panels | Sim | Sim | Não | P2 |
| Split Editors | Horizontal/Vertical | Horizontal/Vertical | Não implementado | P1 |
| Breadcrumb Navigation | Sim | Sim | Não | P2 |
| Minimap | Sim | Sim | Não | P2 |
| Go to Definition/References | LSP-based | LSP-based | LSP mock-only | P0 |

Roadmap de paridade UX
- [P0] Integrar LSP real (Go to Definition, Find References, Rename Symbol).
- [P1] Implementar split editors horizontal/vertical.
- [P1] Adicionar drag-and-drop de panels e files.
- [P2] Criar sistema de keybindings customizável.
- [P2] Adicionar minimap e breadcrumb navigation.

4) Acessibilidade WCAG 2.2 AA

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
| Screen Reader Support | NVDA, JAWS, VoiceOver | Completo | Não testado | P0 |

Plano de conformidade WCAG 2.2 AA
- [P0] Corrigir botões sem type explícito.
- [P0] Validar contraste 4.5:1 texto e 3:1 UI.
- [P0] Focus visible consistente (outline 2px + 3:1).
- [P0] Ajustar target size mínimo 24x24px.
- [P1] Completar keyboard navigation (menus, modals, context menus).
- [P1] Adicionar aria-live para status messages.
- [P1] Testar com NVDA/JAWS/VoiceOver.
- [P2] Redundant entry prevention (autocomplete).

5) Marketplace/Extensions

| Recurso | VS Code | Figma | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Número de Extensões | 40,000+ | 2,000+ plugins | Mock API | P0 |
| Search/Filter | Full-text + tags | Category + search | Search + category | P2 |
| Install/Uninstall | 1-click | 1-click | POST /api/marketplace/install | P2 |
| Ratings/Reviews | Sim | Sim | rating/downloads display only | P1 |
| Auto-updates | Automático | Notificações | Não | P1 |
| Publishing API | vsce CLI | Figma Community | Não documentado | P0 |
| Extension Permissions | Granular | OAuth scopes | Não implementado | P0 |
| Developer Docs | Extenso | Plugin API docs | Não publicado | P0 |

Roadmap de Marketplace
- [P0] Documentar e publicar Extension API + SDK.
- [P0] Criar sistema de permissões granulares.
- [P1] Implementar reviews/ratings reais com moderação.
- [P1] Adicionar auto-update de extensões instaladas.
- [P2] Criar CLI de publishing (`aethel-ext publish`).

6) Billing/Pricing

| Recurso | Stripe | Vercel | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Customer Portal | Hosted portal | Built-in | /api/billing/portal | P1 |
| Subscription Management | Upgrade/downgrade | Self-service | SubscriptionStatusWidget | P1 |
| Invoice Automation | Auto-generate + email | Automático | Não implementado | P1 |
| Usage-based Billing | Metered billing | Por request | /api/billing/usage | P2 |
| Payment Methods | Card, ACH, SEPA | Card + invoice | Stripe integration | P2 |
| Webhooks | 100+ event types | Custom webhooks | /api/billing/webhook | P0 |
| Proration | Automático | Sim | Não validado | P1 |
| Billing Readiness UI | Dashboard | Settings page | PublicBillingReadiness.tsx | P2 |

 Ações para paridade billing
- [P0] Validar STRIPE_WEBHOOK_SECRET com webhook real (Stripe CLI/Dashboard).
- [P1] Implementar invoice auto-generation.
- [P1] Adicionar proration logic.
- [P2] Criar customer portal UI próprio.

7) Admin/Monitoring

| Recurso | Linear | Vercel | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Triage Intelligence | AI auto-routing | N/A | Manual | P2 |
| Metrics Dashboard | Velocity, cycle time | Observability Plus | AdminDashboardPro.tsx | P1 |
| Onboarding Analytics | N/A | N/A | /api/admin/onboarding/stats | Vantagem |
| Real-time Logs | N/A | Live logs | Não | P1 |
| Error Tracking | Sentry integration | Vercel Analytics | Console.error only | P0 |
| Performance Monitoring | N/A | Web Vitals | WebVitalsReporter.tsx | P2 |
| Security Events | N/A | Audit logs | SecurityDashboard.tsx (mock) | P1 |
| User Session Replay | N/A | Via integrations | Não | P2 |

Observability roadmap
- [P0] Integrar error tracking (Sentry ou Rollbar).
- [P1] Implementar real-time logs (WebSocket stream de logs do backend).
- [P1] Ativar security audit logs.
- [P2] Adicionar session replay (FullStory ou LogRocket).

8) Sistema de Tokens de Design

| Aspecto | Figma Variables | Material Design 3 | Aethel Engine | Gap |
| --- | --- | --- | --- | --- |
| Token Naming Convention | Semantic + DTCG | Material tokens | --aethel-* custom | P2 |
| Theming (Light/Dark) | Variable modes | Dynamic color | data-theme='light' | P2 |
| Token Documentation | Auto-generated | Material.io | Inline comments | P1 |
| Consistency Enforcement | Figma plugin checks | Linter rules | Manual review | P0 |
| Hardcoded Color Detection | Automated | Lint warnings | Grep scan only | P0 |
| Cross-platform Export | JSON, CSS, iOS, Android | Multi-platform | CSS only | P2 |

 Plano de governança de tokens
 - [P0] Criar ESLint rule customizada para bloquear cores hardcoded.
 - [P0] Refatoração concluída nesta wave; manter zero via prevenção e revisão.
 - [P1] Documentar token usage (Storybook ou exemplos).
 - [P1] Adicionar CI check para falhar build se cores hardcoded são detectadas.
 - [P2] Migrar para DTCG.

9) Microcopy e Localização PT-BR

Plano de normalização
- [P0] Centralizar strings em `lib/locales/pt-BR.ts`.
- [P0] Refatorar termos em inglês para referências centralizadas.
- [P1] Implementar i18n (next-i18next ou similar).
- [P1] Criar CI check para strings hardcoded em inglês.
- [P2] Documentar glossário PT-BR.

### Resumo de gaps por prioridade (fornecido)

P0 - Blockers críticos
- HMR para preview runtime
- Agent mode multi-step
- Botões sem type (resolvido nesta wave)
- Focus visible inconsistente
- Contraste não validado
- LSP real
- STRIPE_WEBHOOK_SECRET (validar assinatura real)
- Extension publishing API
- Hardcoded colors (resolvido nesta wave)
- Termos em inglês

P1 - Alta prioridade
- Background agents
- Apply code com preview diff
- Split editors
- Keyboard navigation completa
- Target size < 24px
- Invoice auto-generation
- Extension permissions
- Real-time logs

P2 - Backlog
- Drag-and-drop de panels/files
- Minimap e breadcrumb navigation
- Keybindings editor
- Feedback visual no preview
- Session replay
- Redundant entry prevention
- Multi-idioma com i18n
- DTCG migration

## Próximos passos por blocos (alinhados ao benchmark fornecido)

1) Preview/Runtime
- Implementar HMR para preview em tempo real.
- Automatizar preview deployment por branch/PR.
- Melhorar feedback visual de sync/readiness.
- Adicionar telemetria de latência/saúde do runtime.

2) Chat/IA Agent
- Implementar Agent Mode multi-step com persistência de estado.
- Criar Apply Code com preview de diff.
- Adicionar background agents com cloud handoff.
- Expandir context awareness (@Docs, @Git history, @Database schema).
- Criar biblioteca de Agent Skills customizáveis.

3) IDE Shell/UX
- Integrar LSP real (Go to Definition, Find References, Rename Symbol).
- Implementar split editors horizontal/vertical.
- Adicionar drag-and-drop de panels e files.
- Criar sistema de keybindings customizável.
- Adicionar minimap e breadcrumb navigation.

4) Acessibilidade WCAG 2.2 AA
- Corrigir botões sem `type="button"`.
- Validar contraste (4.5:1 texto, 3:1 UI).
- Focus visible consistente (outline 2px + 3:1).
- Ajustar target size mínimo 24x24px.
- Completar navegação por teclado (menus, modals, context menus).
- Adicionar aria-live para status messages.
- Testar com NVDA/JAWS/VoiceOver.
- Redundant entry prevention (autocomplete).

5) Marketplace/Extensions
- Documentar e publicar Extension API + SDK.
- Criar sistema de permissões granulares.
- Implementar reviews/ratings com moderação.
- Adicionar auto-update de extensões.
- Criar CLI de publishing (`aethel-ext publish`).

6) Billing/Pricing
- Validar STRIPE_WEBHOOK_SECRET via Stripe CLI/Dashboard (assinatura real).
- Implementar invoice auto-generation.
- Adicionar proration logic.
- Criar customer portal UI próprio.

7) Admin/Monitoring
- Integrar error tracking (Sentry ou Rollbar).
- Implementar real-time logs (WebSocket/SSE).
- Ativar security audit logs.
- Adicionar session replay (FullStory ou LogRocket).

 8) Tokens de Design
 - Criar ESLint rule customizada para bloquear cores hardcoded.
 - Refatoração concluída nesta wave; manter zero via prevenção e revisão.
 - Documentar token usage.
 - Adicionar CI check para cores hardcoded.
 - Migrar para DTCG.

9) Microcopy PT-BR
- Centralizar strings em `lib/locales/pt-BR.ts`.
- Refatorar termos em inglês para referências centralizadas.
- Implementar i18n.
- CI check para strings hardcoded em inglês.
- Documentar glossário PT-BR.

## Traceability note

Todas as afirmações acima estão ligadas a arquivos reais do repositório ou foram explicitamente marcadas como fornecidas pelo usuário e pendentes de validação.
