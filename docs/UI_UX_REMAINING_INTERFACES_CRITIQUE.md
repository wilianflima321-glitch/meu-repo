# Critica de Interfaces Restantes - UI/UX

**Data:** 2026-04-05  
**Projeto:** Aethel Engine IDE  
**Status:** auditoria local; sem claims de build/test

---

## Objetivo

Mapear o que ainda precisa de ajuste nas superficies secundarias apos a rodada de padronizacao do shell.

---

## Superficies revisadas nesta rodada

### Settings e Git
- SettingsUI: botoes reais, foco visivel e inputs com aria-label.
- SourceControlPanel: acoes textuais (Pull/Push/Sync/Refresh), foco visivel e focus-within.
- GitBranchManager, GitHistoryPanel, GitDiffViewer, GitBlameView, GitMergeConflictResolver: navegacao por teclado e acoes mais claras.

### Debug
- DebugConsole: autoscroll respeita prefers-reduced-motion e botoes com aria-pressed.
- DebugBreakpointsPanel: acoes textuais e labels nos inputs.
- DebugCallStackPanel: teclado, aria-expanded e microcopy alinhada.
- DebugVariablesPanel: expand/collapse com aria e acoes consistentes.

### Unreal (UI 3D/Editor)
- AssetBrowser: navegacao por teclado, botoes com aria-label e foco visivel.
- LevelEditor: toolbar e lista com foco visivel e aria-pressed.
- BlueprintEditor: foco visivel e transicoes basicas.

---

## Problemas que permanecem

- Padronizacao de icons: varios botoes usam texto como placeholder (precisa icon system real)
- Tokens e cores: ainda existem superficies com cores hardcoded fora do sistema de tema
- Contraste e foco: nao ha validacao automatizada de contraste/AA
- Targets pequenos em algumas acoes (precisa sweep amplo)

---

## Prioridades

### P1
- Substituir placeholders de texto por icones consistentes
- Finalizar sweep de tokens/cores

### P2
- Melhorar indicadores de selecao/hover em listas longas
- Revisar altura minima de inputs (>= 32px) e botoes (>= 28px)

---

## Proximos passos

1. Rodar varredura por cores hardcoded e normalizar tokens
2. Revisar acessibilidade com checklist WCAG (foco, contraste, teclado)
3. Consolidar o sistema de icones com um set unico

---

**Nota:** Sem build/test nesta rodada. O documento reflete apenas verificacoes locais.
