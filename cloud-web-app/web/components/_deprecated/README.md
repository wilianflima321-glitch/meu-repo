# 📁 Componentes Deprecados

**Data de Arquivamento:** 2 de Janeiro de 2026

Estes componentes foram movidos para cá porque existem versões melhores ou são duplicidades.

## Motivo de Cada Arquivo

### Pastas Mock (criadas em 2026-01-01, sem serviços reais)

| Pasta/Arquivo | Problema | Usar em vez |
|--------------|----------|-------------|
| `git/GitPanel.tsx` | 100% mock, dados fake | `ide/GitPanelPro.tsx` (integrado com git-client) |
| `command-palette/CommandPalette.tsx` | 100% mock, apenas console.log | `CommandPalette.tsx` (raiz, usa CustomEvents) |
| `status-bar/StatusBar.tsx` | 100% mock, valores hardcoded | `statusbar/StatusBar.tsx` (usa StatusBarManager) |
| `layout/IDELayout.tsx` | Duplica ide/IDELayout.tsx | `ide/IDELayout.tsx` |

### Componentes Básicos (substituídos por versões Pro)

| Arquivo | Problema | Usar em vez |
|---------|----------|-------------|
| `FileExplorer.tsx` | Muito básico | `ide/FileExplorerPro.tsx` |
| `FileTreeExplorer.tsx` | Funcionalidade coberta | `ide/FileExplorerPro.tsx` |
| `Terminal.tsx` | Falta autocomplete, histórico | `TerminalPro.tsx` |
| `Settings.tsx` | Muito básico | `SettingsEditor.tsx` |
| `StatusBar.tsx` | Muito simples | `statusbar/StatusBar.tsx` |
| `AethelHeader.tsx` | Muito básico | `AethelHeaderPro.tsx` |

## Como Recuperar

Se precisar de alguma funcionalidade específica desses arquivos:

1. **NÃO reimporte diretamente** - os componentes principais já têm todas as features
2. Se houver algo faltando, adicione ao componente principal
3. Use esses arquivos apenas como referência

## Componentes Ativos (usar estes)

```
cloud-web-app/web/components/
├── ide/
│   ├── AIChatPanelPro.tsx       ✅ AI Chat
│   ├── DiffViewer.tsx           ✅ Git Diff
│   ├── FileExplorerPro.tsx      ✅ File Explorer
│   ├── GitPanelPro.tsx          ✅ Git Panel (INTEGRADO!)
│   ├── IDELayout.tsx            ✅ Layout Principal
│   └── InlineCompletion.tsx     ✅ Autocomplete
├── statusbar/StatusBar.tsx      ✅ Status Bar (usa manager)
├── TerminalPro.tsx              ✅ Terminal Avançado
├── SettingsEditor.tsx           ✅ Configurações
├── AethelHeaderPro.tsx          ✅ Header Completo
├── CommandPalette.tsx           ✅ Paleta de Comandos
└── CommandPalettePro.tsx        ✅ Versão com Fuzzy Search
```
