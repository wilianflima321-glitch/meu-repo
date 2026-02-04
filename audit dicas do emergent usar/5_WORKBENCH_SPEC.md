# WORKBENCH_SPEC.md
## Especificação Técnica do Workbench IDE
**Data:** Janeiro 2026  
**Versão:** 1.0  
**Status:** Contrato de Execução

---

## 1. VISÃO GERAL

O **Workbench** é a shell única da plataforma - uma IDE web completa que unifica:
- Edição de código (VS Code-like)
- Preview interativo
- Viewport 2D/3D (quando aplicável)
- Timeline de mídia (quando aplicável)
- AI nativa integrada
- Colaboração real-time

---

## 2. ARQUITETURA DE COMPONENTES

### 2.1 Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           WORKBENCH SHELL                               │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                        MENU BAR                                     │ │
│ │  File │ Edit │ View │ Run │ Terminal │ AI │ Help                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
├───────────┬─────────────────────────────────────────────┬───────────────┤
│           │                                             │               │
│  SIDEBAR  │              MAIN AREA                      │  AI PANEL     │
│           │                                             │               │
│ ┌───────┐ │  ┌─────────────────────────────────────┐   │ ┌───────────┐ │
│ │Explorer│ │  │           EDITOR TABS               │   │ │   Chat    │ │
│ │-------│ │  │  file.js │ style.css │ + │          │   │ │  -------  │ │
│ │ src/  │ │  └─────────────────────────────────────┘   │ │  [input]  │ │
│ │ └─app │ │  ┌─────────────────────────────────────┐   │ │           │ │
│ │ └─comp│ │  │                                     │   │ │ Actions:  │ │
│ │ assets│ │  │         CODE EDITOR                 │   │ │ • Explain │ │
│ │ public│ │  │         (Monaco)                    │   │ │ • Refactor│ │
│ │-------│ │  │                                     │   │ │ • Fix     │ │
│ │Search │ │  │         Line numbers │ Minimap      │   │ │ • Test    │ │
│ │-------│ │  │                                     │   │ │           │ │
│ │Git    │ │  └─────────────────────────────────────┘   │ │ History:  │ │
│ │-------│ │                   OR                       │ │ [msgs]    │ │
│ │AI     │ │  ┌─────────────────────────────────────┐   │ │           │ │
│ └───────┘ │  │         PREVIEW / VIEWPORT          │   │ └───────────┘ │
│           │  │         (iframe / Three.js)         │   │               │
│           │  └─────────────────────────────────────┘   │               │
├───────────┴─────────────────────────────────────────────┴───────────────┤
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                        BOTTOM PANEL                                 │ │
│ │  Terminal │ Problems │ Output │ Debug │ Ports                      │ │
│ │  $ npm run dev                                                      │ │
│ │  > Server running on port 3000                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│                          STATUS BAR                                     │
│  main │ JavaScript │ UTF-8 │ LF │ Ln 42, Col 15 │ AI: Ready │ Deploy ▶│
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes Core

| Componente | Responsabilidade | Tecnologia |
|------------|-----------------|------------|
| **Shell** | Layout manager, routing | React + CSS Grid |
| **MenuBar** | Commands, menus | React + cmdk |
| **Sidebar** | Panels laterais | React + Resizable |
| **MainArea** | Tabs, editor, preview | React + dnd-kit |
| **BottomPanel** | Terminal, output | React + xterm.js |
| **StatusBar** | Info, quick actions | React |
| **AIPanel** | Chat, actions | React + AI SDK |

---

## 3. ESPECIFICAÇÕES POR COMPONENTE

### 3.1 Menu Bar

```typescript
interface MenuBar {
  menus: Menu[];
}

interface Menu {
  label: string;
  items: MenuItem[];
}

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  submenu?: MenuItem[];
  separator?: boolean;
}

// Menus obrigatórios:
const MENUS = [
  { label: 'File', items: ['New File', 'New Project', 'Open', 'Save', 'Save All', '---', 'Export', 'Settings'] },
  { label: 'Edit', items: ['Undo', 'Redo', '---', 'Cut', 'Copy', 'Paste', '---', 'Find', 'Replace'] },
  { label: 'View', items: ['Command Palette', '---', 'Explorer', 'Search', 'Git', 'AI', '---', 'Preview', 'Terminal'] },
  { label: 'Run', items: ['Start', 'Stop', 'Restart', '---', 'Debug', '---', 'Build', 'Deploy'] },
  { label: 'Terminal', items: ['New Terminal', 'Split', '---', 'Clear'] },
  { label: 'AI', items: ['Chat', 'Explain', 'Refactor', 'Fix', 'Generate Test', '---', 'Agent Mode'] },
  { label: 'Help', items: ['Documentation', 'Shortcuts', '---', 'About'] },
];
```

