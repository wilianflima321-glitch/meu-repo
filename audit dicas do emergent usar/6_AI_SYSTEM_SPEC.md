# AI_SYSTEM_SPEC.md
## Especificação do Sistema de IA Nativo
**Data:** Janeiro 2026  
**Versão:** 1.0  
**Status:** Contrato de Execução

---

## 1. VISÃO GERAL

O sistema de IA não é um widget ou extensão - é **parte core** da plataforma, integrado em todos os níveis:
- **L1: Inline** - Autocomplete, sugestões
- **L2: Chat** - Assistente conversacional
- **L3: Actions** - Comandos específicos (fix, refactor, test)
- **L4: Agent** - Execução autônoma de tasks
- **L5: Multi-Agent** - Agents paralelos especializados

---

## 2. ARQUITETURA

### 2.1 Diagrama de Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WORKBENCH (Frontend)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Inline     │  │    Chat      │  │   Actions    │  │    Agent    │ │
│  │  Suggestions │  │    Panel     │  │   (Ctrl+K)   │  │    Mode     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                 │                 │        │
│  ┌──────▼─────────────────▼─────────────────▼─────────────────▼──────┐ │
│  │                      AI Context Manager                           │ │
│  │  • Current file • Selection • Project tree • Errors • History    │ │
│  └───────────────────────────────┬───────────────────────────────────┘ │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │ WebSocket / REST
┌──────────────────────────────────▼─────────────────────────────────────┐
│                         AI SERVICE (Backend)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │  Prompt Engine  │  │  Model Router   │  │   Agent Orchestrator    │ │
│  │  • Templates    │  │  • OpenAI       │  │  • Task decomposition   │ │
│  │  • Context      │  │  • Anthropic    │  │  • Parallel execution   │ │
│  │  • Compression  │  │  • Gemini       │  │  • Result synthesis     │ │
│  └────────┬────────┘  └────────┬────────┘  └───────────┬─────────────┘ │
│           │                    │                       │               │
│  ┌────────▼────────────────────▼───────────────────────▼─────────────┐ │
│  │                         RAG System                                │ │
│  │  • Project embeddings • Documentation • Error patterns            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes Core

| Componente | Responsabilidade | Tecnologia |
|------------|-----------------|------------|
| **AI Context Manager** | Coleta e organiza contexto | Frontend (React) |
| **Prompt Engine** | Constrói prompts otimizados | Backend (Python) |
| **Model Router** | Seleciona e chama modelos | Backend (Python) |
| **Agent Orchestrator** | Gerencia agents e tasks | Backend (Python) |
| **RAG System** | Busca contexto relevante | Vector DB (Pinecone/Qdrant) |

---

## 3. NÍVEIS DE INTEGRAÇÃO

### 3.1 L1: Inline Suggestions (Autocomplete)

```typescript
interface InlineSuggestion {
  text: string;
  range: Range;
  confidence: number;
  source: 'ai' | 'snippets' | 'history';
}

interface InlineConfig {
  enabled: boolean;
  triggerCharacters: string[]; // ['.', '(', ' ', '\n']
  delay: number; // ms before triggering
  maxTokens: number; // limit response size
  contextLines: number; // lines before/after cursor
}

// Comportamento:
// 1. User types
// 2. After delay, gather context (current file, imports, types)
// 3. Send to AI
// 4. Display ghost text
// 5. Tab to accept, Esc to dismiss

// API Backend
interface AutocompleteRequest {
  prefix: string; // code before cursor
  suffix: string; // code after cursor
  language: string;
  filepath: string;
  projectContext?: string[]; // relevant files
}

interface AutocompleteResponse {
  suggestion: string;
  confidence: number;
}
```

### 3.2 L2: Chat Panel

```typescript
interface ChatPanel {
  messages: ChatMessage[];
  input: string;
  isStreaming: boolean;
  context: ChatContext;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  
  // Rich content
  codeBlocks?: CodeBlock[];
  actions?: MessageAction[];
  references?: FileReference[];
  
  // Metadata
  model?: string;
  tokens?: { input: number; output: number };
}

interface CodeBlock {
  language: string;
  code: string;
  filepath?: string;
  diff?: boolean; // show as diff
}

interface MessageAction {
  type: 'apply' | 'copy' | 'insert' | 'explain' | 'retry';
  label: string;
  data?: any;
}

interface FileReference {
  path: string;
  lines?: [number, number];
}

// Chat features:
const CHAT_FEATURES = {
  streaming: true,
  multiTurn: true,
  contextAware: true,
  codeExecution: false, // safety
  fileEditing: true, // via apply action
  imageUpload: false, // v2
};
```

