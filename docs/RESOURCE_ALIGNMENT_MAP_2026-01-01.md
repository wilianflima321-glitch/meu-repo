# 🔄 ALINHAMENTO COMPLETO DE RECURSOS - Aethel Engine

**Data:** 2026-01-01  
**Objetivo:** Mapear TODOS os recursos existentes e alinhar nas interfaces

---

## 📊 RESUMO EXECUTIVO

| Categoria | Quantidade | Status |
|-----------|------------|--------|
| Páginas IDE Browser | 8 | ⚠️ Parcial |
| API Endpoints IDE | 7 | ✅ Funcionando |
| Páginas Portal Web | 30+ | ⚠️ Parcial |
| API Routes Portal | 50+ | ⚠️ Muitas stub |
| Componentes React | 60+ | ⚠️ Desconectados |
| Packages Theia | 60 | ❌ Não integrado |
| Sistemas Engine | 28 | ❌ Não expostos |
| Agentes IA | 5 | ⚠️ Parcial |
| Providers LLM | 4 | ✅ Funcionando |

---

## 🎯 SEÇÃO 1: IDE BROWSER (`examples/browser-ide-app/`)

### 1.1 Páginas HTML Existentes

| Arquivo | Descrição | Status | Integração Necessária |
|---------|-----------|--------|----------------------|
| `index.html` | Dashboard com agentes | ✅ | Conectar ao Portal |
| `monaco-editor.html` | Editor código | ✅ | Unificar com CodeEditor.tsx |
| `visual-scripting.html` | Blueprints | ✅ | Expor no dashboard |
| `3d-viewport.html` | Editor 3D | ✅ | Adicionar tab no dashboard |
| `asset-manager.html` | Gerenciador assets | ✅ | Integrar file explorer |
| `project-manager.html` | Projetos | ✅ | Sincronizar com /api/projects |
| `test-integration.html` | Testes | ⚠️ | Mover para test explorer |
| `test-physics.html` | Physics test | ⚠️ | Integrar engine features |

### 1.2 API Endpoints (server.ts)

```typescript
// Endpoints funcionando
GET  /api/health         // Health check
GET  /api/status         // Orchestrator status
POST /api/tasks/execute  // Execute task
GET  /api/tasks/:id      // Task status
POST /api/agent/:type    // Invoke agent (architect, coder, research)
POST /orchestrator/select // Theia thin-client
WS   /ws                 // Real-time events
```

### 1.3 Scripts JS Existentes

| Script | Função | Integração |
|--------|--------|------------|
| `ai-context-manager.js` | Previne alucinações | Usar em todos AI calls |
| `integration-hub.js` | Hub central | Mover para lib/ |
| `file-explorer.js` | Navegação arquivos | Unificar com FileExplorer.tsx |
| `console-panel.js` | Console logs | Unificar com OutputPanel.tsx |
| `toast-system.js` | Notificações | Usar Toast.tsx |
| `theme-toggle.js` | Temas | Integrar no header |
| `undo-redo-system.js` | Undo/redo | Global command |

---

## 🌐 SEÇÃO 2: PORTAL WEB (`cloud-web-app/web/`)

### 2.1 Rotas de Página (App Router)

#### ✅ Funcionando
```
/                    → Landing page
/(auth)/login        → Login
/register           → Registro
/dashboard          → Dashboard principal
/pricing            → Preços
/docs               → Documentação
/help               → Ajuda
/contact            → Contato
/playground         → Playground AI
```

#### ⚠️ Criadas mas incompletas
```
/settings           → Configurações (criar tabs)
/billing            → Billing (conectar Stripe)
/marketplace        → Marketplace (criar UI)
/admin              → Admin (proteger + criar UI)
/terminal           → Terminal (integrar TerminalPro)
/explorer           → Explorer (integrar FileExplorer)
/chat               → Chat (integrar ChatComponent)
```