### 3.2 Sidebar

```typescript
interface Sidebar {
  width: number; // 200-400px, resizable
  collapsed: boolean;
  activePanel: SidebarPanelType;
  panels: SidebarPanel[];
}

type SidebarPanelType = 'explorer' | 'search' | 'git' | 'ai' | 'extensions';

interface SidebarPanel {
  type: SidebarPanelType;
  icon: React.ReactNode;
  tooltip: string;
  component: React.ComponentType;
}

// Explorer Panel
interface ExplorerPanel {
  projectName: string;
  files: FileTreeNode[];
  onFileClick: (path: string) => void;
  onFileContextMenu: (path: string, e: MouseEvent) => void;
  onDrop: (source: string, target: string) => void;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  icon?: React.ReactNode;
}
```

### 3.3 Editor (Monaco)

```typescript
interface EditorConfig {
  theme: 'dark' | 'light' | string;
  fontSize: number; // 12-24
  fontFamily: string;
  tabSize: number; // 2 or 4
  wordWrap: 'on' | 'off' | 'bounded';
  minimap: { enabled: boolean; scale: number };
  lineNumbers: 'on' | 'off' | 'relative';
  formatOnSave: boolean;
  formatOnPaste: boolean;
}

interface EditorTab {
  id: string;
  path: string;
  label: string;
  language: string;
  isDirty: boolean;
  isPinned: boolean;
  content: string;
}

interface EditorArea {
  tabs: EditorTab[];
  activeTabId: string;
  splitDirection?: 'horizontal' | 'vertical';
  splits?: EditorArea[];
}

// Monaco extensions necessárias:
const MONACO_FEATURES = [
  'bracketPairColorization',
  'inlineSuggest', // Para AI autocomplete
  'codeActionsOnSave',
  'formatOnSave',
  'semanticHighlighting',
];
```

### 3.4 Preview Panel

```typescript
interface PreviewPanel {
  type: 'web' | '3d' | 'video' | 'image' | 'markdown';
  url?: string; // Para web preview
  refreshMode: 'auto' | 'manual' | 'on-save';
  deviceEmulation?: DeviceEmulation;
}

interface DeviceEmulation {
  type: 'desktop' | 'tablet' | 'mobile' | 'custom';
  width: number;
  height: number;
  deviceScaleFactor: number;
}

// Web Preview
interface WebPreview {
  iframe: HTMLIFrameElement;
  hotReload: boolean;
  console: ConsoleMessage[];
  network: NetworkRequest[];
}

// 3D Preview (Three.js)
interface Viewport3D {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  gizmo: TransformControls;
  grid: boolean;
  axes: boolean;
}
```

### 3.5 Terminal (xterm.js)

```typescript
interface TerminalPanel {
  terminals: Terminal[];
  activeTerminalId: string;
}

interface Terminal {
  id: string;
  title: string;
  cwd: string;
  shell: 'bash' | 'zsh' | 'powershell';
  pty: IPty; // Backend connection
}

// Comandos built-in
const TERMINAL_COMMANDS = [
  'clear',
  'cd',
  'ls',
  'npm',
  'yarn',
  'pnpm',
  'node',
  'python',
  'pip',
  'git',
];
```

### 3.6 AI Panel

```typescript
interface AIPanel {
  mode: 'chat' | 'agent';
  messages: AIMessage[];
  input: string;
  isLoading: boolean;
  context: AIContext;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  codeBlocks?: CodeBlock[];
}

interface AIAction {
  type: 'apply' | 'copy' | 'explain' | 'retry';
  label: string;
  onClick: () => void;
}

interface AIContext {
  currentFile?: string;
  selection?: string;
  projectContext: string[];
  recentErrors?: string[];
}

// Quick Actions (Ctrl+K style)
interface QuickAction {
  trigger: 'selection' | 'cursor' | 'error';
  prompt: string;
  action: AIActionType;
}

type AIActionType = 
  | 'explain'
  | 'refactor'
  | 'fix'
  | 'optimize'
  | 'document'
  | 'test'
  | 'translate';
```

### 3.7 Status Bar

```typescript
interface StatusBar {
  left: StatusBarItem[];
  right: StatusBarItem[];
}

interface StatusBarItem {
  id: string;
  text: string;
  icon?: React.ReactNode;
  tooltip?: string;
  onClick?: () => void;
  priority: number;
}

// Items obrigatórios:
const STATUS_BAR_ITEMS = {
  left: [
    { id: 'branch', text: 'main', icon: <GitBranch /> },
    { id: 'sync', text: '↑0 ↓0', icon: <Sync /> },
    { id: 'errors', text: '0', icon: <Error /> },
    { id: 'warnings', text: '0', icon: <Warning /> },
  ],
  right: [
    { id: 'language', text: 'JavaScript' },
    { id: 'encoding', text: 'UTF-8' },
    { id: 'lineEnding', text: 'LF' },
    { id: 'position', text: 'Ln 1, Col 1' },
    { id: 'ai', text: 'AI: Ready', icon: <Sparkles /> },
    { id: 'deploy', text: 'Deploy', icon: <Rocket />, onClick: deploy },
  ],
};
```

