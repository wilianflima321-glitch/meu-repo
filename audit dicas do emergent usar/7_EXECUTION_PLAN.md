# EXECUTION_PLAN.md
## Plano de Execução - Roadmap P0/P1/P2/P3
**Data:** Janeiro 2026  
**Versão:** 1.0  
**Status:** Contrato de Execução

---

## SUMÁRIO EXECUTIVO

Este documento define o plano de execução para construir a plataforma IDE AAA unificada. Organizado em prioridades P0 (crítico), P1 (importante), P2 (desejável) e P3 (futuro).

**Meta:** Entregar MVP funcional em 12 semanas, com iterações contínuas.

---

## 1. VISÃO GERAL DE FASES

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TIMELINE GERAL                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FASE 1 (P0)        FASE 2 (P1)        FASE 3 (P2)        FASE 4 (P3)  │
│  ─────────────      ─────────────      ─────────────      ───────────  │
│  Semanas 1-6        Semanas 7-12       Semanas 13-20      Semana 21+   │
│                                                                         │
│  • Workbench        • Agent Mode       • Viewport 3D      • Plugins    │
│  • Editor Monaco    • Collab Real-time • Timeline         • Marketplace│
│  • File System      • Multi-agent      • Templates        • Self-host  │
│  • Preview          • RAG System       • Mobile View      • Fine-tune  │
│  • AI Chat/Inline   • Git Integration  • Analytics                     │
│  • Terminal         • Deploy Custom                                    │
│  • Deploy Basic                                                        │
│                                                                         │
│  ████████████████   ████████████████   ████████████████   ████████████ │
│  MVP                 v1.0               v1.5               v2.0        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. P0 - CRÍTICO (MVP) - Semanas 1-6

### 2.1 Sprint 1-2: Foundation

#### Backend

| Task | Descrição | Estimativa | Owner |
|------|-----------|------------|-------|
| **API Base** | FastAPI setup com rotas básicas | 2d | Backend |
| **Auth Service** | JWT auth, login/register | 3d | Backend |
| **Project Service** | CRUD de projetos | 2d | Backend |
| **File Service** | CRUD de arquivos, S3 integration | 3d | Backend |
| **WebSocket** | Conexão real-time para preview | 2d | Backend |

```python
# Estrutura de rotas P0
/api/
├── /auth
│   ├── POST /register
│   ├── POST /login
│   └── GET /me
├── /projects
│   ├── GET /
│   ├── POST /
│   ├── GET /{id}
│   ├── PUT /{id}
│   └── DELETE /{id}
├── /files
│   ├── GET /{project_id}/tree
│   ├── GET /{project_id}/file/{path}
│   ├── PUT /{project_id}/file/{path}
│   ├── POST /{project_id}/file
│   └── DELETE /{project_id}/file/{path}
└── /ws
    └── /{project_id}
```

#### Frontend

| Task | Descrição | Estimativa | Owner |
|------|-----------|------------|-------|
| **Shell Layout** | Grid layout do Workbench | 2d | Frontend |
| **Menu Bar** | Menus funcionais | 1d | Frontend |
| **Sidebar** | Activity bar + explorer | 2d | Frontend |
| **Status Bar** | Info básica | 1d | Frontend |
| **Theme System** | Dark/Light + CSS vars | 1d | Frontend |

```
Entregável Sprint 1-2:
✓ Layout funcional do Workbench
✓ Auth funcionando
✓ Lista de projetos
✓ Navegação básica
```

---

### 2.2 Sprint 3-4: Editor & Preview

#### Editor (Monaco)

| Task | Descrição | Estimativa | Owner |
|------|-----------|------------|-------|
| **Monaco Setup** | Integração @monaco-editor/react | 2d | Frontend |
| **Tab System** | Múltiplas tabs, dirty state | 2d | Frontend |
| **File Sync** | Load/save arquivos | 2d | Frontend |
| **Syntax Highlight** | Linguagens principais | 1d | Frontend |
| **Keyboard Shortcuts** | VS Code-like | 1d | Frontend |

```typescript
// Configuração Monaco P0
const MONACO_CONFIG = {
  languages: ['javascript', 'typescript', 'html', 'css', 'json', 'python', 'markdown'],
  features: ['bracketMatching', 'folding', 'minimap', 'lineNumbers'],
  theme: 'vs-dark',
};
```

