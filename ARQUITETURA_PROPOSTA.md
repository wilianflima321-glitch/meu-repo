# 🏗️ Arquitetura Proposta - IDE Mundial

## Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Theia)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Editor     │  │  AI Agents   │  │  Visual      │      │
│  │   Monaco     │  │  Orchestrator│  │  Scripting   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    WebSocket + REST                          │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                      BACKEND (FastAPI)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │  Orchestrator│  │   Billing    │      │
│  │   JWT/OAuth  │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Memory     │  │   Agents     │  │   Providers  │      │
│  │   Service    │  │   Manager    │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │   Qdrant     │      │
│  │  (Main DB)   │  │   (Cache)    │  │  (Vectors)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   OpenAI     │  │  Anthropic   │  │    Google    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Componentes Principais

### 1. Frontend (Theia Fork)

#### Editor Core
```typescript
packages/
├── core/                    # Theia core (13MB)
├── editor/                  # Monaco integration
├── terminal/                # Terminal emulator
├── file-search/             # File operations
└── workspace/               # Workspace management
```

#### AI Integration
```typescript
packages/
├── ai-ide/                  # Orchestrator hub (2.7MB)
│   ├── orchestrator-agent   # Main routing
│   ├── universal-agent      # Fallback
│   ├── command-agent        # Theia commands
│   ├── architect-agent      # Architecture (REESCREVER)
│   ├── coder-agent          # Code gen (REESCREVER)
│   └── app-tester-agent     # Playwright MCP
├── ai-core/                 # Core abstractions (1.7MB)
├── ai-chat/                 # Chat functionality (1.5MB)
├── ai-chat-ui/              # Chat UI components
└── ai-[provider]/           # Provider packages
```

#### UI Components
```typescript
packages/ai-ide/src/browser/ai-configuration/
├── agent-configuration-widget.tsx
├── provider-configuration-widget.tsx
├── token-usage-configuration-widget.tsx
├── model-aliases-configuration-widget.tsx
├── prompt-fragments-configuration-widget.tsx
├── tools-configuration-widget.tsx
├── mcp-configuration-widget.tsx
└── billing-admin-widget.tsx
```

---

### 2. Backend (FastAPI - NOVO)

#### Estrutura Proposta
```python
backend/
├── api/
│   ├── v1/
│   │   ├── auth.py              # Authentication
│   │   ├── users.py             # User management
│   │   ├── workspaces.py        # Workspace CRUD
│   │   ├── agents.py            # Agent orchestration
│   │   ├── providers.py         # LLM provider management
│   │   ├── billing.py           # Usage tracking
│   │   ├── memory.py            # Vector operations
│   │   └── websocket.py         # Real-time updates
│   └── dependencies.py          # Shared dependencies
├── core/
│   ├── config.py                # Configuration
│   ├── security.py              # JWT, OAuth2
│   └── exceptions.py            # Custom exceptions
├── models/
│   ├── user.py                  # User model
│   ├── workspace.py             # Workspace model
│   ├── agent.py                 # Agent model
│   ├── provider.py              # Provider model
│   ├── usage.py                 # Usage event model
│   └── memory.py                # Memory/embedding model
├── schemas/
│   ├── user.py                  # Pydantic schemas
│   ├── workspace.py
│   ├── agent.py
│   └── provider.py
├── services/
│   ├── orchestrator.py          # Agent routing logic
│   ├── memory_service.py        # Vector DB operations
│   ├── billing_service.py       # Cost calculation
│   ├── provider_service.py      # Provider management
│   └── agent_service.py         # Agent lifecycle
├── db/
│   ├── base.py                  # SQLAlchemy base
│   ├── session.py               # DB session
│   ├── postgres.py              # PostgreSQL
│   ├── redis.py                 # Redis client
│   └── qdrant.py                # Vector DB client
├── utils/
│   ├── logger.py                # Structured logging
│   ├── metrics.py               # Prometheus metrics
│   └── tracing.py               # OpenTelemetry
└── main.py                      # FastAPI app
```

#### API Endpoints

**Authentication**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