#### ❌ Precisam ser criadas/expostas
```
/editor             → Editor principal (Monaco integrado)
/visual-scripting   → Visual scripting (ReactFlow)
/3d-viewport        → 3D Viewport (Babylon)
/debugger           → Debugger (DAP)
/git                → Git panel
/blueprint-editor   → Blueprint editor
/animation-blueprint → Animation editor
/level-editor       → Level editor
/landscape-editor   → Landscape editor
/niagara-editor     → VFX editor
/vr-preview         → VR preview
```

### 2.2 API Routes

#### ✅ Implementadas
```typescript
// Auth
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/profile
POST /api/auth/logout

// AI
POST /api/ai/chat
POST /api/ai/stream
POST /api/ai/query

// Health
GET  /api/health
```

#### ⚠️ Stub/Parcial
```typescript
// Projects - precisa conectar ao Prisma
GET  /api/projects
POST /api/projects
PUT  /api/projects/:id
DELETE /api/projects/:id

// Files - precisa implementar storage
GET  /api/workspace/files
POST /api/files/read
POST /api/files/write
GET  /api/workspace/tree

// Terminal
POST /api/terminal/create
POST /api/terminal/execute
```

#### ❌ Não implementadas
```typescript
// Git - precisa conectar isomorphic-git ou git backend
GET  /api/git/status
POST /api/git/add
POST /api/git/commit
POST /api/git/push
POST /api/git/pull

// Marketplace
GET  /api/marketplace/extensions
POST /api/marketplace/install
POST /api/marketplace/uninstall

// LSP/DAP - precisa implementar
POST /api/lsp/completion
POST /api/lsp/definition
POST /api/lsp/hover
POST /api/dap/start
POST /api/dap/setBreakpoint

// Tasks
GET  /api/tasks
POST /api/tasks/execute
```

### 2.3 Componentes React

#### Dashboard Tabs (AethelDashboard.tsx)
O dashboard tem 12 tabs mas a UI não está conectada:

| Tab | Componente | Status |
|-----|------------|--------|
| overview | Stats cards | ⚠️ Mock data |
| projects | Project grid | ⚠️ Mock data |
| ai-chat | ChatComponent | ✅ Funciona |
| agent-canvas | Agent system | ⚠️ UI básica |
| content-creation | Templates | ❌ Mock |
| unreal | Engine tools | ❌ Mock |
| wallet | Wallet/credits | ⚠️ Mock |
| billing | Plans | ⚠️ Mock |
| connectivity | Status | ⚠️ Mock |
| templates | Project templates | ❌ Mock |
| use-cases | Examples | ❌ Mock |
| download | Downloads | ⚠️ Links |
| admin | Admin panel | ❌ Proteger |

#### Componentes Importantes

| Componente | Path | Status | Ação |
|------------|------|--------|------|
| `CodeEditor.tsx` | components/ | ⚠️ | Integrar Monaco real |
| `Terminal.tsx` | components/ | ⚠️ | Usar TerminalPro |
| `FileExplorer.tsx` | components/ | ⚠️ | Conectar API |
| `GitPanel.tsx` | components/ | ❌ | Implementar Git |
| `Debugger.tsx` | components/ | ❌ | Implementar DAP |
| `SearchReplace.tsx` | components/ | ⚠️ | Conectar editor |
| `Settings.tsx` | components/ | ⚠️ | Adicionar categorias |
| `VisualScriptEditor.tsx` | components/ | ✅ | Expor no dashboard |
| `Collaboration.tsx` | components/ | ❌ | Implementar |

---

## 🧠 SEÇÃO 3: CORE IA (`src/common/`)

### 3.1 LLM Router

```typescript
// Localização: src/common/llm/llm-router.ts

// Planos disponíveis
type PlanType = 'starter_trial' | 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise'

// Budget por plano
PLAN_BUDGETS = {
  starter_trial: { budget: 0.50, daily: 0.10, tokens: 100_000 },
  starter: { budget: 3, daily: 0.15, tokens: 500_000 },
  basic: { budget: 9, daily: 0.50, tokens: 2_000_000 },
  pro: { budget: 29, daily: 1.50, tokens: 8_000_000 },
  studio: { budget: 79, daily: 4.00, tokens: 25_000_000 },
  enterprise: { budget: 199, daily: 10.00, tokens: 100_000_000 }
}

// Features
- Circuit breaker com failure threshold
- Rate limiting por provider
- Cost tracking por workspace
- Budget alerts (75%, 90%, 100%)
- Model routing por qualidade/custo/latência
- Fallback automático entre providers
```