#### Preview

| Task | Descrição | Estimativa | Owner |
|------|-----------|------------|-------|
| **Preview Panel** | iframe sandboxed | 2d | Frontend |
| **Hot Reload** | WebSocket-based refresh | 2d | Backend |
| **Dev Server** | Vite/webpack no container | 3d | Backend |
| **Console** | Log capture do iframe | 1d | Frontend |

```
Entregável Sprint 3-4:
✓ Editor Monaco funcional
✓ Abrir/editar/salvar arquivos
✓ Preview web funcionando
✓ Hot reload básico
```

---

### 2.3 Sprint 5-6: AI & Terminal & Deploy

#### AI Integration

| Task | Descrição | Estimativa | Owner |
|------|-----------|------------|-------|
| **AI Service** | Endpoint para AI calls | 2d | Backend |
| **Chat Panel** | UI do chat | 2d | Frontend |
| **Streaming** | SSE para responses | 1d | Full-stack |
| **Autocomplete** | Inline suggestions | 3d | Full-stack |
| **Quick Actions** | Ctrl+K modal | 2d | Frontend |

```typescript
// AI Endpoints P0
POST /api/ai/chat       // Chat message
POST /api/ai/complete   // Autocomplete
POST /api/ai/action     // Quick actions (explain, fix, etc.)
```

#### Terminal

| Task | Descrição | Estimativa | Owner |
|------|-----------|------------|-------|
| **xterm.js Setup** | Terminal component | 1d | Frontend |
| **PTY Backend** | Shell no container | 2d | Backend |
| **WebSocket Conn** | Real-time I/O | 1d | Full-stack |

#### Deploy

| Task | Descrição | Estimativa | Owner |
|------|-----------|------------|-------|
| **Build Service** | npm build no container | 2d | Backend |
| **Deploy Service** | Push para storage + URL | 2d | Backend |
| **Deploy UI** | Button + progress | 1d | Frontend |

```
Entregável Sprint 5-6 (MVP):
✓ AI chat funcionando
✓ Autocomplete básico
✓ Terminal funcional
✓ Deploy one-click
✓ URL pública para projeto
```

---

### 2.4 Checklist MVP (P0)

```markdown
## MVP Checklist

### Auth & Projects
- [ ] Register/Login
- [ ] Create project
- [ ] List projects
- [ ] Delete project

### Workbench Layout
- [ ] Menu bar
- [ ] Sidebar (explorer)
- [ ] Main area (editor)
- [ ] Bottom panel (terminal)
- [ ] Status bar
- [ ] AI panel

### Editor
- [ ] Monaco integration
- [ ] Multiple tabs
- [ ] Save files (Ctrl+S)
- [ ] Syntax highlighting (JS, TS, HTML, CSS, Python)
- [ ] Line numbers
- [ ] Minimap

### File System
- [ ] Tree view
- [ ] Create file/folder
- [ ] Rename
- [ ] Delete
- [ ] Drag & drop

### Preview
- [ ] Web preview iframe
- [ ] Auto-refresh
- [ ] Device emulation (desktop/mobile)
- [ ] Console logs

### Terminal
- [ ] xterm.js
- [ ] Shell access
- [ ] Multiple terminals

### AI
- [ ] Chat panel
- [ ] Streaming responses
- [ ] Inline autocomplete
- [ ] Ctrl+K quick actions
- [ ] Explain code
- [ ] Fix errors

### Deploy
- [ ] Build project
- [ ] Deploy to URL
- [ ] Preview URL
```

---

## 3. P1 - IMPORTANTE - Semanas 7-12

### 3.1 Agent Mode

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **Agent Orchestrator** | Task planning, step execution | 5d |
| **Multi-file Editing** | Edit multiple files in sequence | 3d |
| **Progress UI** | Show agent steps | 2d |
| **Approval Flow** | User confirms changes | 2d |
| **Rollback** | Undo agent changes | 2d |

### 3.2 Colaboração Real-time

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **Yjs Integration** | CRDT para sync | 3d |
| **Awareness** | Cursores de outros usuários | 2d |
| **Presence** | Who's online | 1d |
| **Permissions** | Owner/Editor/Viewer | 2d |
| **Share Link** | Link público/privado | 1d |