**Workspaces**
```
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/{id}
PUT    /api/v1/workspaces/{id}
DELETE /api/v1/workspaces/{id}
```

**Agents**
```
POST   /api/v1/agents/orchestrate      # Main orchestration
POST   /api/v1/agents/{id}/invoke      # Direct agent call
GET    /api/v1/agents                  # List agents
GET    /api/v1/agents/{id}/history     # Conversation history
```

**Providers**
```
GET    /api/v1/providers
POST   /api/v1/providers
GET    /api/v1/providers/{id}
PUT    /api/v1/providers/{id}
DELETE /api/v1/providers/{id}
POST   /api/v1/providers/{id}/test     # Health check
```

**Billing**
```
POST   /api/v1/billing/usage           # Log usage event
GET    /api/v1/billing/usage           # Query usage
GET    /api/v1/billing/summary         # Usage summary
POST   /api/v1/billing/reconcile       # Reconciliation
```

**Memory**
```
POST   /api/v1/memory/embed            # Create embedding
POST   /api/v1/memory/search           # Semantic search
GET    /api/v1/memory/{id}             # Get memory
DELETE /api/v1/memory/{id}             # Delete memory
```

**WebSocket**
```
WS     /api/v1/ws/agents               # Agent streaming
WS     /api/v1/ws/collaboration        # Real-time collab
```

---

### 3. Data Layer

#### PostgreSQL Schema
```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Workspaces
CREATE TABLE workspaces (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES users(id),
    settings JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Providers
CREATE TABLE providers (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL,
    owner_id UUID REFERENCES users(id),
    billing_mode VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage Events
CREATE TABLE usage_events (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL,
    provider_id UUID REFERENCES providers(id),
    user_id UUID REFERENCES users(id),
    workspace_id UUID REFERENCES workspaces(id),
    model VARCHAR(255),
    tokens_input INTEGER,
    tokens_output INTEGER,
    estimated_cost DECIMAL(10, 6),
    status INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Memories (embeddings metadata)
CREATE TABLE memories (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id),
    content TEXT NOT NULL,
    embedding_id VARCHAR(255),  -- Qdrant point ID
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id),
    user_id UUID REFERENCES users(id),
    agent_id VARCHAR(255),
    messages JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Redis Keys
```
# Sessions
session:{user_id}:{session_id} -> {user_data}

# Cache
cache:provider:{provider_id} -> {provider_config}
cache:agent:{agent_id} -> {agent_metadata}

# Rate Limiting
ratelimit:{user_id}:{endpoint} -> {count}

# Real-time Presence
presence:workspace:{workspace_id} -> Set[user_id]

# Message Queue
queue:agent_tasks -> List[task]
```

#### Qdrant Collections
```python
# Code embeddings
collection_name = "code_embeddings"
vector_size = 1536  # OpenAI ada-002

# Conversation embeddings
collection_name = "conversation_embeddings"
vector_size = 1536

# Documentation embeddings
collection_name = "docs_embeddings"
vector_size = 1536
```

---

### 4. Agent System (Reescrito)

#### Orchestrator Service
```python
class OrchestratorService:
    """
    Routes requests to appropriate agents based on:
    - Intent classification (LLM-based)
    - User preferences
    - Agent availability
    - Cost optimization
    """
    
    async def orchestrate(
        self,
        request: AgentRequest,
        context: RequestContext
    ) -> AgentResponse:
        # 1. Classify intent
        intent = await self.classify_intent(request.messages)
        
        # 2. Select agent(s)
        agents = await self.select_agents(intent, context)
        
        # 3. Execute (single or multi-agent)
        if len(agents) == 1:
            return await self.execute_single(agents[0], request)
        else:
            return await self.execute_multi(agents, request)
    
    async def execute_multi(
        self,
        agents: List[Agent],
        request: AgentRequest
    ) -> AgentResponse:
        """
        Multi-agent workflow:
        1. Coordinator creates execution plan
        2. Agents execute in sequence/parallel
        3. Results aggregated
        """
        coordinator = CoordinatorAgent()
        plan = await coordinator.create_plan(agents, request)
        
        results = []
        for step in plan.steps:
            result = await step.agent.execute(step.input)
            results.append(result)
        
        return await coordinator.aggregate(results)