### 3.3 L3: Quick Actions (Ctrl+K)

```typescript
interface QuickActionModal {
  isOpen: boolean;
  mode: 'prompt' | 'action';
  selectedAction?: QuickAction;
  customPrompt?: string;
  selection?: Selection;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  prompt: string | ((selection: string) => string);
}

// Built-in actions:
const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'explain',
    label: 'Explain Code',
    description: 'Get an explanation of the selected code',
    icon: <BookOpen />,
    shortcut: 'E',
    prompt: (code) => `Explain this code:\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    id: 'refactor',
    label: 'Refactor',
    description: 'Improve code structure and readability',
    icon: <Wand />,
    shortcut: 'R',
    prompt: (code) => `Refactor this code for better readability and maintainability:\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    id: 'fix',
    label: 'Fix Issues',
    description: 'Fix bugs and errors in the code',
    icon: <Bug />,
    shortcut: 'F',
    prompt: (code) => `Fix any bugs or issues in this code:\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    id: 'optimize',
    label: 'Optimize',
    description: 'Improve performance',
    icon: <Zap />,
    shortcut: 'O',
    prompt: (code) => `Optimize this code for better performance:\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    id: 'document',
    label: 'Add Documentation',
    description: 'Generate comments and documentation',
    icon: <FileText />,
    shortcut: 'D',
    prompt: (code) => `Add comprehensive documentation to this code:\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    id: 'test',
    label: 'Generate Tests',
    description: 'Create unit tests for the code',
    icon: <TestTube />,
    shortcut: 'T',
    prompt: (code) => `Generate comprehensive unit tests for this code:\n\`\`\`\n${code}\n\`\`\``,
  },
  {
    id: 'types',
    label: 'Add Types',
    description: 'Add TypeScript types',
    icon: <Type />,
    shortcut: 'Y',
    prompt: (code) => `Add TypeScript types to this code:\n\`\`\`\n${code}\n\`\`\``,
  },
];

// UX Flow:
// 1. User selects code
// 2. Presses Ctrl+K
// 3. Modal opens with actions
// 4. User picks action or types custom prompt
// 5. AI processes
// 6. Result shown with Apply/Copy buttons
// 7. Apply replaces selection
```

### 3.4 L4: Agent Mode

```typescript
interface AgentMode {
  isActive: boolean;
  currentTask: AgentTask | null;
  history: AgentTask[];
  config: AgentConfig;
}

interface AgentTask {
  id: string;
  prompt: string;
  status: 'pending' | 'planning' | 'executing' | 'reviewing' | 'complete' | 'failed';
  plan?: AgentPlan;
  steps: AgentStep[];
  result?: AgentResult;
  startedAt: Date;
  completedAt?: Date;
}

interface AgentPlan {
  summary: string;
  steps: PlannedStep[];
  estimatedTime: number; // seconds
  filesToModify: string[];
  risks?: string[];
}

interface PlannedStep {
  id: string;
  description: string;
  type: 'read' | 'write' | 'create' | 'delete' | 'run' | 'test';
  target?: string; // file path or command
}

interface AgentStep {
  id: string;
  plannedStep: PlannedStep;
  status: 'pending' | 'running' | 'complete' | 'failed';
  output?: string;
  error?: string;
  diff?: FileDiff;
}

interface AgentConfig {
  autoApprove: boolean; // auto-apply changes
  maxSteps: number; // limit iterations
  timeout: number; // max execution time
  allowDelete: boolean; // safety flag
  allowRun: boolean; // allow shell commands
}

// Agent capabilities:
const AGENT_CAPABILITIES = [
  'read_file',
  'write_file',
  'create_file',
  'delete_file', // if allowed
  'search_codebase',
  'run_command', // if allowed
  'run_tests',
  'fix_errors',
  'refactor_multi_file',
  'generate_code',
];

