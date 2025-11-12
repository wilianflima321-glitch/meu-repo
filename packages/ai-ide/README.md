# AI IDE Package

Sistema multi-agente de IA para o Theia IDE.

## Agentes Disponíveis

### 1. Architect Agent
**ID**: `architect`  
**Descrição**: Expert em arquitetura de software e design patterns

**Capacidades**:
- Análise de requisitos de sistema
- Sugestão de padrões arquiteturais
- Identificação de problemas e gargalos
- Recomendações de best practices
- Orientação sobre escalabilidade e performance

**Uso**:
```typescript
import { ArchitectAgentNew } from './architect-agent-new';

const agent = new ArchitectAgentNew(providerService);
const response = await agent.invoke({
    messages: [
        { role: 'user', content: 'Como estruturar minha aplicação microservices?' }
    ]
}, {
    preferredProvider: 'openai'
});
```

### 2. Coder Agent
**ID**: `coder`  
**Descrição**: Expert em geração de código, refactoring e correção de bugs

**Capacidades**:
- Geração de código em múltiplas linguagens
- Refactoring de código existente
- Correção de bugs
- Escrita de testes
- Code review
- Otimização de performance

**Linguagens Suportadas**:
- TypeScript/JavaScript
- Python
- Java
- Go
- Rust

**Uso**:
```typescript
import { CoderAgentNew } from './coder-agent-new';

const agent = new CoderAgentNew(providerService);
const response = await agent.invoke({
    messages: [
        { role: 'user', content: 'Escreva uma função TypeScript para validar email' }
    ]
}, {
    preferredProvider: 'openai'
});
```

## Sistema de Streaming

Suporte a respostas em streaming para feedback em tempo real.

**Uso**:
```typescript
import { StreamingClient } from '../common/streaming';

const client = new StreamingClient();

await client.streamResponse(
    'https://api.openai.com/v1/chat/completions',
    'your-api-key',
    {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
    },
    {
        onDelta: (delta) => {
            console.log('Received:', delta.content);
        },
        onComplete: (metadata) => {
            console.log('Done!', metadata);
        },
        onError: (error) => {
            console.error('Error:', error);
        }
    }
);
```

## Secrets Vault

Sistema seguro de armazenamento de secrets com criptografia AES-256-GCM.

**Uso**:
```typescript
import { getSecretsVault } from '../node/secrets-vault';

const vault = getSecretsVault();

// Encrypt
const encrypted = vault.encrypt('my-api-key');

// Decrypt
const decrypted = vault.decrypt(encrypted);
```

## Testes

```bash
# Rodar todos os testes
npm test

# Rodar testes específicos
npm test -- --grep "ArchitectAgent"
npm test -- --grep "CoderAgent"
npm test -- --grep "SecretsVault"
```

## Estrutura de Arquivos

```
packages/ai-ide/
├── src/
│   ├── browser/
│   │   ├── agent-base.ts                    # Base class para agentes
│   │   ├── architect-agent-new.ts           # Architect Agent
│   │   ├── coder-agent-new.ts               # Coder Agent
│   │   ├── llm-provider-service.ts          # Serviço de providers
│   │   └── __tests__/
│   │       ├── architect-agent-new.spec.ts
│   │       └── coder-agent-new.spec.ts
│   ├── common/
│   │   └── streaming.ts                     # Sistema de streaming
│   └── node/
│       ├── secrets-vault.ts                 # Vault de secrets
│       └── __tests__/
│           └── secrets-vault.spec.ts
└── README.md
```

## Configuração

### Providers LLM

Configure providers em `Settings > AI > Providers`:

```json
{
    "ai.externalProviders": [
        {
            "id": "openai",
            "name": "OpenAI",
            "type": "custom",
            "config": {
                "endpoint": "https://api.openai.com/v1/chat/completions",
                "apiKey": "encrypted-key-here"
            }
        }
    ]
}
```

### Master Key

Para usar o secrets vault, configure a master key:

```bash
# Gerar nova master key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Configurar como variável de ambiente
export AI_SECRETS_MASTER_KEY="your-base64-key"
```

## Desenvolvimento

### Adicionar Novo Agente

1. Criar arquivo `my-agent.ts`:
```typescript
import { Agent, AgentRequest, AgentResponse, AgentContext } from './agent-base';

export class MyAgent extends Agent {
    static readonly ID = 'my-agent';
    static readonly NAME = 'My Agent';
    
    async invoke(request: AgentRequest, context: AgentContext): Promise<AgentResponse> {
        // Implementação
    }
}
```

2. Criar testes `__tests__/my-agent.spec.ts`

3. Registrar no `frontend-module.ts`

### Boas Práticas

- Sempre use tipos TypeScript estritos
- Adicione testes para novos agentes
- Use o sistema de streaming para respostas longas
- Criptografe API keys com o secrets vault
- Adicione logs estruturados para debugging
- Trate erros graciosamente

## Roadmap

- [x] Architect Agent
- [x] Coder Agent
- [x] Sistema de Streaming
- [x] Secrets Vault
- [ ] Memory Service (Vector DB)
- [ ] Multi-agent Workflows
- [ ] Visual Scripting
- [ ] Real-time Collaboration

## Contribuindo

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Apache 2.0
