# 🎯 PLANO DE ALINHAMENTO DEFINITIVO - AETHEL ENGINE
## Auditoria e Integração Completa

**Data:** 2 de Janeiro de 2026  
**Status:** IMPLEMENTAÇÃO IMEDIATA

---

## 📊 RESUMO DA AUDITORIA

### Serviços REAIS Disponíveis (cloud-web-app/web/lib/)

| Serviço | Arquivo | Status | Linhas |
|---------|---------|--------|--------|
| **Git Client** | `git/git-client.ts` | ✅ FUNCIONAL | 604 |
| **Git Manager** | `git/git-manager.ts` | ✅ FUNCIONAL | ~300 |
| **StatusBar Manager** | `statusbar/statusbar-manager.ts` | ✅ FUNCIONAL | ~200 |
| **Keybinding Manager** | `keybindings/keybinding-manager.ts` | ✅ FUNCIONAL | ~300 |
| **Extension Loader** | `extensions/extension-loader.ts` | ✅ FUNCIONAL | ~400 |
| **Extension Host** | `extensions/extension-host.ts` | ✅ FUNCIONAL | ~300 |
| **Terminal Manager** | `terminal/terminal-manager.ts` | ✅ FUNCIONAL | 444 |
| **LSP Client** | `lsp/lsp-client.ts` | ✅ FUNCIONAL | ~300 |
| **DAP Client** | `dap/dap-client.ts` | ⚠️ PARCIAL | ~200 |
| **AI Service** | `ai-service.ts` | ✅ FUNCIONAL | 266 |
| **Blueprint System** | `blueprint-system.ts` | ✅ FUNCIONAL | 864 |
| **Physics Engine** | `physics-engine-real.ts` | ✅ FUNCIONAL | 1222 |
| **Particle System** | `particle-system-real.ts` | ✅ FUNCIONAL | 1000 |
| **Consent Manager** | `consent/consent-manager.ts` | ✅ FUNCIONAL | ~200 |

### APIs Backend REAIS (cloud-web-app/web/app/api/)

| API | Rota | Status |
|-----|------|--------|
| **Git** | `/api/git/*` | ✅ FUNCIONAL |
| **LSP** | `/api/lsp/*` | ✅ FUNCIONAL |
| **Terminal** | `/api/terminal/*` | ✅ FUNCIONAL |
| **AI** | `/api/ai/*` | ✅ FUNCIONAL |
| **Auth** | `/api/auth/*` | ✅ FUNCIONAL |
| **Projects** | `/api/projects/*` | ✅ FUNCIONAL |
| **Files** | `/api/files/*` | ✅ FUNCIONAL |
| **Billing** | `/api/billing/*` | ✅ FUNCIONAL |

---

## 🚨 DUPLICIDADES A RESOLVER

### 1. GitPanel (3 versões)

| Arquivo | Status | Ação |
|---------|--------|------|
| `GitPanel.tsx` (root) | ✅ **USA git-client REAL** | **MANTER COMO BASE** |
| `git/GitPanel.tsx` (novo) | ❌ 100% MOCK | REMOVER |
| `ide/GitPanelPro.tsx` | ❌ USA DEMO_DATA | INTEGRAR UI + serviço real |

**Solução:** Fundir UI de `GitPanelPro` com serviço de `GitPanel.tsx`

### 2. CommandPalette (4 versões)

| Arquivo | Status | Ação |
|---------|--------|------|
| `CommandPalette.tsx` (root) | ✅ USA CustomEvents REAL | **MANTER COMO BASE** |
| `command-palette/CommandPalette.tsx` (novo) | ❌ 100% MOCK | REMOVER |
| `CommandPalettePro.tsx` | ⚠️ UI melhor, parcialmente mock | INTEGRAR UI |
| `src/components/CommandPalette.tsx` | ⚠️ Serviços não existem | Ignorar |

**Solução:** Integrar UI do novo com lógica do root

### 3. StatusBar (3 versões)

| Arquivo | Status | Ação |
|---------|--------|------|
| `StatusBar.tsx` (root) | ⚠️ Básico | Deprecar |
| `statusbar/StatusBar.tsx` | ✅ **USA StatusBarManager REAL** | **MANTER COMO BASE** |
| `status-bar/StatusBar.tsx` (novo) | ❌ 100% MOCK | REMOVER |

**Solução:** Melhorar UI do statusbar/ com features do novo

### 4. FileExplorer (5 versões)

