# 🎯 Próximos Passos - Ação Imediata

## 📋 Checklist de Início

### ✅ Já Feito (Hoje)
- [x] Análise completa do repositório
- [x] Identificação de gaps críticos
- [x] Criação do plano de melhoria
- [x] Documentação da arquitetura proposta
- [x] Roadmap de implementação
- [x] Correção de imports quebrados
- [x] Melhoria do .gitignore

---

## 🚀 Esta Semana (Prioridade Máxima)

### Dia 1-2: Setup e Preparação

#### 1. Criar Estrutura de Branches
```bash
# Branch principal de desenvolvimento
git checkout -b develop

# Branches de features
git checkout -b feature/agent-sources
git checkout -b feature/streaming
git checkout -b feature/secrets-vault
git checkout -b feature/backend-api
```

#### 2. Setup do Ambiente de Desenvolvimento
```bash
# Instalar dependências
npm install

# Verificar build
npm run build

# Rodar testes existentes
npm run test:ai-ide

# Iniciar mock backend
npm run dev:mock-backend
```

#### 3. Documentar Estado Atual
- [ ] Criar `docs/CURRENT_STATE.md` com inventário completo
- [ ] Listar todas as features funcionais
- [ ] Listar todas as features quebradas
- [ ] Mapear dependências entre componentes

---

### Dia 3-4: Reescrever Architect Agent

#### Arquivo: `packages/ai-ide/src/browser/architect-agent.ts`

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { Agent, AgentRequest, AgentResponse, AgentContext } from './agent-base';
import { LlmProviderService } from './llm-provider-service';
import { MemoryService } from './memory-service';

@injectable()
export class ArchitectAgent extends Agent {
    
    static readonly ID = 'architect';
    static readonly NAME = 'Architect';
    static readonly DESCRIPTION = 'Expert in software architecture and design patterns';
    
    private readonly SYSTEM_PROMPT = `
You are an expert software architect with deep knowledge of:
- Design patterns (GoF, Enterprise, Cloud)
- System architecture (Microservices, Monolith, Serverless)
- SOLID principles and clean architecture
- Scalability and performance optimization
- Security best practices

Your role is to:
1. Analyze system requirements and constraints
2. Suggest appropriate architectural patterns
3. Identify potential issues and bottlenecks
4. Recommend best practices
5. Provide clear, actionable guidance

Always consider:
- Maintainability and extensibility
- Performance implications
- Security concerns
- Cost optimization
- Team capabilities
`;

    constructor(
        @inject(LlmProviderService) 
        protected readonly providerService: LlmProviderService,
        @inject(MemoryService)
        protected readonly memoryService: MemoryService
    ) {
        super(ArchitectAgent.ID, ArchitectAgent.NAME, providerService, memoryService);
    }