```

#### Agent Base Class
```python
class Agent(ABC):
    """Base class for all agents"""
    
    def __init__(
        self,
        name: str,
        provider_service: ProviderService,
        memory_service: MemoryService
    ):
        self.name = name
        self.provider_service = provider_service
        self.memory_service = memory_service
        self.short_term_memory = []
        
    @abstractmethod
    async def invoke(
        self,
        request: AgentRequest,
        context: AgentContext
    ) -> AgentResponse:
        """Execute agent logic"""
        pass
    
    async def remember(self, key: str, value: Any):
        """Store in long-term memory"""
        await self.memory_service.store(
            workspace_id=context.workspace_id,
            key=key,
            value=value
        )
    
    async def recall(self, query: str, k: int = 5):
        """Retrieve from long-term memory"""
        return await self.memory_service.search(
            workspace_id=context.workspace_id,
            query=query,
            k=k
        )
```

#### Architect Agent (Reescrito)
```python
class ArchitectAgent(Agent):
    """
    Provides architecture guidance:
    - Design patterns
    - System architecture
    - Best practices
    - Code structure
    """
    
    SYSTEM_PROMPT = """
    You are an expert software architect. Your role is to:
    1. Analyze system requirements
    2. Suggest appropriate architectures
    3. Recommend design patterns
    4. Ensure scalability and maintainability
    
    Always consider:
    - SOLID principles
    - Clean architecture
    - Performance implications
    - Security best practices
    """
    
    async def invoke(
        self,
        request: AgentRequest,
        context: AgentContext
    ) -> AgentResponse:
        # 1. Retrieve relevant architecture patterns from memory
        patterns = await self.recall(
            query=request.messages[-1].content,
            k=3
        )
        
        # 2. Analyze current codebase structure
        structure = await self.analyze_structure(context.workspace_id)
        
        # 3. Generate architecture recommendation
        prompt = self.build_prompt(
            request=request,
            patterns=patterns,
            structure=structure
        )
        
        # 4. Call LLM
        response = await self.provider_service.send_request(
            provider_id=context.preferred_provider,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                *prompt
            ],
            stream=True
        )
        
        # 5. Store recommendation in memory
        await self.remember(
            key=f"architecture_{context.workspace_id}",
            value=response.content
        )
        
        return response
```

#### Coder Agent (Reescrito)
```python
class CoderAgent(Agent):
    """
    Generates and modifies code:
    - Code generation
    - Refactoring
    - Bug fixes
    - Code review
    """
    
    SYSTEM_PROMPT = """
    You are an expert software engineer. Your role is to:
    1. Write clean, maintainable code
    2. Follow project conventions
    3. Add appropriate tests
    4. Document complex logic
    
    Always:
    - Use type hints
    - Handle errors gracefully
    - Write self-documenting code
    - Consider edge cases
    """
    
    async def invoke(
        self,
        request: AgentRequest,
        context: AgentContext
    ) -> AgentResponse:
        # 1. Retrieve similar code from memory
        similar_code = await self.recall(
            query=request.messages[-1].content,
            k=5
        )
        
        # 2. Analyze existing code style
        style = await self.analyze_style(context.workspace_id)
        
        # 3. Generate code
        prompt = self.build_prompt(
            request=request,
            similar_code=similar_code,
            style=style
        )
        
        response = await self.provider_service.send_request(
            provider_id=context.preferred_provider,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                *prompt
            ],
            stream=True,
            tools=self.get_tools()  # File operations, AST analysis
        )
        
        # 4. Validate generated code
        if response.tool_calls:
            await self.execute_tools(response.tool_calls)
        
        return response
    
    def get_tools(self) -> List[Tool]:
        return [
            Tool(
                name="write_file",
                description="Write content to a file",
                parameters={
                    "path": "string",
                    "content": "string"
                }
            ),
            Tool(
                name="read_file",
                description="Read file content",
                parameters={"path": "string"}
            ),
            Tool(
                name="analyze_ast",
                description="Analyze code AST",
                parameters={"code": "string"}
            )
        ]