**Integração necessária:**
- [ ] Expor budget/usage no dashboard
- [ ] Settings para escolher modelo preferido
- [ ] Alertas de quota na UI
- [ ] Histórico de uso por dia/semana/mês

### 3.2 Supreme Orchestrator

```typescript
// Localização: src/common/supreme-orchestrator/index.ts

// Capacidades
- Web Automation (browser automation)
- Trading HFT (quando habilitado)
- Cloud Deploy
- Mission System
- Learning System

// Modos
type OrchestratorMode = 'autonomous' | 'supervised' | 'manual'

// Config
{
  enableWebAutomation: true,
  enableTrading: false, // AETHEL_ENABLE_HFT=1
  enableCloudDeploy: true,
  enableMissions: true,
  enableLearning: true,
  maxConcurrentMissions: 5,
  maxConcurrentTrades: 3,
  maxQueuedTasks: 1000
}
```

**Integração necessária:**
- [ ] Painel de controle do orchestrator
- [ ] Toggle de modos (autonomous/supervised/manual)
- [ ] Visualização de tasks em execução
- [ ] Queue status
- [ ] Learning insights

### 3.3 Agent System

```typescript
// Localização: src/common/agent-system/unified-agent-system.ts

// Agentes disponíveis
- architect  → Planejamento e arquitetura
- coder      → Geração de código
- research   → Pesquisa e análise
- ai-dream   → Criatividade
- character-memory → Persistência de contexto

// Componentes integrados
- Secure Vault (AES-256-GCM)
- Credential Flow Manager
- Workflow Manager
- LivePreview Integration
```

**Integração necessária:**
- [ ] UI para selecionar agente
- [ ] Visualização de workflows
- [ ] Credential manager UI
- [ ] LivePreview no editor

---

## 🎮 SEÇÃO 4: ENGINE FEATURES (`cloud-web-app/web/lib/`)

### 4.1 Sistemas de Engine

| Sistema | Arquivo | Descrição | Exposição UI |
|---------|---------|-----------|--------------|
| Physics | `physics-engine-real.ts` | PhysicsWorld, Body, Collider | 3D Viewport |
| AI | `behavior-tree.ts` | BehaviorTree, Blackboard | Visual Scripting |
| Navigation | `navigation-mesh.ts` | NavMesh, NavAgent | Level Editor |
| Video | `video-encoder-real.ts` | VideoEncoder | Content Browser |
| Particles | `particle-system-real.ts` | ParticleEmitter | Niagara Editor |
| Animation | `skeletal-animation.ts` | AnimationClip | Animation Blueprint |
| Level | `level-serialization.ts` | LevelSerializer | Level Editor |
| Materials | `pbr-shader-pipeline.ts` | PBRMaterial, PostProcess | Material Editor |
| Network | `networking-multiplayer.ts` | NetworkManager | Settings |
| Profiler | `profiler-integrated.ts` | ProfilerOverlay | Dev tools |
| Hot Reload | `hot-reload-system.ts` | HotReloadManager | Auto |
| World | `world-partition.ts` | WorldPartition, HLOD | Level Editor |
| Destruction | `destruction-system.ts` | DestructibleObject | 3D Viewport |
| Terrain | `terrain-engine.ts` | HeightmapGenerator | Landscape Editor |
| Foliage | `foliage-system.ts` | FoliageCluster, Grass, Tree | Landscape Editor |
| Decals | `decal-system.ts` | DecalManager | Level Editor |
| PostProcess | `post-process-volume.ts` | PostProcessPass | Settings |
| Cloth | `cloth-simulation.ts` | ClothSim | 3D Viewport |
| RayTracing | `ray-tracing.ts` | RayTracer | Settings |
| Clouds | `volumetric-clouds.ts` | CloudSystem | Sky settings |
| Water | `water-ocean-system.ts` | OceanSystem | Level Editor |
| Textures | `virtual-texture-system.ts` | VirtualTexture | Content Browser |
| Localization | `localization-system.ts` | i18n | Settings |
| Sequencer | `sequencer-cinematics.ts` | Sequencer | Sequencer Editor |
| VFX | `vfx-graph-editor.ts` | VFXGraph | Niagara Editor |
| Abilities | `gameplay-ability-system.ts` | AbilitySystem | Blueprint Editor |
| Plugins | `plugin-system.ts` | PluginManager | Marketplace |
| SaveLoad | `save-load-system.ts` | SaveManager | File menu |
| Audio | `audio-synthesis.ts` | AudioSynth | Audio Editor |
| Blueprints | `blueprint-system.ts` | BlueprintVM | Blueprint Editor |
| Assets | `asset-import-pipeline.ts` | AssetImporter | Content Browser |