---

## 4. LAYOUT SYSTEM

### 4.1 CSS Grid Layout

```css
.workbench {
  display: grid;
  grid-template-rows: 30px 1fr 200px 22px;
  grid-template-columns: 48px 250px 1fr 300px;
  grid-template-areas:
    "menu    menu    menu    menu"
    "actbar  sidebar main    ai"
    "actbar  sidebar bottom  ai"
    "status  status  status  status";
  height: 100vh;
  width: 100vw;
}

.menu-bar { grid-area: menu; }
.activity-bar { grid-area: actbar; }
.sidebar { grid-area: sidebar; }
.main-area { grid-area: main; }
.ai-panel { grid-area: ai; }
.bottom-panel { grid-area: bottom; }
.status-bar { grid-area: status; }
```

### 4.2 Resizing

```typescript
interface ResizableConfig {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  defaultSize: number;
  collapsed: boolean;
  onResize: (size: number) => void;
}

// Panels resizáveis:
const RESIZABLE_PANELS = {
  sidebar: { minWidth: 170, maxWidth: 500, defaultSize: 250 },
  aiPanel: { minWidth: 250, maxWidth: 600, defaultSize: 300 },
  bottomPanel: { minHeight: 100, maxHeight: 500, defaultSize: 200 },
};
```

### 4.3 Keyboard Shortcuts

```typescript
const SHORTCUTS: Record<string, string> = {
  // File
  'Ctrl+N': 'file.new',
  'Ctrl+O': 'file.open',
  'Ctrl+S': 'file.save',
  'Ctrl+Shift+S': 'file.saveAll',
  
  // Edit
  'Ctrl+Z': 'edit.undo',
  'Ctrl+Y': 'edit.redo',
  'Ctrl+X': 'edit.cut',
  'Ctrl+C': 'edit.copy',
  'Ctrl+V': 'edit.paste',
  'Ctrl+F': 'edit.find',
  'Ctrl+H': 'edit.replace',
  
  // View
  'Ctrl+Shift+P': 'view.commandPalette',
  'Ctrl+P': 'view.quickOpen',
  'Ctrl+B': 'view.toggleSidebar',
  'Ctrl+J': 'view.togglePanel',
  'Ctrl+`': 'view.terminal',
  
  // AI
  'Ctrl+K': 'ai.quickAction',
  'Ctrl+Shift+I': 'ai.chat',
  'Ctrl+L': 'ai.newChat',
  
  // Run
  'F5': 'run.start',
  'Shift+F5': 'run.stop',
  'Ctrl+Shift+F5': 'run.restart',
  
  // Editor
  'Ctrl+/': 'editor.toggleComment',
  'Alt+Up': 'editor.moveLinesUp',
  'Alt+Down': 'editor.moveLinesDown',
  'Ctrl+D': 'editor.addSelectionToNextFindMatch',
  'Ctrl+Shift+K': 'editor.deleteLine',
};
```

---

## 5. COMMAND PALETTE

```typescript
interface CommandPalette {
  isOpen: boolean;
  query: string;
  results: Command[];
  selectedIndex: number;
}

interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category: string;
  action: () => void;
  when?: () => boolean; // Condition to show
}

// Categorias de comandos:
const COMMAND_CATEGORIES = [
  'File',
  'Edit',
  'View',
  'Run',
  'Terminal',
  'AI',
  'Git',
  'Debug',
  'Settings',
];

// Exemplo de comandos:
const COMMANDS: Command[] = [
  { id: 'file.new', label: 'New File', category: 'File', shortcut: 'Ctrl+N' },
  { id: 'ai.explain', label: 'AI: Explain Code', category: 'AI', shortcut: 'Ctrl+K E' },
  { id: 'run.deploy', label: 'Deploy to Production', category: 'Run' },
  // ...
];
```

---

## 6. THEMES

```typescript
interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: ThemeColors;
  tokenColors: TokenColor[];
}

interface ThemeColors {
  // Base
  'editor.background': string;
  'editor.foreground': string;
  
  // Sidebar
  'sidebar.background': string;
  'sidebar.foreground': string;
  
  // Activity Bar
  'activityBar.background': string;
  'activityBar.foreground': string;
  
  // Status Bar
  'statusBar.background': string;
  'statusBar.foreground': string;
  
  // Tabs
  'tab.activeBackground': string;
  'tab.inactiveBackground': string;
  
  // Panel
  'panel.background': string;
  'panel.border': string;
  