### 3.3 Multi-Agent

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **Agent Types** | Frontend, Backend, Testing | 3d |
| **Parallel Execution** | Run agents simultaneously | 3d |
| **Result Merge** | Combine outputs | 2d |
| **Conflict Resolution** | Handle overlaps | 2d |

### 3.4 Git Integration

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **isomorphic-git** | Git in browser | 2d |
| **Git Panel** | Stage, commit, push UI | 3d |
| **GitHub Integration** | Clone, push to GitHub | 2d |
| **Branch Management** | Create, switch, merge | 2d |

### 3.5 RAG System

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **Embeddings** | Project file embeddings | 2d |
| **Vector Store** | Pinecone/Qdrant setup | 2d |
| **Context Retrieval** | Find relevant files | 2d |
| **Integration** | Use in AI prompts | 1d |

### 3.6 Command Palette

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **cmdk Integration** | Fuzzy search UI | 1d |
| **Command Registry** | All commands | 2d |
| **Recent Actions** | History | 1d |

---

## 4. P2 - DESEJÁVEL - Semanas 13-20

### 4.1 Viewport 3D (Three.js)

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **Three.js Setup** | Basic scene, camera, renderer | 2d |
| **Scene Panel** | Object hierarchy | 2d |
| **Transform Gizmos** | Move, rotate, scale | 2d |
| **Properties Panel** | Object properties | 2d |
| **Asset Import** | Load 3D models | 2d |

### 4.2 Timeline (Mídia)

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **Timeline Component** | Custom timeline UI | 3d |
| **Tracks** | Audio, video, keyframes | 3d |
| **Playback** | Play, pause, scrub | 2d |
| **Keyframes** | Basic animation | 2d |

### 4.3 Templates Marketplace

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **Template System** | Create from project | 2d |
| **Template Gallery** | Browse templates | 2d |
| **Categories** | Web, Game, API, etc. | 1d |

### 4.4 Analytics Dashboard

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **Usage Tracking** | Events, metrics | 2d |
| **Dashboard UI** | Charts, stats | 2d |
| **AI Insights** | Usage patterns | 1d |

### 4.5 Custom Domains

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **Domain Config** | DNS setup UI | 2d |
| **SSL Certs** | Auto Let's Encrypt | 2d |
| **Routing** | Domain to project | 1d |

### 4.6 Mobile Responsive

| Task | Descrição | Estimativa |
|------|-----------|------------|
| **Responsive Layout** | Breakpoints | 2d |
| **Mobile View Mode** | Simplified UI | 2d |
| **Touch Gestures** | Basic support | 1d |

---

## 5. P3 - FUTURO - Semana 21+

### 5.1 Plugin System

| Task | Descrição |
|------|-----------|
| Plugin API | Extension points |
| Plugin Sandbox | Security |
| Plugin Store | Distribution |

### 5.2 Self-Hosted Models

| Task | Descrição |
|------|-----------|
| Local LLM | Ollama/vLLM integration |
| Model Selection | Choose provider |
| Fine-tuning | Custom models |

### 5.3 Visual Scripting

| Task | Descrição |
|------|-----------|
| Node Editor | Flow-based UI |
| Node Types | Logic, events, data |
| Code Generation | From visual to code |

### 5.4 Enterprise Features

| Task | Descrição |
|------|-----------|
| SSO/SAML | Enterprise auth |
| Audit Logs | Compliance |
| Private Cloud | Self-hosted option |

---

## 6. DEPENDÊNCIAS TÉCNICAS

### 6.1 Frontend