**Integração necessária:**
- [ ] Criar Settings page com todas as opções de engine
- [ ] Expor ferramentas no menu principal
- [ ] Criar editores especializados para cada sistema
- [ ] Documentação de cada feature

---

## 🔧 SEÇÃO 5: THEIA FORK (`cloud-ide-desktop/aethel_theia_fork/`)

### 5.1 Packages AI (20)

```
ai-anthropic, ai-chat, ai-chat-ui, ai-code-completion,
ai-core, ai-core-ui, ai-editor, ai-google, ai-history,
ai-hugging-face, ai-ide, ai-llamafile, ai-mcp, ai-mcp-ui,
ai-ollama, ai-openai, ai-scanoss, ai-terminal, ai-vercel-ai
```

### 5.2 Packages Core (40+)

```
bulk-edit, callhierarchy, collaboration, console, core,
debug, dev-container, editor, editor-preview, external-terminal,
file-search, getting-started, git, keymaps, markers,
memory-inspector, messages, metrics, mini-browser, monaco,
navigator, notebook, outline-view, output, plugin,
plugin-dev, plugin-ext, plugin-ext-vscode, plugin-metrics, preferences,
preview, process, property-view, remote, remote-wsl,
scanoss, scm, scm-extra, search-in-workspace, secondary-window,
task, terminal, test, timeline, toolbar,
typehierarchy, userstorage, variable-resolver, vsx-registry, workspace
```

**Integração necessária:**
- [ ] Migrar IDE protótipo para Theia
- [ ] Habilitar packages ai-*
- [ ] Configurar VSX registry
- [ ] Integrar com auth do Portal

---

## 📋 SEÇÃO 6: CONFIGURAÇÕES

### 6.1 Arquivos de Configuração

| Arquivo | Localização | Propósito |
|---------|-------------|-----------|
| `.env` | raiz | API keys, secrets |
| `package.json` | raiz | Scripts, deps |
| `tsconfig.json` | raiz | TypeScript config |
| `next.config.js` | web/ | Next.js config |
| `tailwind.config.ts` | web/ | Tailwind config |
| `middleware.ts` | web/ | Auth, rate limit |
| `prisma/schema.prisma` | web/ | Database schema |

### 6.2 Variáveis de Ambiente

```bash
# API Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
DEEPSEEK_API_KEY=

# Auth
JWT_SECRET=
NEXTAUTH_SECRET=

# Database
DATABASE_URL=

# Rate Limit
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Features
AETHEL_ENABLE_HFT=0
NODE_ENV=development
```

### 6.3 Settings do Usuário (a implementar)