  // Input
  'input.background': string;
  'input.border': string;
  
  // Button
  'button.background': string;
  'button.foreground': string;
  
  // AI Panel
  'ai.userMessage': string;
  'ai.assistantMessage': string;
  'ai.codeBlock': string;
}

// Themes incluídos:
const BUILT_IN_THEMES = [
  'Dark Modern', // Default
  'Light Modern',
  'High Contrast',
  'Monokai',
  'Dracula',
  'Nord',
];
```

---

## 7. STATE MANAGEMENT

```typescript
// Zustand store structure
interface WorkbenchState {
  // Layout
  layout: {
    sidebarCollapsed: boolean;
    sidebarWidth: number;
    aiPanelCollapsed: boolean;
    aiPanelWidth: number;
    bottomPanelCollapsed: boolean;
    bottomPanelHeight: number;
  };
  
  // Editor
  editor: {
    tabs: EditorTab[];
    activeTabId: string | null;
    settings: EditorConfig;
  };
  
  // Files
  files: {
    tree: FileTreeNode;
    openFiles: Map<string, string>; // path -> content
    dirty: Set<string>;
  };
  
  // Terminal
  terminal: {
    terminals: Terminal[];
    activeTerminalId: string | null;
  };
  
  // AI
  ai: {
    mode: 'chat' | 'agent';
    messages: AIMessage[];
    isLoading: boolean;
  };
  
  // Project
  project: {
    id: string;
    name: string;
    type: ProjectType;
    settings: ProjectSettings;
  };
  
  // Actions
  actions: WorkbenchActions;
}
```

---

## 8. API INTEGRATION

### 8.1 File System API

```typescript
interface FileSystemAPI {
  // Read
  readFile(path: string): Promise<string>;
  readDir(path: string): Promise<FileTreeNode[]>;
  
  // Write
  writeFile(path: string, content: string): Promise<void>;
  createFile(path: string): Promise<void>;
  createDir(path: string): Promise<void>;
  
  // Delete
  deleteFile(path: string): Promise<void>;
  deleteDir(path: string): Promise<void>;
  
  // Move/Rename
  move(source: string, target: string): Promise<void>;
  rename(path: string, newName: string): Promise<void>;
  
  // Watch
  watch(path: string, callback: (event: FileEvent) => void): () => void;
}
```

### 8.2 Execution API

```typescript
interface ExecutionAPI {
  // Process
  spawn(command: string, args: string[], options?: SpawnOptions): Process;
  exec(command: string): Promise<ExecResult>;
  
  // Preview
  startPreview(): Promise<{ url: string; port: number }>;
  stopPreview(): Promise<void>;
  
  // Build
  build(options?: BuildOptions): Promise<BuildResult>;
  
  // Deploy
  deploy(options?: DeployOptions): Promise<DeployResult>;
}
```

### 8.3 AI API

```typescript
interface AIAPI {
  // Chat
  chat(messages: AIMessage[], options?: ChatOptions): AsyncIterable<string>;
  
  // Completion
  complete(prompt: string, context: AIContext): Promise<string>;
  
  // Actions
  explain(code: string): Promise<string>;
  refactor(code: string, instruction: string): Promise<string>;
  fix(code: string, error: string): Promise<string>;
  generateTest(code: string): Promise<string>;
  
  // Agent
  runAgent(task: string, options?: AgentOptions): AsyncIterable<AgentEvent>;
}
```

---

## 9. PERFORMANCE TARGETS

| Métrica | Target | Crítico |
|---------|--------|---------|
| Initial Load | <3s | <5s |
| Editor Ready | <500ms | <1s |
| File Open | <100ms | <300ms |
| Save | <50ms | <200ms |
| Preview Refresh | <100ms | <500ms |
| AI Autocomplete | <300ms | <500ms |
| AI Chat Response Start | <500ms | <1s |
| Terminal Response | <50ms | <100ms |
| Memory Usage | <500MB | <1GB |
| CPU Idle | <5% | <10% |

---

## 10. ACCESSIBILITY

```typescript
const ACCESSIBILITY_REQUIREMENTS = {
  // Keyboard navigation
  focusOrder: 'logical',
  skipLinks: true,
  ariaLabels: 'all interactive elements',
  
  // Screen readers
  announcements: true,
  liveRegions: ['status', 'errors', 'ai responses'],
  
  // Visual
  contrastRatio: 4.5, // WCAG AA
  focusIndicators: 'visible',
  reduceMotion: 'respect preference',
  
  // Font
  scalable: true,
  minFontSize: 12,
  maxFontSize: 24,
};
```

---

## PRÓXIMOS DOCUMENTOS

- `6_AI_SYSTEM_SPEC.md` - Sistema de AI detalhado
- `7_EXECUTION_PLAN.md` - Plano de execução