    async invoke(
        request: AgentRequest,
        context: AgentContext
    ): Promise<AgentResponse> {
        try {
            // 1. Retrieve relevant architecture patterns from memory
            const relevantPatterns = await this.recallRelevantPatterns(
                request.messages[request.messages.length - 1].content
            );

            // 2. Analyze current codebase structure (if workspace available)
            const codebaseAnalysis = context.workspaceUri 
                ? await this.analyzeCodebaseStructure(context.workspaceUri)
                : null;

            // 3. Build enhanced prompt with context
            const enhancedMessages = this.buildEnhancedPrompt(
                request.messages,
                relevantPatterns,
                codebaseAnalysis
            );

            // 4. Call LLM provider
            const response = await this.providerService.sendRequestToProvider(
                context.preferredProvider,
                {
                    messages: [
                        { role: 'system', content: this.SYSTEM_PROMPT },
                        ...enhancedMessages
                    ],
                    temperature: 0.7,
                    maxTokens: 2000
                }
            );

            // 5. Store recommendation in memory for future reference
            if (response.content) {
                await this.rememberArchitectureDecision(
                    context.workspaceUri || 'global',
                    request.messages[request.messages.length - 1].content,
                    response.content
                );
            }

            return {
                agentId: this.id,
                content: response.content || '',
                metadata: {
                    tokensUsed: (response.tokensIn || 0) + (response.tokensOut || 0),
                    model: response.model,
                    patternsUsed: relevantPatterns.length,
                    codebaseAnalyzed: !!codebaseAnalysis
                }
            };

        } catch (error) {
            console.error('ArchitectAgent error:', error);
            return {
                agentId: this.id,
                content: 'I encountered an error while analyzing the architecture. Please try again.',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async recallRelevantPatterns(query: string): Promise<any[]> {
        // TODO: Implement vector search when memory service is ready
        // For now, return empty array
        return [];
    }

    private async analyzeCodebaseStructure(workspaceUri: string): Promise<any> {
        // TODO: Implement AST analysis
        // For now, return null
        return null;
    }

    private buildEnhancedPrompt(
        messages: any[],
        patterns: any[],
        analysis: any
    ): any[] {
        const enhanced = [...messages];

        if (patterns.length > 0) {
            enhanced.push({
                role: 'system',
                content: `Relevant patterns from memory:\n${patterns.map(p => `- ${p.name}: ${p.description}`).join('\n')}`
            });
        }

        if (analysis) {
            enhanced.push({
                role: 'system',
                content: `Current codebase structure:\n${JSON.stringify(analysis, null, 2)}`
            });
        }

        return enhanced;
    }

    private async rememberArchitectureDecision(
        workspace: string,
        question: string,
        recommendation: string
    ): Promise<void> {
        // TODO: Store in vector DB when memory service is ready
        console.log('Architecture decision stored:', { workspace, question, recommendation });
    }
}
```

#### Testes: `packages/ai-ide/src/browser/__tests__/architect-agent.spec.ts`

```typescript
import { expect } from 'chai';
import { ArchitectAgent } from '../architect-agent';
import { LlmProviderService } from '../llm-provider-service';
import { MemoryService } from '../memory-service';

describe('ArchitectAgent', () => {
    let agent: ArchitectAgent;
    let mockProviderService: any;
    let mockMemoryService: any;

    beforeEach(() => {
        mockProviderService = {
            sendRequestToProvider: async () => ({
                content: 'Use microservices architecture',
                tokensIn: 100,
                tokensOut: 50,
                model: 'gpt-4'
            })
        };

        mockMemoryService = {
            search: async () => [],
            store: async () => {}
        };

        agent = new ArchitectAgent(mockProviderService, mockMemoryService);
    });

    it('should have correct ID and name', () => {
        expect(agent.id).to.equal('architect');
        expect(agent.name).to.equal('Architect');
    });

    it('should invoke successfully with valid request', async () => {
        const request = {
            messages: [
                { role: 'user', content: 'How should I structure my app?' }
            ]
        };

        const context = {
            preferredProvider: 'openai',
            workspaceUri: '/workspace'
        };

        const response = await agent.invoke(request, context);

        expect(response.agentId).to.equal('architect');
        expect(response.content).to.be.a('string');
        expect(response.metadata).to.exist;
    });

    it('should handle errors gracefully', async () => {
        mockProviderService.sendRequestToProvider = async () => {
            throw new Error('Provider error');
        };

        const request = {
            messages: [{ role: 'user', content: 'Test' }]
        };

        const response = await agent.invoke(request, {});

        expect(response.error).to.exist;
        expect(response.content).to.include('error');
    });
});
```

**Tarefas**:
- [ ] Criar `agent-base.ts` com interface base
- [ ] Implementar `ArchitectAgent` completo
- [ ] Adicionar testes unitários
- [ ] Documentar uso e exemplos
- [ ] Integrar com orchestrator

---

### Dia 5-7: Reescrever Coder Agent

#### Similar ao Architect, mas focado em:
- Geração de código
- Refactoring
- Bug fixes
- Code review

**Tarefas**:
- [ ] Implementar `CoderAgent`
- [ ] Adicionar ferramentas (file operations, AST)
- [ ] Testes unitários
- [ ] Integração com editor

---

## 📅 Próxima Semana

### Semana 2: Streaming + Secrets

#### Streaming Implementation
```typescript
// packages/ai-ide/src/common/streaming.ts

export interface StreamingHandle {
    iterable: AsyncIterable<Delta>;
    cancel: () => void;
}

export interface Delta {
    content: string;
    tokens?: number;
    metadata?: Record<string, unknown>;
}

export class StreamingProvider {
    async *streamRequest(
        provider: ILlmProvider,
        options: SendRequestOptions
    ): AsyncGenerator<Delta> {
        const response = await fetch(provider.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`
            },
            body: JSON.stringify({
                ...options,
                stream: true
            })
        });

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    if (data.choices?.[0]?.delta?.content) {
                        yield {
                            content: data.choices[0].delta.content,
                            tokens: 1
                        };
                    }
                }
            }
        }
    }
}
```

#### Secrets Vault
```typescript
// packages/ai-ide/src/node/secrets-vault.ts

import * as crypto from 'crypto';

export class SecretsVault {
    private readonly algorithm = 'aes-256-gcm';
    private readonly masterKey: Buffer;

    constructor(masterKeyBase64: string) {
        this.masterKey = Buffer.from(masterKeyBase64, 'base64');
    }

    encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
        
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return JSON.stringify({
            iv: iv.toString('hex'),
            encrypted,
            authTag: authTag.toString('hex')
        });
    }

    decrypt(ciphertext: string): string {
        const { iv, encrypted, authTag } = JSON.parse(ciphertext);
        
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            this.masterKey,
            Buffer.from(iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
}
```

---

## 🎯 Mês 1: Objetivos

### Semana 1
- [x] Análise e planejamento
- [ ] Reescrever Architect Agent
- [ ] Reescrever Coder Agent

### Semana 2
- [ ] Implementar streaming
- [ ] Criar secrets vault
- [ ] Migrar API keys

### Semana 3
- [ ] Criar backend FastAPI
- [ ] Setup PostgreSQL + Redis
- [ ] Implementar autenticação

### Semana 4
- [ ] Integrar frontend com backend
- [ ] Testes de integração
- [ ] Deploy em staging

---

## 📊 Métricas de Progresso

### Código
- **Linhas escritas**: 0 / ~5000
- **Testes criados**: 0 / ~50
- **Cobertura**: 0% → 80%

### Features
- **Agentes reescritos**: 0 / 2
- **Streaming**: ❌ → ✅
- **Secrets**: ❌ → ✅
- **Backend**: ❌ → ✅

### Qualidade
- **Bugs críticos**: 5 → 0
- **Type safety**: 40% → 90%
- **Documentação**: 20% → 80%

---

## 🔧 Ferramentas Necessárias

### Desenvolvimento
- [ ] VSCode com extensões TypeScript
- [ ] Node.js 18+ LTS
- [ ] Python 3.11+ (para backend)
- [ ] Docker Desktop
- [ ] PostgreSQL client
- [ ] Redis client

### Testing
- [ ] Jest (já instalado)
- [ ] Playwright (já instalado)
- [ ] k6 (load testing)
- [ ] Postman/Insomnia (API testing)

### Monitoring
- [ ] Prometheus
- [ ] Grafana
- [ ] Jaeger (tracing)

---

## 💡 Dicas de Implementação

### 1. Começar Pequeno
- Implementar features incrementalmente
- Testar cada componente isoladamente
- Integrar gradualmente

### 2. Documentar Tudo
- Comentários inline para lógica complexa
- README para cada package
- Exemplos de uso

### 3. Testes Primeiro
- TDD quando possível
- Cobertura mínima 80%
- Testes de integração críticos

### 4. Code Review
- Revisar todo código antes de merge
- Usar linter e formatter
- Seguir style guide

### 5. Monitorar Progresso
- Daily standups
- Weekly demos
- Métricas visíveis

---

## 🚨 Bloqueadores Potenciais

### 1. Fontes dos Agentes
- **Status**: Confirmado perdido
- **Solução**: Reescrever (em andamento)
- **ETA**: 1 semana

### 2. Backend Ausente
- **Status**: Não existe
- **Solução**: Criar do zero
- **ETA**: 2 semanas

### 3. Streaming Complexo
- **Status**: Não implementado
- **Solução**: Usar libs existentes
- **ETA**: 1 semana

---

## 📞 Suporte

### Perguntas Frequentes
- Consultar `docs/FAQ.md` (criar)
- Issues no GitHub
- Discord/Slack da equipe

### Recursos
- [Theia Documentation](https://theia-ide.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)

---

## ✅ Checklist Final

Antes de considerar Fase 1 completa:

- [ ] Architect Agent funcionando
- [ ] Coder Agent funcionando
- [ ] Streaming implementado
- [ ] Secrets vault funcionando
- [ ] Backend API básico
- [ ] Autenticação JWT
- [ ] PostgreSQL + Redis
- [ ] Testes passando (80%+ cobertura)
- [ ] Documentação atualizada
- [ ] Deploy em staging

---

**Começar Agora**: Criar branch `feature/agent-sources` e implementar `ArchitectAgent`

**Próxima Revisão**: Sexta-feira (fim da semana)

**Meta**: Ter 2 agentes reescritos e testados até domingo