```

---

### 5. Memory System

#### Vector DB Integration
```python
class MemoryService:
    """
    Manages long-term memory using vector embeddings
    """
    
    def __init__(
        self,
        qdrant_client: QdrantClient,
        embedding_service: EmbeddingService
    ):
        self.qdrant = qdrant_client
        self.embeddings = embedding_service
    
    async def store(
        self,
        workspace_id: str,
        key: str,
        value: Any,
        metadata: Dict = None
    ):
        """Store item in vector DB"""
        # 1. Generate embedding
        embedding = await self.embeddings.embed(str(value))
        
        # 2. Store in Qdrant
        point_id = str(uuid.uuid4())
        await self.qdrant.upsert(
            collection_name=f"workspace_{workspace_id}",
            points=[
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "key": key,
                        "value": value,
                        "metadata": metadata or {},
                        "created_at": datetime.utcnow().isoformat()
                    }
                )
            ]
        )
        
        # 3. Store metadata in PostgreSQL
        await self.db.execute(
            """
            INSERT INTO memories (id, workspace_id, content, embedding_id, metadata)
            VALUES (:id, :workspace_id, :content, :embedding_id, :metadata)
            """,
            {
                "id": uuid.uuid4(),
                "workspace_id": workspace_id,
                "content": str(value),
                "embedding_id": point_id,
                "metadata": metadata
            }
        )
    
    async def search(
        self,
        workspace_id: str,
        query: str,
        k: int = 5,
        filter: Dict = None
    ) -> List[Memory]:
        """Semantic search in vector DB"""
        # 1. Generate query embedding
        query_embedding = await self.embeddings.embed(query)
        
        # 2. Search in Qdrant
        results = await self.qdrant.search(
            collection_name=f"workspace_{workspace_id}",
            query_vector=query_embedding,
            limit=k,
            query_filter=filter
        )
        
        # 3. Return results
        return [
            Memory(
                id=r.id,
                content=r.payload["value"],
                score=r.score,
                metadata=r.payload["metadata"]
            )
            for r in results
        ]
```

---

### 6. Streaming Implementation

#### Backend Streaming
```python
from fastapi import WebSocket
from typing import AsyncIterator

class StreamingService:
    """Handles streaming responses"""
    
    async def stream_agent_response(
        self,
        websocket: WebSocket,
        request: AgentRequest
    ):
        """Stream agent response via WebSocket"""
        await websocket.accept()
        
        try:
            # 1. Get streaming response from LLM
            async for chunk in self.agent_service.invoke_streaming(request):
                # 2. Send to client
                await websocket.send_json({
                    "type": "delta",
                    "content": chunk.content,
                    "metadata": {
                        "tokens": chunk.tokens,
                        "model": chunk.model
                    }
                })
            
            # 3. Send completion
            await websocket.send_json({
                "type": "complete",
                "metadata": {
                    "total_tokens": total_tokens,
                    "cost": estimated_cost
                }
            })
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "error": str(e)
            })
        finally:
            await websocket.close()
```

#### Frontend Streaming
```typescript
class StreamingClient {
    private ws: WebSocket;
    
    async streamAgentResponse(
        request: AgentRequest,
        onDelta: (delta: string) => void,
        onComplete: (metadata: any) => void,
        onError: (error: Error) => void
    ): Promise<void> {
        this.ws = new WebSocket('ws://localhost:8000/api/v1/ws/agents');
        
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify(request));
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'delta':
                    onDelta(data.content);
                    break;
                case 'complete':
                    onComplete(data.metadata);
                    this.ws.close();
                    break;
                case 'error':
                    onError(new Error(data.error));
                    this.ws.close();
                    break;
            }
        };
        
        this.ws.onerror = (error) => {
            onError(new Error('WebSocket error'));
        };
    }
}
```

---

### 7. Real-Time Collaboration

#### Yjs Integration
```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

class CollaborationService {
    private doc: Y.Doc;
    private provider: WebsocketProvider;
    