// UX Flow:
// 1. User enters high-level task
// 2. Agent creates plan (shown to user)
// 3. User approves/modifies plan
// 4. Agent executes step by step
// 5. Each step shows progress
// 6. User can pause/stop anytime
// 7. Final review before apply
```

### 3.5 L5: Multi-Agent (Avançado)

```typescript
interface MultiAgentSystem {
  agents: SpecializedAgent[];
  orchestrator: Orchestrator;
  tasks: ParallelTask[];
}

interface SpecializedAgent {
  id: string;
  type: AgentType;
  status: 'idle' | 'working' | 'waiting';
  currentTask?: AgentTask;
}

type AgentType = 
  | 'frontend' // UI/UX, React, CSS
  | 'backend'  // API, database, logic
  | 'testing'  // Tests, QA
  | 'security' // Security review
  | 'docs'     // Documentation
  | 'devops';  // CI/CD, deployment

interface Orchestrator {
  decompose(task: string): SubTask[];
  assign(subtask: SubTask): SpecializedAgent;
  synthesize(results: AgentResult[]): FinalResult;
  resolve(conflicts: Conflict[]): Resolution;
}

// Exemplo de uso:
// Task: "Add user authentication"
// 
// Orchestrator decomposes:
// 1. Frontend Agent: Login/Register UI
// 2. Backend Agent: Auth API, JWT
// 3. Testing Agent: Auth tests
// 4. Security Agent: Review implementation
// 5. Docs Agent: Update README
//
// All run in parallel where possible
// Orchestrator merges results
// User reviews final diff
```

---

## 4. CONTEXT MANAGEMENT

### 4.1 Context Sources

```typescript
interface AIContext {
  // Immediate context
  currentFile: FileContext;
  selection?: SelectionContext;
  cursor: CursorContext;
  
  // Project context
  projectStructure: ProjectStructure;
  relevantFiles: RelevantFile[];
  dependencies: Dependency[];
  
  // Error context
  diagnostics: Diagnostic[];
  recentErrors: Error[];
  
  // History context
  recentEdits: Edit[];
  recentChats: ChatMessage[];
  
  // User context
  preferences: UserPreferences;
}

interface FileContext {
  path: string;
  language: string;
  content: string;
  imports: string[];
  exports: string[];
  symbols: Symbol[]; // functions, classes, variables
}

interface RelevantFile {
  path: string;
  reason: 'import' | 'similar' | 'related' | 'recent';
  relevance: number; // 0-1
  summary?: string;
}
```

### 4.2 Context Compression

```typescript
// Estratégias para caber no context window

interface ContextCompressor {
  // Priorizar
  prioritize(files: FileContext[]): FileContext[];
  
  // Resumir
  summarize(file: FileContext): string;
  
  // Truncar
  truncate(content: string, maxTokens: number): string;
  
  // Selecionar
  selectRelevant(
    query: string, 
    candidates: FileContext[], 
    maxFiles: number
  ): FileContext[];
}