| Arquivo | Status | Ação |
|---------|--------|------|
| `FileExplorer.tsx` | ⚠️ Básico | Deprecar |
| `FileTreeExplorer.tsx` | ⚠️ Médio | Deprecar |
| `ide/FileExplorerPro.tsx` | ✅ **COMPLETO** | **MANTER** |
| `explorer/FileTree.tsx` | ✅ Usa manager | Manter como lib |
| `examples/.../file-explorer.js` | Legado JS | Ignorar |

### 5. Terminal (3 versões)

| Arquivo | Status | Ação |
|---------|--------|------|
| `Terminal.tsx` | ⚠️ Básico | Deprecar |
| `TerminalPro.tsx` | ✅ **USA terminal-manager** | **MANTER** |
| `examples/.../terminal-panel.js` | Legado JS | Ignorar |

---

## 🔄 COMPONENTES A INTEGRAR COM SERVIÇOS

### 1. git/GitPanel.tsx → Integrar com git-client.ts

```typescript
// ANTES (mock):
const MOCK_FILES: GitFile[] = [...]

// DEPOIS (real):
import { getGitClient } from '@/lib/git/git-client';
const gitClient = getGitClient('/workspace');
const status = await gitClient.status();
```

### 2. extensions/ExtensionManager.tsx → Integrar com extension-loader.ts

```typescript
// ANTES (mock):
const MOCK_EXTENSIONS: Extension[] = [...]

// DEPOIS (real):
import { getExtensionLoader } from '@/lib/extensions/extension-loader';
const loader = getExtensionLoader();
const extensions = await loader.getInstalledExtensions();
```

### 3. keybindings/KeybindingsEditor.tsx → Integrar com keybinding-manager.ts

```typescript
// ANTES (mock):
const DEFAULT_KEYBINDINGS: Keybinding[] = [...]

// DEPOIS (real):
import { getKeybindingManager } from '@/lib/keybindings/keybinding-manager';
const manager = getKeybindingManager();
const keybindings = manager.getAllKeybindings();
```

### 4. status-bar/StatusBar.tsx → Integrar com statusbar-manager.ts

```typescript
// ANTES (mock):
cursorPosition = { line: 1, column: 1 }

// DEPOIS (real):
import { getStatusBarManager } from '@/lib/statusbar/statusbar-manager';
const manager = getStatusBarManager();
const items = manager.getItemsByAlignment('right');
```

---

## 📁 ESTRUTURA FINAL RECOMENDADA

```
cloud-web-app/web/components/
├── ide/                         # IDE Core - VERSÕES PRO
│   ├── AIChatPanelPro.tsx      ✅ Manter (conectado a API)
│   ├── DebugPanel.tsx          🔄 Expandir (conectar DAP)
│   ├── DiffViewer.tsx          ✅ Manter
│   ├── FileExplorerPro.tsx     ✅ Manter (principal)
│   ├── GitPanelPro.tsx         🔄 Integrar git-client
│   ├── IDELayout.tsx           ✅ Manter (shell principal)
│   └── InlineCompletion.tsx    ✅ Manter
│
├── engine/                      # Engine Unreal-like - TODOS REAIS
│   ├── BlueprintEditor.tsx     ✅ 842 linhas - ReactFlow
│   ├── NiagaraVFX.tsx          ✅ 1276 linhas - Three.js
│   ├── LevelEditor.tsx         ✅ 1199 linhas - Three.js
│   ├── AnimationBlueprint.tsx  ✅ 1219 linhas - ReactFlow
│   ├── MaterialEditor.tsx      ✅ 1081 linhas - Three.js
│   └── ... (todos funcionais)
│
├── ui/                          # Componentes base
│   ├── Button.tsx              ✅ Manter
│   ├── Card.tsx                ✅ Manter
│   └── ... (todos funcionais)
│
├── DEPRECAR (mover para archive)
│   ├── git/GitPanel.tsx        ❌ Mock - usar GitPanelPro
│   ├── command-palette/        ❌ Mock - usar CommandPalette.tsx root
│   ├── extensions/             ❌ Mock - integrar ou remover
│   ├── keybindings/            ❌ Mock - integrar com manager
│   ├── status-bar/             ❌ Mock - usar statusbar/
│   ├── layout/IDELayout.tsx    ❌ Duplica ide/IDELayout.tsx
│   └── Settings.tsx            ❌ Usar SettingsEditor.tsx
```

---

## ✅ ARQUIVOS A MANTER (FUNCIONAIS)