```json
{
  "dependencies": {
    // Core
    "react": "^18.x",
    "react-dom": "^18.x",
    
    // Editor
    "@monaco-editor/react": "^4.x",
    
    // Terminal
    "xterm": "^5.x",
    "xterm-addon-fit": "^0.8.x",
    "xterm-addon-web-links": "^0.9.x",
    
    // Layout
    "react-resizable-panels": "^2.x",
    "@dnd-kit/core": "^6.x",
    
    // State
    "zustand": "^4.x",
    
    // AI/Streaming
    "ai": "^3.x",
    
    // Collab (P1)
    "yjs": "^13.x",
    "y-websocket": "^1.x",
    
    // 3D (P2)
    "three": "^0.160.x",
    "@react-three/fiber": "^8.x",
    "@react-three/drei": "^9.x",
    
    // UI
    "lucide-react": "^0.x",
    "cmdk": "^0.x",
    "tailwindcss": "^3.x",
    "class-variance-authority": "^0.x",
    
    // Utils
    "date-fns": "^3.x",
    "lodash-es": "^4.x"
  }
}
```

### 6.2 Backend

```txt
# requirements.txt

# Core
fastapi>=0.109.0
uvicorn>=0.27.0
pydantic>=2.0

# Database
motor>=3.3.0  # MongoDB async
pymongo>=4.6.0
redis>=5.0.0

# Auth
python-jose>=3.3.0
passlib>=1.7.4
bcrypt>=4.1.0

# Storage
boto3>=1.34.0  # S3
aiofiles>=23.0

# AI
openai>=1.10.0
anthropic>=0.18.0
tiktoken>=0.5.0

# WebSocket
websockets>=12.0

# Execution
docker>=7.0.0

# Utils
python-multipart>=0.0.6
python-dotenv>=1.0.0
httpx>=0.26.0
```

---

## 7. INFRAESTRUTURA

### 7.1 Arquitetura Cloud

```
┌─────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE                           │
│                      (CDN + WAF + DNS)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     LOAD BALANCER                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
┌────────▼──────┐ ┌───────▼───────┐ ┌──────▼──────┐
│   FRONTEND    │ │    API        │ │  WORKERS    │
│   (Static)    │ │  (FastAPI)    │ │  (Celery)   │
│   Vercel/S3   │ │  K8s Pods     │ │  K8s Jobs   │
└───────────────┘ └───────┬───────┘ └─────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
┌────────▼──────┐ ┌───────▼───────┐ ┌──────▼──────┐
│   MONGODB     │ │    REDIS      │ │    S3       │
│   Atlas       │ │  ElastiCache  │ │  Storage    │
└───────────────┘ └───────────────┘ └─────────────┘
                          │
                  ┌───────▼───────┐
                  │   CONTAINERS  │
                  │   (User Code) │
                  │   Firecracker │
                  └───────────────┘
```

### 7.2 Custos Estimados (Mensal)

| Serviço | Free Tier | Growth | Scale |
|---------|-----------|--------|-------|
| **Compute (API)** | $50 | $200 | $500 |
| **Containers (User)** | $100 | $500 | $2000 |
| **MongoDB** | $50 | $100 | $300 |
| **Redis** | $20 | $50 | $100 |
| **S3 Storage** | $20 | $100 | $500 |
| **AI APIs** | $200 | $1000 | $5000 |
| **CDN/DNS** | $20 | $50 | $100 |
| **TOTAL** | **$460** | **$2000** | **$8500** |

---

## 8. EQUIPE NECESSÁRIA

### 8.1 MVP (P0)

| Role | Quantidade | Foco |
|------|------------|------|
| **Tech Lead** | 1 | Arquitetura, decisões |
| **Frontend Sr** | 2 | Workbench, Editor |
| **Backend Sr** | 2 | API, Containers |
| **Full-stack** | 1 | AI Integration |
| **DevOps** | 1 | Infra, CI/CD |

### 8.2 v1.0 (P1)

Adicionar:
| Role | Quantidade | Foco |
|------|------------|------|
| **Frontend** | 1 | Collab, Polish |
| **Backend** | 1 | Scale, Perf |
| **AI Engineer** | 1 | Agent, RAG |

---

## 9. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **AI costs explodem** | Alta | Crítico | Limites agressivos, caching |
| **Performance ruim** | Média | Alto | Otimização contínua, profiling |
| **Complexidade demais** | Alta | Alto | MVP lean, cortar scope |
| **Concorrente lança feature** | Alta | Médio | Foco em diferenciação |
| **Segurança breach** | Baixa | Crítico | Security-first, audits |
| **Time subestimado** | Alta | Alto | Buffer 30%, priorização |

---

## 10. MÉTRICAS DE SUCESSO