// Implementação:
const CONTEXT_BUDGET = {
  currentFile: 4000, // tokens
  selection: 2000,
  relevantFiles: 8000, // total for all
  projectStructure: 500,
  errors: 500,
  history: 1000,
  total: 16000, // leave room for response
};
```

---

## 5. PROMPT ENGINEERING

### 5.1 System Prompts

```typescript
const SYSTEM_PROMPTS = {
  autocomplete: `You are a code completion assistant. Complete the code naturally.
Rules:
- Only output the completion, no explanations
- Match the existing code style
- Be concise but complete
- If unsure, provide the most likely completion`,

  chat: `You are a helpful coding assistant in an IDE.
Rules:
- Be concise and direct
- Provide code examples when helpful
- Use markdown for formatting
- Reference file paths when discussing code
- Ask clarifying questions if needed`,

  actions: {
    explain: `Explain the following code clearly and concisely.
Include:
- What the code does
- Key concepts used
- Any potential issues`,

    refactor: `Refactor the following code.
Goals:
- Improve readability
- Follow best practices
- Maintain functionality
- Add comments if helpful`,

    fix: `Fix any bugs or issues in the following code.
Include:
- What was wrong
- What you fixed
- The corrected code`,

    test: `Generate comprehensive tests for the following code.
Include:
- Unit tests for each function
- Edge cases
- Use appropriate testing framework`,
  },

  agent: `You are an AI coding agent with the ability to:
- Read and write files
- Run commands
- Search the codebase
- Fix errors

Rules:
- Always explain your plan before acting
- Make minimal necessary changes
- Test your changes
- Be careful with deletions
- Ask for confirmation on risky operations`,
};
```

### 5.2 Prompt Templates

```typescript
interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    name: 'code_completion',
    template: `<|file_context|>
{fileContext}
</|file_context|>

<|current_code|>
{prefix}<|cursor|>{suffix}
</|current_code|>

Complete the code at <|cursor|>:`,
    variables: ['fileContext', 'prefix', 'suffix'],
  },
  {
    name: 'code_action',
    template: `<|context|>
File: {filepath}
Language: {language}
</|context|>

<|selected_code|>
{code}
</|selected_code|>

<|instruction|>
{instruction}
</|instruction|>

Provide the modified code:`,
    variables: ['filepath', 'language', 'code', 'instruction'],
  },
  {
    name: 'agent_plan',
    template: `<|project_structure|>
{projectStructure}
</|project_structure|>

<|task|>
{task}
</|task|>

Create a step-by-step plan to accomplish this task.
For each step, specify:
1. Action type (read/write/create/run)
2. Target (file path or command)
3. Description

Format as JSON:
{
  "summary": "...",
  "steps": [
    {"type": "...", "target": "...", "description": "..."}
  ]
}`,
    variables: ['projectStructure', 'task'],
  },
];
```

---

## 6. MODEL CONFIGURATION

### 6.1 Model Router

```typescript
interface ModelConfig {
  id: string;
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  streaming: boolean;
}

// Modelo por use case:
const MODEL_ROUTING: Record<string, ModelConfig> = {
  autocomplete: {
    id: 'autocomplete',
    provider: 'openai',
    model: 'gpt-4o-mini', // Fast, cheap
    maxTokens: 256,
    temperature: 0.2, // Low for determinism
    streaming: false,
  },
  
  chat: {
    id: 'chat',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet', // Good reasoning
    maxTokens: 4096,
    temperature: 0.7,
    streaming: true,
  },
  
  actions: {
    id: 'actions',
    provider: 'openai',
    model: 'gpt-4o', // Good code output
    maxTokens: 2048,
    temperature: 0.3,
    streaming: true,
  },
  
  agent: {
    id: 'agent',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet', // Best reasoning
    maxTokens: 8192,
    temperature: 0.5,
    streaming: true,
  },
};
```

### 6.2 Fallback Strategy

```typescript
interface FallbackStrategy {
  primary: ModelConfig;
  fallbacks: ModelConfig[];
  retries: number;
  timeout: number;
}

// Se modelo primário falha, usar fallback:
const FALLBACK_CHAIN = {
  'claude-3-5-sonnet': ['gpt-4o', 'gemini-pro'],
  'gpt-4o': ['claude-3-5-sonnet', 'gpt-4o-mini'],
  'gpt-4o-mini': ['claude-3-haiku', 'gemini-flash'],
};
```

---

## 7. RATE LIMITING & COSTS

### 7.1 Usage Limits

```typescript
interface UsageLimits {
  // Per minute
  autocompletePerMinute: number;
  chatMessagesPerMinute: number;
  actionsPerMinute: number;
  
  // Per day
  autocompletePerDay: number;
  chatMessagesPerDay: number;
  actionsPerDay: number;
  agentTasksPerDay: number;
  
  // Per month
  totalTokensPerMonth: number;
}

const USAGE_TIERS: Record<string, UsageLimits> = {
  free: {
    autocompletePerMinute: 20,
    chatMessagesPerMinute: 10,
    actionsPerMinute: 5,
    autocompletePerDay: 500,
    chatMessagesPerDay: 100,
    actionsPerDay: 50,
    agentTasksPerDay: 5,
    totalTokensPerMonth: 100000,
  },
  
  pro: {
    autocompletePerMinute: 100,
    chatMessagesPerMinute: 30,
    actionsPerMinute: 20,
    autocompletePerDay: 5000,
    chatMessagesPerDay: 500,
    actionsPerDay: 200,
    agentTasksPerDay: 50,
    totalTokensPerMonth: 1000000,
  },
  
  enterprise: {
    // Unlimited with fair use
    autocompletePerMinute: 200,
    chatMessagesPerMinute: 60,
    actionsPerMinute: 40,
    autocompletePerDay: -1, // unlimited
    chatMessagesPerDay: -1,
    actionsPerDay: -1,
    agentTasksPerDay: -1,
    totalTokensPerMonth: -1,
  },
};
```

### 7.2 Cost Estimation

```typescript
interface CostEstimate {
  operation: string;
  inputTokens: number;
  outputTokens: number;
  cost: number; // USD
}

