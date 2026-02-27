# 🏗️ ARQUITETURA TÉCNICA - AETHEL ENGINE

**Versão:** 2.0.0  
**Última Atualização:** 20 de Janeiro de 2026

Este documento descreve a arquitetura técnica completa do Aethel Engine, servindo como referência para desenvolvedores e arquitetos.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura de Alto Nível](#arquitetura-de-alto-nível)
3. [Frontend (Web App)](#frontend-web-app)
4. [Backend (APIs & Services)](#backend-apis--services)
5. [Motor de Jogo (Engine)](#motor-de-jogo-engine)
6. [Sistema de IA](#sistema-de-ia)
7. [Infraestrutura](#infraestrutura)
8. [Fluxos de Dados](#fluxos-de-dados)
9. [Decisões Arquiteturais](#decisões-arquiteturais)

---

## 🌟 Visão Geral

O Aethel Engine segue o paradigma **"Cloud Brain, Local Muscle"**:

- **Cloud Brain:** Orquestração, IA, colaboração, storage centralizado
- **Local Muscle:** Renderização WebGL, física WASM, processamento GPU

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AETHEL ENGINE v2.0                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   BROWSER (Client)                      CLOUD (Server)                  │
│   ─────────────────                     ──────────────                  │
│   • Next.js App (SSR)                   • API Routes (Next.js)          │
│   • Monaco Editor                       • WebSocket Server              │
│   • Three.js Renderer                   • Redis (Queue/Cache)           │
│   • Rapier WASM Physics                 • PostgreSQL (Data)             │
│   • Web Audio API                       • S3/MinIO (Assets)             │
│                                         • AI Providers (OpenAI, etc)    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🏛️ Arquitetura de Alto Nível

### Diagrama de Componentes

```
                              ┌─────────────────┐
                              │   CDN (Assets)  │
                              └────────┬────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                                      │                    LOAD BALANCER     │
│                          ┌───────────┴───────────┐                          │
│                          │    Nginx / Traefik    │                          │
│                          └───────────┬───────────┘                          │
│                                      │                                      │
│           ┌──────────────────────────┼──────────────────────────┐           │
│           │                          │                          │           │
│   ┌───────▼───────┐          ┌───────▼───────┐          ┌───────▼───────┐   │
│   │  Web App      │          │  WebSocket    │          │  Worker       │   │
│   │  (Next.js)    │          │  Server       │          │  (Jobs)       │   │
│   │  Port: 3000   │          │  Port: 3001   │          │  Internal     │   │
│   └───────┬───────┘          └───────┬───────┘          └───────┬───────┘   │
│           │                          │                          │           │
│           └──────────────────────────┼──────────────────────────┘           │
│                                      │                                      │
│                          ┌───────────▼───────────┐                          │
│                          │    Service Layer      │                          │
│                          └───────────┬───────────┘                          │
│                                      │                                      │
│           ┌──────────────────────────┼──────────────────────────┐           │
│           │                          │                          │           │
│   ┌───────▼───────┐          ┌───────▼───────┐          ┌───────▼───────┐   │
│   │  PostgreSQL   │          │    Redis      │          │   S3/MinIO    │   │
│   │  (Metadata)   │          │ (Cache/Queue) │          │   (Assets)    │   │
│   └───────────────┘          └───────────────┘          └───────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                   KUBERNETES CLUSTER
```

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| **Frontend** | Next.js | 14.x |
| **UI** | React + Tailwind CSS | 18.x / 3.x |
| **Editor** | Monaco Editor | latest |
| **3D** | Three.js | r160+ |
| **Física** | Rapier (WASM) | 0.12+ |
| **Estado** | Zustand + SWR | 4.x / 2.x |
| **Backend** | Next.js API Routes | 14.x |
| **WebSocket** | Yjs + y-websocket | 13.x |
| **Database** | PostgreSQL | 16 |
| **ORM** | Prisma | 5.x |
| **Cache** | Redis | 7 |
| **Storage** | S3/MinIO | - |
| **Auth** | NextAuth.js | 4.x |
| **Container** | Docker | 24+ |
| **Orchestration** | Kubernetes | 1.28+ |

---

## 📱 Frontend (Web App)

### Estrutura de Diretórios

```
cloud-web-app/web/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rotas de autenticação
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/              # Rotas protegidas
│   │   ├── projects/
│   │   ├── settings/
│   │   └── layout.tsx
│   ├── (editor)/                 # IDE principal
│   │   └── [projectId]/
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── ai/
│   │   └── jobs/
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # Componentes base (Button, Input, etc)
│   ├── editor/                   # Componentes do editor
│   ├── ai/                       # Componentes de IA
│   ├── multiplayer/              # Componentes multiplayer
│   └── dashboard/                # Componentes do dashboard
└── lib/
    ├── physics-engine-real.ts    # Rapier WASM wrapper
    ├── aaa-render-system.ts      # Three.js renderer
    ├── networking-multiplayer.ts # WebRTC + netcode
    ├── gameplay-ability-system.ts # GAS implementation
    ├── ai-agent-system.ts        # Sistema de agentes IA
    └── translations.ts           # i18n (PT-BR/EN)
```

### Padrões de Componentes

```tsx
// Componente típico com hooks e estado
'use client';

import { useProject } from '@/lib/hooks/use-project';
import { useTranslation } from '@/lib/hooks/use-translation';

interface EditorPanelProps {
  projectId: string;
  onSave: () => void;
}

export function EditorPanel({ projectId, onSave }: EditorPanelProps) {
  const { project, isLoading, error } = useProject(projectId);
  const { t } = useTranslation();

  if (isLoading) return <EditorSkeleton />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <EditorToolbar onSave={onSave} />
      <MonacoEditor value={project.code} />
    </div>
  );
}
```

### Sistema de Estado

```tsx
// Zustand store para estado global
import { create } from 'zustand';

interface EditorState {
  activeFile: string | null;
  openFiles: string[];
  isDirty: boolean;
  
  setActiveFile: (file: string) => void;
  openFile: (file: string) => void;
  closeFile: (file: string) => void;
  setDirty: (dirty: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeFile: null,
  openFiles: [],
  isDirty: false,
  
  setActiveFile: (file) => set({ activeFile: file }),
  openFile: (file) => set((state) => ({
    openFiles: [...new Set([...state.openFiles, file])],
    activeFile: file,
  })),
  closeFile: (file) => set((state) => ({
    openFiles: state.openFiles.filter(f => f !== file),
    activeFile: state.activeFile === file ? state.openFiles[0] : state.activeFile,
  })),
  setDirty: (dirty) => set({ isDirty: dirty }),
}));
```

---

## 🖥️ Backend (APIs & Services)

### API Routes Structure

```
app/api/
├── auth/
│   ├── login/route.ts         # POST - Login
│   ├── register/route.ts      # POST - Registro
│   ├── logout/route.ts        # POST - Logout
│   └── [...nextauth]/route.ts # NextAuth handlers
├── projects/
│   ├── route.ts               # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts           # GET, PUT, DELETE
│       ├── files/route.ts     # File operations
│       └── export/route.ts    # Export project
├── ai/
│   ├── agent/route.ts         # AI agent execution
│   ├── generate/route.ts      # Code generation
│   └── chat/route.ts          # Chat completions
├── jobs/
│   ├── route.ts               # GET (list), POST (create)
│   ├── stats/route.ts         # GET stats
│   ├── start/route.ts         # POST start queue
│   ├── stop/route.ts          # POST stop queue
│   └── [id]/
│       ├── route.ts           # GET, DELETE
│       ├── retry/route.ts     # POST retry
│       └── cancel/route.ts    # POST cancel
└── health/route.ts            # Health check
```

### Padrão de API Route

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  template: z.enum(['blank', '2d-platformer', '3d-fps']).default('blank'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = CreateProjectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Sistema de Jobs (Background Tasks)

```typescript
// lib/persistent-job-queue.ts
import Redis from 'ioredis';

interface Job {
  id: string;
  type: 'build' | 'export' | 'ai-generate' | 'backup';
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
}

export class JobQueue {
  private redis: Redis;
  private readonly queueKey = 'aethel:jobs';

  async enqueue(job: Omit<Job, 'id' | 'status' | 'createdAt' | 'attempts'>): Promise<string> {
    const id = crypto.randomUUID();
    const fullJob: Job = {
      ...job,
      id,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
    };

    await this.redis.zadd(this.queueKey, job.priority, JSON.stringify(fullJob));
    return id;
  }

  async process(handler: (job: Job) => Promise<void>): Promise<void> {
    const [result] = await this.redis.zpopmin(this.queueKey);
    if (!result) return;

    const job: Job = JSON.parse(result);
    job.status = 'processing';
    job.attempts++;

    try {
      await handler(job);
      job.status = 'completed';
    } catch (error) {
      job.status = job.attempts >= job.maxAttempts ? 'failed' : 'pending';
      if (job.status === 'pending') {
        await this.redis.zadd(this.queueKey, job.priority + 10, JSON.stringify(job));
      }
    }
  }
}
```

---

## 🎮 Motor de Jogo (Engine)

### Componentes Core

```
lib/
├── physics-engine-real.ts     # Física (Rapier WASM)
├── aaa-render-system.ts       # Renderização (Three.js)
├── game-loop.ts               # Loop de jogo
├── ecs-dots-system.ts         # Entity Component System
├── gameplay-ability-system.ts # Sistema de habilidades
├── networking-multiplayer.ts  # Multiplayer
└── ai-agent-system.ts         # IA de NPCs
```

### Sistema de Física (Rapier WASM)

```typescript
// lib/physics-engine-real.ts
import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  private world: RAPIER.World;
  private bodies: Map<string, RAPIER.RigidBody> = new Map();

  async initialize(gravity: { x: number; y: number; z: number }) {
    await RAPIER.init();
    this.world = new RAPIER.World(gravity);
  }

  createRigidBody(id: string, config: RigidBodyConfig): void {
    const bodyDesc = config.type === 'dynamic'
      ? RAPIER.RigidBodyDesc.dynamic()
      : RAPIER.RigidBodyDesc.fixed();

    bodyDesc.setTranslation(config.position.x, config.position.y, config.position.z);
    
    const body = this.world.createRigidBody(bodyDesc);
    this.bodies.set(id, body);

    // Add collider
    const colliderDesc = this.createColliderDesc(config.collider);
    this.world.createCollider(colliderDesc, body);
  }

  step(deltaTime: number): void {
    this.world.timestep = deltaTime;
    this.world.step();
  }

  getBodyTransform(id: string): { position: Vector3; rotation: Quaternion } | null {
    const body = this.bodies.get(id);
    if (!body) return null;

    const pos = body.translation();
    const rot = body.rotation();
    return {
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
    };
  }
}
```

### Sistema de Renderização

```typescript
// lib/aaa-render-system.ts
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';

export class AAARenderer {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  constructor(canvas: HTMLCanvasElement, config: RenderConfig) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: config.quality !== 'low',
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(
      config.quality === 'high' ? window.devicePixelRatio : 1
    );
    this.renderer.shadowMap.enabled = config.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.setupPostProcessing(config);
  }

  private setupPostProcessing(config: RenderConfig): void {
    this.composer = new EffectComposer(this.renderer);
    
    if (config.bloom) {
      this.composer.addPass(new UnrealBloomPass(/* ... */));
    }
    if (config.ssao) {
      this.composer.addPass(new SSAOPass(/* ... */));
    }
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.composer.render();
  }
}
```

### Gameplay Ability System (GAS)

```typescript
// lib/gameplay-ability-system.ts

export interface GameplayAbility {
  id: string;
  name: string;
  cooldown: number;
  cost: { resource: string; amount: number };
  tags: string[];
  canActivate: (context: AbilityContext) => boolean;
  activate: (context: AbilityContext) => Promise<void>;
}

export interface GameplayEffect {
  id: string;
  duration: number;
  modifiers: AttributeModifier[];
  tags: string[];
  onApply?: (target: Entity) => void;
  onRemove?: (target: Entity) => void;
  onTick?: (target: Entity, deltaTime: number) => void;
}

export class AbilitySystemComponent {
  private abilities: Map<string, GameplayAbility> = new Map();
  private activeEffects: GameplayEffect[] = [];
  private cooldowns: Map<string, number> = new Map();

  grantAbility(ability: GameplayAbility): void {
    this.abilities.set(ability.id, ability);
  }

  async tryActivateAbility(abilityId: string, context: AbilityContext): Promise<boolean> {
    const ability = this.abilities.get(abilityId);
    if (!ability) return false;

    // Check cooldown
    if (this.cooldowns.get(abilityId) > 0) return false;

    // Check conditions
    if (!ability.canActivate(context)) return false;

    // Activate
    await ability.activate(context);
    this.cooldowns.set(abilityId, ability.cooldown);
    return true;
  }

  applyEffect(effect: GameplayEffect, target: Entity): void {
    this.activeEffects.push({ ...effect, startTime: Date.now() });
    effect.onApply?.(target);
  }

  tick(deltaTime: number): void {
    // Update cooldowns
    for (const [id, cooldown] of this.cooldowns) {
      this.cooldowns.set(id, Math.max(0, cooldown - deltaTime));
    }

    // Update effects
    const now = Date.now();
    this.activeEffects = this.activeEffects.filter(effect => {
      effect.onTick?.(this.owner, deltaTime);
      return now - effect.startTime < effect.duration * 1000;
    });
  }
}
```

---

## 🤖 Sistema de IA

### Arquitetura Multi-Agent

```typescript
// lib/ai-agent-system.ts

export type AgentRole = 'coder' | 'artist' | 'qa' | 'pm' | 'docs';

export interface AIAgent {
  id: string;
  role: AgentRole;
  model: string;
  systemPrompt: string;
  tools: AITool[];
}

export class AgentOrchestrator {
  private agents: Map<AgentRole, AIAgent> = new Map();

  async executeTask(task: AgentTask): Promise<AgentResult> {
    const agent = this.selectAgent(task.type);
    
    const messages = [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: task.prompt },
    ];

    const response = await this.callLLM(agent.model, messages, agent.tools);
    
    // Handle tool calls
    while (response.toolCalls?.length > 0) {
      for (const call of response.toolCalls) {
        const result = await this.executeTool(call);
        messages.push({ role: 'tool', content: result, toolCallId: call.id });
      }
      response = await this.callLLM(agent.model, messages, agent.tools);
    }

    return { content: response.content, agent: agent.role };
  }

  private selectAgent(taskType: string): AIAgent {
    switch (taskType) {
      case 'code': return this.agents.get('coder')!;
      case 'asset': return this.agents.get('artist')!;
      case 'test': return this.agents.get('qa')!;
      case 'plan': return this.agents.get('pm')!;
      default: return this.agents.get('coder')!;
    }
  }
}
```

### Ferramentas Disponíveis

```typescript
// lib/ai-tools-registry.ts

export const AI_TOOLS: AITool[] = [
  {
    name: 'read_file',
    description: 'Lê o conteúdo de um arquivo do projeto',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Caminho do arquivo' },
      },
      required: ['path'],
    },
    execute: async ({ path }) => {
      return await readProjectFile(path);
    },
  },
  {
    name: 'write_file',
    description: 'Escreve conteúdo em um arquivo',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['path', 'content'],
    },
    execute: async ({ path, content }) => {
      await writeProjectFile(path, content);
      return 'File written successfully';
    },
  },
  {
    name: 'run_command',
    description: 'Executa um comando no terminal (sandbox)',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string' },
      },
      required: ['command'],
    },
    execute: async ({ command }) => {
      return await runInSandbox(command);
    },
  },
];
```

---

## 🐳 Infraestrutura

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: ./cloud-web-app/web
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://aethel:secret@postgres:5432/aethel_db
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
```

### Kubernetes (Production)

```yaml
# infra/k8s/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aethel-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aethel-web
  template:
    metadata:
      labels:
        app: aethel-web
    spec:
      containers:
        - name: web
          image: aethel/web:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

---

## 🔄 Fluxos de Dados

### Fluxo de Autenticação

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Browser │───▶│ NextAuth│───▶│ Provider│───▶│ Database│
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     │  1. Login    │              │              │
     │──────────────▶              │              │
     │              │  2. OAuth    │              │
     │              │──────────────▶              │
     │              │  3. Token    │              │
     │              │◀──────────────              │
     │              │        4. Save Session      │
     │              │─────────────────────────────▶
     │  5. JWT      │              │              │
     │◀──────────────              │              │
```

### Fluxo de Colaboração Real-time

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ User A  │    │WebSocket│    │  Yjs    │    │ User B  │
└─────────┘    │ Server  │    │  CRDT   │    └─────────┘
     │         └─────────┘    └─────────┘         │
     │  1. Edit  │              │                 │
     │───────────▶              │                 │
     │           │  2. Sync     │                 │
     │           │──────────────▶                 │
     │           │  3. Merge    │                 │
     │           │◀──────────────                 │
     │           │              │  4. Broadcast   │
     │           │──────────────────────────────▶ │
     │           │              │                 │
```

---

## 🎯 Decisões Arquiteturais

### ADR-001: Next.js App Router

**Contexto:** Precisamos de SSR, API routes, e excelente DX.

**Decisão:** Usar Next.js 14 com App Router.

**Consequências:**
- ✅ SSR/SSG flexível
- ✅ API routes integradas
- ✅ Streaming e React Server Components
- ⚠️ Curva de aprendizado para novos padrões

### ADR-002: Rapier para Física

**Contexto:** Física em TypeScript puro é lenta para jogos complexos.

**Decisão:** Usar Rapier.js (WASM) para física.

**Consequências:**
- ✅ Performance ~10x melhor
- ✅ Simulação determinística
- ✅ SIMD quando disponível
- ⚠️ Bundle size aumenta ~500KB

### ADR-003: PostgreSQL + Redis

**Contexto:** Precisamos de storage relacional e cache/queue.

**Decisão:** PostgreSQL para dados, Redis para cache e filas.

**Consequências:**
- ✅ ACID para dados críticos
- ✅ Pub/sub para real-time
- ✅ Filas de jobs eficientes
- ⚠️ Dois sistemas para manter

---

## 📚 Referências

- [Next.js Documentation](https://nextjs.org/docs)
- [Three.js Documentation](https://threejs.org/docs)
- [Rapier Physics](https://rapier.rs)
- [Prisma ORM](https://www.prisma.io/docs)
- [Yjs CRDT](https://yjs.dev)

---

**Última atualização:** 20 de Janeiro de 2026