### IDE Core
- `cloud-web-app/web/components/ide/IDELayout.tsx` - Shell principal
- `cloud-web-app/web/components/ide/FileExplorerPro.tsx` - Explorer
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx` - AI Chat
- `cloud-web-app/web/components/ide/DiffViewer.tsx` - Diff
- `cloud-web-app/web/components/ide/InlineCompletion.tsx` - Autocomplete

### Git (após integração)
- `cloud-web-app/web/components/GitPanel.tsx` - Lógica real
- `cloud-web-app/web/components/ide/GitPanelPro.tsx` - UI (integrar)

### Engine (TODOS)
- `cloud-web-app/web/components/engine/*` - Todos funcionais

### Terminal
- `cloud-web-app/web/components/TerminalPro.tsx` - Versão completa

### Outros
- `cloud-web-app/web/components/ChatComponent.tsx` - Chat funcional
- `cloud-web-app/web/components/AethelDashboard.tsx` - Dashboard completo
- `cloud-web-app/web/components/SettingsEditor.tsx` - Settings
- `cloud-web-app/web/components/statusbar/StatusBar.tsx` - StatusBar real

---

## ❌ ARQUIVOS A REMOVER/DEPRECAR

```bash
# Componentes Mock (criados 2026-01-01)
cloud-web-app/web/components/git/GitPanel.tsx           # Mock
cloud-web-app/web/components/command-palette/           # Mock
cloud-web-app/web/components/extensions/                # Mock
cloud-web-app/web/components/keybindings/               # Mock
cloud-web-app/web/components/status-bar/                # Mock
cloud-web-app/web/components/layout/IDELayout.tsx       # Duplica ide/

# Componentes Básicos (substituídos por versões Pro)
cloud-web-app/web/components/FileExplorer.tsx           # Usar FileExplorerPro
cloud-web-app/web/components/FileTreeExplorer.tsx       # Usar FileExplorerPro
cloud-web-app/web/components/Terminal.tsx               # Usar TerminalPro
cloud-web-app/web/components/Settings.tsx               # Usar SettingsEditor
cloud-web-app/web/components/StatusBar.tsx              # Usar statusbar/
cloud-web-app/web/components/AethelHeader.tsx           # Usar AethelHeaderPro
cloud-web-app/web/components/QuickOpen.tsx              # Usar explorer/QuickOpen
cloud-web-app/web/components/OutputPanel.tsx            # Usar output/OutputPanel

# Stubs
cloud-web-app/web/components/Debugger.tsx               # Stub - expandir DebugPanel
src/components/MonacoEditor.tsx                         # Stub - usar editor/MonacoEditor
```

---

## 🔧 INTEGRAÇÕES NECESSÁRIAS

### 1. GitPanelPro + git-client.ts
**Prioridade:** P0  
**Esforço:** 2 horas

```typescript
// Em ide/GitPanelPro.tsx
import { getGitClient } from '@/lib/git/git-client';
import { getConsentManager } from '@/lib/consent/consent-manager';

const GitPanelPro = () => {
  const gitClient = useMemo(() => getGitClient('/workspace'), []);
  
  const [status, setStatus] = useState<GitStatus | null>(null);
  
  useEffect(() => {
    gitClient.status().then(setStatus);
  }, [gitClient]);
  
  // Usar status real em vez de DEMO_FILES
}
```

### 2. ExtensionManager + extension-loader.ts
**Prioridade:** P1  
**Esforço:** 3 horas

### 3. KeybindingsEditor + keybinding-manager.ts
**Prioridade:** P1  
**Esforço:** 2 horas

### 4. StatusBar + statusbar-manager.ts
**Prioridade:** P1  
**Esforço:** 1 hora

### 5. DebugPanel + dap-client.ts
**Prioridade:** P2  
**Esforço:** 4 horas

---

## 📈 ESTIMATIVA TOTAL

| Tarefa | Tempo | Prioridade |
|--------|-------|------------|
| Integrar GitPanelPro | 2h | P0 |
| Integrar ExtensionManager | 3h | P1 |
| Integrar KeybindingsEditor | 2h | P1 |
| Integrar StatusBar | 1h | P1 |
| Expandir DebugPanel | 4h | P2 |
| Consolidar CommandPalette | 2h | P1 |
| Remover duplicidades | 1h | P0 |
| Atualizar imports | 2h | P0 |
| Testes | 3h | P1 |
| **TOTAL** | **20h** | - |

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. ✅ Criar este documento de alinhamento
2. 🔄 Integrar GitPanelPro com git-client
3. 🔄 Consolidar CommandPalette
4. 🔄 Integrar KeybindingsEditor com manager
5. 🔄 Integrar StatusBar com manager
6. ❌ Remover componentes mock
7. ❌ Arquivar duplicidades
8. 📝 Atualizar documentação

---

*Documento gerado pela auditoria completa do projeto Aethel Engine*