// Estimativas de custo por operação:
const COST_PER_OPERATION = {
  autocomplete: 0.0001, // ~$0.0001 per completion
  chatMessage: 0.005,   // ~$0.005 per message
  action: 0.01,         // ~$0.01 per action
  agentStep: 0.02,      // ~$0.02 per step
};

// Custo mensal estimado por tier:
// Free: ~$5-10/user
// Pro: ~$20-50/user
// Enterprise: Custom
```

---

## 8. SECURITY

### 8.1 Data Handling

```typescript
const SECURITY_RULES = {
  // Nunca enviar para AI:
  excludeFromContext: [
    '.env',
    '*.key',
    '*.pem',
    '*.secret',
    'credentials.*',
    'secrets.*',
  ],
  
  // Redact patterns:
  redactPatterns: [
    /api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9]+['"]?/gi,
    /password\s*[:=]\s*['"]?[^'"]+['"]?/gi,
    /secret\s*[:=]\s*['"]?[^'"]+['"]?/gi,
    /token\s*[:=]\s*['"]?[a-zA-Z0-9]+['"]?/gi,
  ],
  
  // Rate limiting
  maxRequestsPerUser: 100, // per minute
  maxTokensPerRequest: 32000,
  
  // Audit
  logAllRequests: true,
  retainLogsFor: 30, // days
};
```

### 8.2 Code Execution Safety

```typescript
const EXECUTION_SAFETY = {
  // Agent pode executar:
  allowedCommands: [
    'npm',
    'yarn',
    'pnpm',
    'node',
    'python',
    'pip',
    'git',
    'ls',
    'cat',
    'grep',
    'find',
  ],
  
  // Agent NÃO pode executar:
  blockedCommands: [
    'rm -rf /',
    'sudo',
    'chmod',
    'chown',
    'curl | bash',
    'wget | bash',
  ],
  
  // Sandboxing
  sandbox: true,
  timeout: 60, // seconds
  memoryLimit: 512, // MB
  networkAccess: 'limited', // only allowed domains
};
```

---

## 9. METRICS & MONITORING

```typescript
interface AIMetrics {
  // Usage
  totalRequests: number;
  requestsPerOperation: Record<string, number>;
  tokensUsed: number;
  
  // Performance
  averageLatency: number;
  p50Latency: number;
  p99Latency: number;
  errorRate: number;
  
  // Quality
  acceptanceRate: number; // % of suggestions accepted
  chatSatisfaction: number; // if tracked
  agentSuccessRate: number;
  
  // Cost
  totalCost: number;
  costPerUser: number;
}

// Tracking events:
const TRACK_EVENTS = [
  'ai.autocomplete.show',
  'ai.autocomplete.accept',
  'ai.autocomplete.reject',
  'ai.chat.message',
  'ai.chat.codeBlock.apply',
  'ai.action.trigger',
  'ai.action.complete',
  'ai.agent.start',
  'ai.agent.step',
  'ai.agent.complete',
  'ai.agent.fail',
];
```

---

## 10. IMPLEMENTATION PHASES

### Phase 1: Foundation (P0)
- [ ] AI service backend
- [ ] Autocomplete (L1)
- [ ] Chat panel (L2)
- [ ] Basic actions (explain, fix)

### Phase 2: Power Features (P1)
- [ ] Full quick actions (L3)
- [ ] Single agent mode (L4)
- [ ] Context management
- [ ] RAG system basic

### Phase 3: Advanced (P2)
- [ ] Multi-agent (L5)
- [ ] Advanced RAG
- [ ] Custom prompts
- [ ] Usage analytics

### Phase 4: Scale (P3)
- [ ] Self-hosted models option
- [ ] Fine-tuned models
- [ ] Plugin system for AI

---

## PRÓXIMOS DOCUMENTOS

- `7_EXECUTION_PLAN.md` - Plano de execução completo
