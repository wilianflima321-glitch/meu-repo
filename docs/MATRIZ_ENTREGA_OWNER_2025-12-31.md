# Matriz de Entrega (owner) — 2025-12-31

Escopo: validar o que é **entregável de verdade** hoje no repo (Web + IDE desktop/browser + plugin Unreal), e separar **real** vs **parcial** vs **demo/papel**.

Legenda:
- **REAL**: existe código + caminho de execução/teste + guardrails mínimos.
- **PARCIAL**: existe, mas falta peça crítica (build/empacotar/config) ou o UX é incompleto.
- **DEMO/PAPEL**: comportamento de amostra/placeholder ou doc sem implementação verificável.

## Web (cloud)

| Área | O que o usuário “recebe” | Status | Evidência | Dependências / observações |
|---|---|---|---|---|
| AI Chat | Endpoint com auth/entitlements + controle de uso | **REAL** | [cloud-web-app/web/app/api/ai/chat/route.ts](cloud-web-app/web/app/api/ai/chat/route.ts) | Depende de `NEXT_PUBLIC_API_URL`; quando não configurado retorna erro honesto (não “finge”). |
| Copilot Actions | Execução de ações allowlist sobre arquivos do projeto | **REAL** | [cloud-web-app/web/app/api/copilot/action/route.ts](cloud-web-app/web/app/api/copilot/action/route.ts) | Valida ownership via Prisma/Projeto; não é “shell livre”. |
| Copilot Context | Persistência/merge de contexto por workflow/thread | **REAL** | [cloud-web-app/web/app/api/copilot/context/route.ts](cloud-web-app/web/app/api/copilot/context/route.ts) | Rota marcada como dinâmica; depende do modelo de dados (Prisma). |
| Live Preview 3D | Preview/controle com primitives e loops de input | **DEMO/PAPEL** | [cloud-web-app/web/components/LivePreview.tsx](cloud-web-app/web/components/LivePreview.tsx) | Parece UI de amostra (primitives, polling/logs) vs preview real do projeto. |

## IDE (Theia fork / browser / “desktop”)

| Área | O que o usuário “recebe” | Status | Evidência | Dependências / observações |
|---|---|---|---|---|
| Execução local (dev/test) | Mock backend + testes TS + Playwright E2E | **REAL** | [cloud-ide-desktop/aethel_theia_fork/package.json](cloud-ide-desktop/aethel_theia_fork/package.json) | Scripts existem: `dev:mock-backend`, `test:e2e`, `check:ai-ide-ts`. |
| Offline (fonts/CSP) | Diretrizes de offline/CSP | **PARCIAL** | [cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/OFFLINE.md](cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/OFFLINE.md) | O doc diz que **font files estão pendentes** (fallback ok). CSP “needs verification”. |
| Electron / instalável | “IDE baixável tipo VSCode” | **DEMO/PAPEL** (por evidência atual) | [cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/OFFLINE.md](cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/OFFLINE.md) | O doc cita `npm run build:electron/start:electron`, mas o root [cloud-ide-desktop/aethel_theia_fork/package.json](cloud-ide-desktop/aethel_theia_fork/package.json) não expõe esses scripts. Pode existir em outro lugar, mas não foi evidenciado aqui. |

## Unreal (plugin)

| Área | O que o usuário “recebe” | Status | Evidência | Dependências / observações |
|---|---|---|---|---|
| UI ImGui/ImPlot no Editor | Plugin UEImgui com demos e editor menu | **REAL** | [cloud-ide-desktop/plugins/UE_IDE/UEImgui.uplugin](cloud-ide-desktop/plugins/UE_IDE/UEImgui.uplugin) | Código/editor module existe (UEImguiEditor, ImPlot etc). |
| “Integra Aethel IA com Unreal” | Módulo AethelPlugin chamando backend | **DEMO/PAPEL** (do jeito que está) | [cloud-ide-desktop/plugins/UE_IDE/aethel_unreal_plugin.uplugin](cloud-ide-desktop/plugins/UE_IDE/aethel_unreal_plugin.uplugin) | Manifest parece **não-JSON** (aspas simples). Módulo aponta `AethelPlugin`, mas em [cloud-ide-desktop/plugins/UE_IDE/Source/AethelPlugin](cloud-ide-desktop/plugins/UE_IDE/Source/AethelPlugin) não há `.Build.cs` e o C++ usa includes/strings com aspas simples (provável não compilar). |

## Corte de MVP sugerido (se fosse “ship” hoje)

- **Ship**: Web (AI chat + copilot allowlist/context) + IDE (browser/dev + mock backend + testes) + UEImgui como plugin utilitário.
- **Não prometer ainda**: “IDE baixável tipo VSCode/Electron” e “Aethel IA dentro do Unreal” como features prontas; hoje estão com lacunas de build/manifest/compilação.

## Próximos passos de dono (objetivos e verificáveis)

1. Definir oficialmente: “Desktop” = **Electron instalável** ou **browser IDE**.
2. Se Electron for requisito: adicionar scripts/build pipeline e artefatos (ex.: `.exe/.msi`) + checklist de offline.
3. Se Unreal IA for requisito: corrigir manifesto `.uplugin` para JSON válido + adicionar `AethelPlugin.Build.cs` + alinhar API real do backend.