```typescript
interface UserSettings {
  // Editor
  editor: {
    theme: 'dark' | 'light' | 'system'
    fontSize: number
    fontFamily: string
    tabSize: number
    wordWrap: boolean
    minimap: boolean
    lineNumbers: boolean
    formatOnSave: boolean
  }
  
  // AI
  ai: {
    preferredModel: string
    autoComplete: boolean
    inlineSuggestions: boolean
    chatPosition: 'right' | 'bottom' | 'floating'
  }
  
  // Terminal
  terminal: {
    shell: string
    fontSize: number
    cursorStyle: 'block' | 'line' | 'underline'
  }
  
  // Git
  git: {
    autoFetch: boolean
    confirmSync: boolean
    defaultBranch: string
  }
  
  // Engine
  engine: {
    physicsEnabled: boolean
    particlesQuality: 'low' | 'medium' | 'high'
    shadowQuality: 'off' | 'low' | 'medium' | 'high'
    rayTracingEnabled: boolean
  }
  
  // Keybindings
  keybindings: Record<string, string>
}
```

---

## 🎯 SEÇÃO 7: PLANO DE AÇÃO

### Fase 1: Consolidar UI (1-2 dias)

1. **Criar IDE Layout unificado**
   - Header com todas as ferramentas
   - Sidebar com navegação
   - Panel system (editor, terminal, output)
   - Status bar

2. **Integrar componentes existentes**
   - TerminalPro no terminal panel
   - FileExplorer na sidebar
   - CodeEditor no editor panel
   - OutputPanel no bottom panel

3. **Expor ferramentas de engine**
   - Menu dropdown com todos os editores
   - Tabs para alternar entre editores
   - Settings com todas as opções

### Fase 2: Conectar APIs (2-3 dias)

1. **Implementar APIs faltantes**
   - Git (usando isomorphic-git)
   - Files (usando fs/storage)
   - Terminal (usando node-pty ou webcontainer)
   - Tasks

2. **Conectar componentes às APIs**
   - FileExplorer → /api/workspace/tree
   - GitPanel → /api/git/*
   - Terminal → /api/terminal/*
   - Projects → /api/projects

### Fase 3: Integrar IA (1-2 dias)

1. **Expor agentes na UI**
   - Seletor de agente
   - Painel de orquestrador
   - Visualização de workflows

2. **Conectar LLM Router**
   - Budget display
   - Model selector
   - Usage history

### Fase 4: Engine Features (2-3 dias)

1. **Criar editores especializados**
   - Visual Scripting (já existe)
   - 3D Viewport (já existe)
   - Level Editor
   - Material Editor
   - Animation Editor

2. **Integrar sistemas**
   - Physics no viewport
   - Particles no editor
   - NavMesh visualization

---

## 📝 CHECKLIST FINAL

### UI/UX
- [ ] Layout de IDE profissional
- [ ] Sistema de painéis configurável
- [ ] Temas (dark/light)
- [ ] Atalhos de teclado configuráveis
- [ ] Command palette funcional
- [ ] Notificações toast
- [ ] Loading states
- [ ] Empty states

### Editor
- [ ] Monaco integrado
- [ ] Syntax highlighting
- [ ] Auto-complete (LSP)
- [ ] Go to definition
- [ ] Find references
- [ ] Format on save
- [ ] Multiple cursors
- [ ] Minimap

### Terminal
- [ ] Shell integration
- [ ] Multiple sessions
- [ ] History persistence
- [ ] Copy/paste
- [ ] Search in terminal

### Files
- [ ] File explorer tree
- [ ] Create/rename/delete
- [ ] Drag and drop
- [ ] Search in files
- [ ] Recent files

### Git
- [ ] Status view
- [ ] Diff view
- [ ] Stage/unstage
- [ ] Commit
- [ ] Push/pull
- [ ] Branch management
- [ ] Merge conflict UI

### AI
- [ ] Chat panel
- [ ] Inline suggestions
- [ ] Code generation
- [ ] Code explanation
- [ ] Bug detection
- [ ] Agent selection
- [ ] Workflow visualization

### Engine
- [ ] 3D Viewport
- [ ] Visual Scripting
- [ ] Physics simulation
- [ ] Particle editor
- [ ] Material editor
- [ ] Level editor
- [ ] Animation editor

### Settings
- [ ] User preferences
- [ ] Keyboard shortcuts
- [ ] Theme customization
- [ ] Extension management
- [ ] Account/billing

---

*Este documento serve como guia completo para alinhar todos os recursos da plataforma Aethel Engine.*