### 10.1 MVP (P0)

| Métrica | Target |
|---------|--------|
| Time to MVP | 6 semanas |
| Bugs críticos | 0 |
| Performance (FCP) | <3s |
| AI response time | <2s |

### 10.2 v1.0 (P1)

| Métrica | Target |
|---------|--------|
| Users beta | 100+ |
| DAU/MAU | >30% |
| Deploy success rate | >95% |
| NPS | >40 |

### 10.3 v1.5+ (P2)

| Métrica | Target |
|---------|--------|
| Users | 1000+ |
| Paying users | 10%+ |
| Revenue | Break-even |
| Churn | <5%/month |

---

## 11. PLANO PARA SUPERAR VERGENT

### 11.1 Vantagens Competitivas

| Área | Nossa Vantagem | Como Explorar |
|------|----------------|---------------|
| **Browser-first** | Vergent é desktop | Zero install, qualquer device |
| **Deploy integrado** | Vergent não tem | One-click to production |
| **UX unificada** | IDE + Preview + AI | Friction-free workflow |
| **Multi-domain** | Código + 3D + Video | Único lugar para tudo |
| **Collab nativo** | Vergent não tem | Real-time multiplayer |

### 11.2 Onde Vergent é Forte

| Área | Força Vergent | Nossa Resposta |
|------|---------------|----------------|
| **Multi-agent paralelo** | Pioneiros | Implementar P1, melhorar UX |
| **Desktop performance** | Nativo é mais rápido | Aceitar trade-off por acessibilidade |
| **Git workflow** | Forte | Git integration P1 |

### 11.3 Estratégia de Ataque

1. **Fase 1 (MVP):** Paridade em AI básica, superioridade em deploy/preview
2. **Fase 2 (v1.0):** Multi-agent no browser (único), collab nativo
3. **Fase 3 (v1.5):** Expansão para 3D/video (escopo que Vergent não tem)
4. **Fase 4 (v2.0):** Marketplace, enterprise (scale)

---

## 12. DECISÕES EXECUTIVAS FINAIS

### O que FAZER AGORA (P0)

| Decisão | Justificativa |
|---------|---------------|
| Monaco como editor | Padrão da indústria, extensível |
| FastAPI backend | Performance, async, Python ecosystem |
| MongoDB | Flexível, bom para projetos/files |
| OpenAI + Anthropic | Melhores modelos atuais |
| Docker containers | Isolamento, segurança |
| S3 storage | Standard, barato |

### O que NÃO FAZER

| Decisão | Justificativa |
|---------|---------------|
| Plugins (P0) | Complexidade, foco no core |
| AAA 3D (P0) | Impossível no browser, fora do MVP |
| Video editing (P0) | Escopo muito grande |
| Self-hosted AI (P0) | Custo de infra, complexidade |
| Mobile native (P0) | Web-first strategy |

### O que ADIAR CONSCIENTEMENTE

| Item | Quando Revisar |
|------|----------------|
| Plugin system | Após v1.0 validado |
| Self-hosted models | Se custo AI for problema |
| Visual scripting | Após validar demanda |
| Enterprise features | Após PMF |

---

## 13. PRÓXIMOS PASSOS IMEDIATOS

### Semana 1: Kickoff

- [ ] Setup repositório
- [ ] CI/CD pipeline
- [ ] Design system inicial
- [ ] Ambiente de dev
- [ ] Documentação de APIs

### Semana 2: Sprint 1 Start

- [ ] Auth implementation
- [ ] Workbench layout
- [ ] File service
- [ ] Primeiros testes

---

## ASSINATURAS

Este documento é um **contrato de execução**. Ao prosseguir, a equipe concorda com:

- Prioridades definidas (P0 > P1 > P2 > P3)
- Scope do MVP
- Timeline de 6 semanas para MVP
- Trade-offs aceitos
- Métricas de sucesso

---

**DOCUMENTOS RELACIONADOS:**
- `1_FULL_AUDIT.md`
- `2_DUPLICATIONS_AND_CONFLICTS.md`
- `3_LIMITATIONS.md`
- `4_COMPETITIVE_GAP.md`
- `5_WORKBENCH_SPEC.md`
- `6_AI_SYSTEM_SPEC.md`