    async initWorkspace(workspaceId: string): Promise<void> {
        // 1. Create Yjs document
        this.doc = new Y.Doc();
        
        // 2. Connect to WebSocket server
        this.provider = new WebsocketProvider(
            'ws://localhost:8000/api/v1/ws/collaboration',
            workspaceId,
            this.doc
        );
        
        // 3. Bind to Monaco editor
        const yText = this.doc.getText('monaco');
        const binding = new MonacoBinding(
            yText,
            this.editor.getModel(),
            new Set([this.editor]),
            this.provider.awareness
        );
    }
    
    async showPresence(): Promise<void> {
        this.provider.awareness.on('change', () => {
            const states = this.provider.awareness.getStates();
            // Update UI with user cursors/selections
            this.updatePresenceUI(states);
        });
    }
}
```

---

### 8. Visual Scripting

#### React Flow Integration
```typescript
import ReactFlow, { Node, Edge } from 'reactflow';

interface BlueprintNode extends Node {
    type: 'agent' | 'function' | 'condition' | 'loop';
    data: {
        label: string;
        config: any;
    };
}

class VisualScriptingEditor {
    private nodes: BlueprintNode[] = [];
    private edges: Edge[] = [];
    
    async executeBlueprint(): Promise<void> {
        // 1. Topological sort
        const sorted = this.topologicalSort(this.nodes, this.edges);
        
        // 2. Execute nodes in order
        const context = new ExecutionContext();
        
        for (const node of sorted) {
            switch (node.type) {
                case 'agent':
                    const result = await this.executeAgent(node, context);
                    context.set(node.id, result);
                    break;
                case 'function':
                    const output = await this.executeFunction(node, context);
                    context.set(node.id, output);
                    break;
                case 'condition':
                    const branch = await this.evaluateCondition(node, context);
                    // Follow appropriate edge
                    break;
            }
        }
    }
    
    async exportToCode(): Promise<string> {
        // Generate Python/TypeScript code from blueprint
        const generator = new CodeGenerator(this.nodes, this.edges);
        return generator.generate();
    }
}
```

---

## 🔐 Segurança

### Secrets Management
```python
from cryptography.fernet import Fernet

class SecretsVault:
    """Secure secrets storage"""
    
    def __init__(self, master_key: bytes):
        self.cipher = Fernet(master_key)
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt secret"""
        return self.cipher.encrypt(plaintext.encode()).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """Decrypt secret"""
        return self.cipher.decrypt(ciphertext.encode()).decode()
    
    async def store_api_key(
        self,
        user_id: str,
        provider: str,
        api_key: str
    ):
        """Store encrypted API key"""
        encrypted = self.encrypt(api_key)
        await self.db.execute(
            """
            INSERT INTO secrets (user_id, provider, encrypted_value)
            VALUES (:user_id, :provider, :encrypted_value)
            ON CONFLICT (user_id, provider) 
            DO UPDATE SET encrypted_value = :encrypted_value
            """,
            {
                "user_id": user_id,
                "provider": provider,
                "encrypted_value": encrypted
            }
        )
```

---

## 📊 Monitoring

### Prometheus Metrics
```python
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
agent_requests_total = Counter(
    'agent_requests_total',
    'Total agent requests',
    ['agent', 'status']
)

agent_request_duration = Histogram(
    'agent_request_duration_seconds',
    'Agent request duration',
    ['agent']
)

# LLM metrics
llm_tokens_total = Counter(
    'llm_tokens_total',
    'Total LLM tokens',
    ['provider', 'type']  # type: input/output
)

llm_cost_total = Counter(
    'llm_cost_total',
    'Total LLM cost in USD',
    ['provider']
)

# System metrics
active_users = Gauge(
    'active_users',
    'Number of active users'
)

active_workspaces = Gauge(
    'active_workspaces',
    'Number of active workspaces'
)
```

---

## 🚀 Deployment

### Kubernetes Manifests
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ide-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ide-backend
  template:
    metadata:
      labels:
        app: ide-backend
    spec:
      containers:
      - name: backend
        image: ide-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ide-backend-service
spec:
  selector:
    app: ide-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

---

**Próxima Ação**: Implementar backend FastAPI básico
