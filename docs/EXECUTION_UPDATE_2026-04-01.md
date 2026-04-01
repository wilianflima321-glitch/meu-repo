# EXECUTION UPDATE ? 2026-04-01

Status: EXECUTADO LOCALMENTE (evid?ncia limitada ao reposit?rio)

## Escopo executado
- Refino PT-BR e tokens Aethel em superf?cies cr?ticas (preview, chat, onboarding, billing, marketplace e admin).
- Sweep automatizado em app/components/lib para reduzir utilit?rios de cor hardcoded.
- Acessibilidade aplicada onde tocado (aria-label, type="button", foco vis?vel).
- Normaliza??o PT-BR em layout global, terminal e gerenciador de workspace.

## Superf?cies atualizadas (arquivo -> ajuste)
- Layout: `cloud-web-app/web/app/layout.tsx`
  - Metadata principal em PT-BR e skip-link traduzido.
- Terminal: `cloud-web-app/web/components/terminal/TerminalWidget.tsx`
  - Toolbar e busca em PT-BR, bot?es com type="button" e aria-label.
- Workspace: `cloud-web-app/web/components/workspace/WorkspaceSwitcher.tsx`
  - Sem?ntica de di?logo, labels PT-BR, bot?es com type="button" e tokens Aethel no estilo.
- Preview: `cloud-web-app/web/components/ide/PreviewPanel.tsx`
  - Pr?via CSS em PT-BR e badges operacionais normalizadas.
- Shell/Explorer: `cloud-web-app/web/components/ide/IDELayout.tsx`, `cloud-web-app/web/components/ide/FileExplorerPro.tsx`
  - Menus em PT-BR e tokens Aethel nas ?reas tocadas.
- Chat/IA: `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`
  - Labels PT-BR e controles com aria-label.
- Terminal/Extens?es/Outline: `cloud-web-app/web/components/terminal/XTerminal.tsx`,
  `cloud-web-app/web/components/terminal/IntegratedTerminal.tsx`,
  `cloud-web-app/web/components/extensions/ExtensionManagerPanel.tsx`,
  `cloud-web-app/web/components/outline/OutlinePanel.tsx`,
  `cloud-web-app/web/components/ide/CommandPalette.tsx`
  - Remo??o de cores hardcoded em classes utilit?rias.

## Varredura local de d?vida (app/components/lib)
- Bot?es sem type="button": **1245** ocorr?ncias.
- Utilit?rios de cor hardcoded (bg/text/border/from/to): **248** ocorr?ncias.
- Hotspots de microcopy em ingl?s: **7642** ocorr?ncias.
- Uso de tokens `var(--aethel-*)`: **15323** ocorr?ncias.

Top arquivos (amostra):
- Buttons sem type: `components/extensions/ExtensionManager.tsx`, `components/narrative/DialogueEditor.tsx`, `components/character/ControlRigEditor.tsx`.
- Cores hardcoded: `components/Onboarding.tsx`, `components/onboarding/QuickStartWizard.tsx`, `lib/debug/devtools-provider.tsx`.
- Microcopy inglesa: `components/ide/FullscreenIDE.tsx`, `lib/settings/settings-system.tsx`, `app/admin/apis/page.tsx`.

## Gaps reais identificados (com evid?ncia)
### P0
- Preview runtime continua dependente de runtime externo.
  - Evid?ncia: `cloud-web-app/web/components/ide/PreviewRuntimeToolbar.tsx`, `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx`.
- Billing p?blico permanece parcial quando runtime n?o responde.
  - Evid?ncia: `cloud-web-app/web/components/billing/PublicBillingReadiness.tsx` mostra prontid?o parcial.
- Marketplace depende de backend de instala??o para paridade ponta a ponta.
  - Evid?ncia: `cloud-web-app/web/app/marketplace/page.tsx` usa endpoints de install/uninstall.

### P1
- Microcopy PT-BR ainda incompleta em v?rias superf?cies (hotspots listados acima).
- D?vida de acessibilidade: grande volume de bot?es sem type expl?cito.
- Documento can?nico ausente: `docs/master/31_INTERFACE_UX_GAP_EXECUTION_PLAN_2026-03-01.md`.

## Valida??es
- Build/lint/testes **n?o executados nesta rodada** (sem claim de sucesso).

## Traceability note
Todas as afirma??es acima est?o ligadas a arquivos reais do reposit?rio e n?o inferem runtime externo.
