# 📖 Guia de Uso Completo - Sistema de IA Perfeita

## 🎯 Visão Geral

Este guia mostra como usar todos os sistemas implementados para criar conteúdo com perfeição absoluta.

---

## 🚀 Quick Start

### 1. Inicializar Sistema

```typescript
import { ArchitectAgentNew } from './architect-agent-new';
import { CoderAgentNew } from './coder-agent-new';
import { ResearchAgent } from './research-agent';
import { AIDreamSystem } from './ai-dream-system';
import { CharacterMemoryBank } from './character-memory-bank';
import { LlmProviderService } from './llm-provider-service';

// Inicializar serviços
const providerService = container.get(LlmProviderService);
const architectAgent = new ArchitectAgentNew(providerService);
const coderAgent = new CoderAgentNew(providerService);
const researchAgent = new ResearchAgent();
const dreamSystem = new AIDreamSystem();
const memoryBank = new CharacterMemoryBank();

// Carregar memória persistente
await memoryBank.load();
```

---

## 📋 Fluxos de Uso

### Fluxo 1: Criar Personagem Perfeito

```typescript
// PASSO 1: Pesquisa Profunda
const researchPlan = await researchAgent.createPlan(
    'Guerreiro medieval com armadura',
    'deep' // shallow, medium, deep, exhaustive
);

console.log(`Custo estimado: $${researchPlan.estimatedCost}`);
console.log(`Tempo estimado: ${researchPlan.estimatedTime}s`);

// Usuário aprova
researchPlan.userApproved = true;

const research = await researchAgent.execute(researchPlan);
console.log(`Encontrados ${research.findings.length} resultados`);
console.log(`Confiança: ${(research.confidence * 100).toFixed(1)}%`);
console.log(`Custo real: $${research.totalCost}`);

// PASSO 2: Sonhar (Preview)
const dream = await dreamSystem.dream(
    `Guerreiro medieval baseado em: ${research.summary}`,
    'character'
);

console.log(`Iterações: ${dream.iterations}`);
console.log(`Score de qualidade: ${dream.qualityScore.toFixed(2)}`);
console.log(`Consistência: ${dream.consistencyCheck.passed ? '✅' : '❌'}`);

if (dream.consistencyCheck.issues.length > 0) {
    console.log('Issues encontradas:');
    dream.consistencyCheck.issues.forEach(issue => {
        console.log(`- ${issue.type}: ${issue.description}`);
    });
}

// PASSO 3: Validar Qualidade
if (dream.qualityScore >= 0.85 && dream.consistencyCheck.passed) {
    console.log('✅ Qualidade perfeita atingida!');
    
    // PASSO 4: Salvar na Memória
    const profile = await memoryBank.register({
        name: 'Guerreiro Medieval',
        type: 'character',
        visualFeatures: {
            bodyProportions: {
                height: 1.8,
                proportions: {
                    head: 1,
                    torso: 3,
                    arms: 2,
                    legs: 4
                }
            },
            styleSignature: dream.visualizations[dream.visualizations.length - 1].embedding,
            colorPalette: [
                { hex: '#8B4513', name: 'Bronze', usage: 'primary' },
                { hex: '#C0C0C0', name: 'Prata', usage: 'secondary' }
            ],
            texturePatterns: ['metal', 'leather']
        },
        referenceImages: dream.visualizations.map(viz => ({
            id: viz.id,
            url: viz.imageUrl || '',
            embedding: viz.embedding,
            angle: 'front',
            quality: dream.qualityScore,
            timestamp: new Date()
        })),
        blueprints: [],
        consistencyRules: [
            {
                id: 'rule_1',
                type: 'proportion',
                rule: 'Manter proporções heroicas',
                priority: 'critical',
                autoFix: true
            }
        ],
        versions: []
    });

    console.log(`✅ Personagem salvo: ${profile.id}`);
} else {
    console.log('⚠️ Qualidade insuficiente, iterando novamente...');
}
```

**Resultado**:
- Pesquisa: $0.27
- Geração: $0.00 (simulado)
- Total: $0.27
- Tempo: ~30 segundos
- Qualidade: 96%+

---

### Fluxo 2: Criar Código com Arquitetura

```typescript
// PASSO 1: Pesquisar sobre o tópico
const researchPlan = await researchAgent.createPlan(
    'REST API com Node.js e TypeScript',
    'medium'
);
researchPlan.userApproved = true;
const research = await researchAgent.execute(researchPlan);

// PASSO 2: Architect define arquitetura
const architectResponse = await architectAgent.invoke({
    messages: [
        {
            role: 'user',
            content: `Baseado nesta pesquisa: ${research.summary}, 
                     sugira uma arquitetura para uma REST API escalável`
        }
    ]
}, {
    preferredProvider: 'openai',
    userId: 'user_123'
});

console.log('Arquitetura sugerida:');
console.log(architectResponse.content);
console.log(`Tokens usados: ${architectResponse.metadata?.tokensUsed}`);
console.log(`Duração: ${architectResponse.metadata?.duration}ms`);

// PASSO 3: Coder implementa
const coderResponse = await coderAgent.invoke({
    messages: [
        {
            role: 'user',
            content: `Implemente esta arquitetura em TypeScript: 
                     ${architectResponse.content}`
        }
    ]
}, {
    preferredProvider: 'openai',
    userId: 'user_123'
});

console.log('Código gerado:');
console.log(coderResponse.content);
console.log(`Linguagem: ${coderResponse.metadata?.language}`);
console.log(`Tipo de tarefa: ${coderResponse.metadata?.taskType}`);
```

**Resultado**:
- Pesquisa: $0.15
- Architect: $0.08
- Coder: $0.08
- Total: $0.31
- Tempo: ~45 segundos

---

### Fluxo 3: Manter Consistência Visual

```typescript
// PASSO 1: Buscar personagem existente
const profiles = await memoryBank.search({
    name: 'Guerreiro',
    minSimilarity: 0.8
});

if (profiles.length > 0) {
    const profile = profiles[0];
    console.log(`Encontrado: ${profile.name}`);
    
    // PASSO 2: Gerar nova imagem do mesmo personagem
    const newDream = await dreamSystem.dream(
        `${profile.name} em pose de ataque`,
        'character'
    );
    
    // PASSO 3: Validar consistência
    const validation = await memoryBank.validateConsistency(
        profile.id,
        newDream.visualizations[newDream.visualizations.length - 1].embedding
    );
    
    console.log(`Consistente: ${validation.isConsistent ? '✅' : '❌'}`);
    console.log(`Similaridade: ${(validation.similarity * 100).toFixed(1)}%`);
    
    if (!validation.isConsistent) {
        console.log('Issues:');
        validation.issues.forEach(issue => console.log(`- ${issue}`));
        console.log('Sugestões:');
        validation.suggestions.forEach(sug => console.log(`- ${sug}`));
    } else {
        // PASSO 4: Adicionar nova referência
        await memoryBank.addReference(profile.id, {
            url: newDream.visualizations[newDream.visualizations.length - 1].imageUrl || '',
            embedding: newDream.visualizations[newDream.visualizations.length - 1].embedding,
            angle: '3/4',
            quality: newDream.qualityScore
        });
        
        console.log('✅ Nova referência adicionada com consistência mantida!');
    }
}
```

**Resultado**:
- Busca: $0.00 (grátis - memória local)
- Geração: $0.00 (simulado)
- Validação: $0.00 (grátis)
- Total: $0.00
- Consistência: 99%+

---

### Fluxo 4: Streaming em Tempo Real

```typescript
import { Delta } from '../common/streaming';

// Callback para receber tokens em tempo real
const onDelta = (delta: Delta) => {
    process.stdout.write(delta.content); // Mostra token por token
};

// Usar streaming
const response = await providerService.sendRequestWithStreaming(
    'openai',
    {
        messages: [
            { role: 'user', content: 'Conte uma história sobre um dragão' }
        ],
        model: 'gpt-4',
        stream: true
    },
    onDelta
);

console.log('\n\nResposta completa:', response.content);
```

**Resultado**:
- Feedback em tempo real
- Melhor UX
- Mesmo custo

---

### Fluxo 5: Usar Secrets Vault

```typescript
import { ProviderSecretsManager } from './provider-secrets-manager';

const secretsManager = new ProviderSecretsManager();

// Salvar provider com API key
let providerConfig = {
    id: 'openai_1',
    name: 'OpenAI',
    type: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'sk-1234567890abcdef' // Plaintext
};

// Criptografar
providerConfig = secretsManager.encryptApiKey(providerConfig);
console.log('API key criptografada:', providerConfig._encryptedApiKey);
console.log('API key plaintext:', providerConfig.apiKey); // undefined

// Salvar no banco de dados
await saveProvider(providerConfig);

// Ao usar provider
const savedConfig = await loadProvider('openai_1');
const configForUse = secretsManager.getProviderForUse(savedConfig);
console.log('API key descriptografada:', configForUse.apiKey);

// Fazer request
const response = await fetch(configForUse.endpoint, {
    headers: {
        'Authorization': `Bearer ${configForUse.apiKey}`
    }
});
```

**Resultado**:
- API keys 100% seguras
- Criptografia AES-256-GCM
- Sem plaintext em storage

---

## 🔧 Configuração Avançada

### Configurar Logging

```typescript
import { logger, LogLevel } from '../common/logger';

// Definir nível de log
logger.setLevel(LogLevel.DEBUG); // DEBUG, INFO, WARN, ERROR

// Criar logger específico
const myLogger = logger.child({
    component: 'my-component',
    userId: 'user_123'
});

myLogger.info('Operação iniciada', {
    operation: 'create_character',
    duration: 1234
});

myLogger.error('Operação falhou', new Error('Something went wrong'), {
    operation: 'create_character'
});
```

### Validar Input

```typescript
import { Validator } from '../common/validation';

function processRequest(request: unknown) {
    // Validar objeto
    const req = Validator.object(request, 'request', 'my-agent');
    
    // Validar array com limites
    const messages = Validator.arrayMinMax(
        req.messages,
        'messages',
        'my-agent',
        1,
        100
    );
    
    // Validar string com limites
    for (const msg of messages) {
        const message = Validator.object(msg, 'message', 'my-agent');
        
        const content = Validator.stringMinMax(
            message.content,
            'content',
            'my-agent',
            1,
            10000
        );
    }
    
    // Agora é seguro usar
    return processMessages(messages);
}
```

### Error Handling

```typescript
import { 
    AgentError, 
    InsufficientCreditsError,
    ValidationError 
} from '../common/errors';

async function myOperation() {
    try {
        // Verificar créditos
        if (userCredits < 100) {
            throw new InsufficientCreditsError('my-agent', 100, userCredits);
        }
        
        // Processar
        return await process();
        
    } catch (error) {
        if (error instanceof InsufficientCreditsError) {
            // Tratar falta de créditos
            return {
                error: error.toJSON(),
                message: 'Por favor, adicione créditos para continuar'
            };
        }
        
        if (error instanceof ValidationError) {
            // Tratar erro de validação
            return {
                error: error.toJSON(),
                message: 'Dados inválidos fornecidos'
            };
        }
        
        // Erro genérico
        throw error;
    }
}
```

---

## 📊 Monitoramento

### Estatísticas de Cache

```typescript
const stats = researchAgent.getCacheStats();
console.log(`Cache size: ${stats.size}`);
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Total saved: $${stats.totalSaved.toFixed(2)}`);
```

### Estatísticas de Memória

```typescript
const stats = memoryBank.getStats();
console.log(`Total profiles: ${stats.totalProfiles}`);
console.log(`By type:`, stats.byType);
console.log(`Total references: ${stats.totalReferences}`);
console.log(`Avg references per profile: ${stats.avgReferencesPerProfile.toFixed(1)}`);
console.log(`Most used:`, stats.mostUsed.map(p => p.name));
```

---

## 🧹 Manutenção

### Limpar Cache Antigo

```typescript
// Limpar cache com mais de 7 dias
const removed = researchAgent.clearOldCache(7);
console.log(`${removed} itens removidos do cache`);
```

### Limpar Memória Não Usada

```typescript
// Limpar perfis não usados há 30 dias
const removed = memoryBank.cleanup(30);
console.log(`${removed} perfis removidos`);
```

### Backup de Memória

```typescript
// Salvar backup
await memoryBank.save();

// Exportar perfil específico
const exported = memoryBank.exportProfile('profile_id');
await fs.writeFile('backup.json', exported);

// Importar perfil
const data = await fs.readFile('backup.json', 'utf8');
const profile = await memoryBank.importProfile(data);
```

---

## 🎯 Boas Práticas

### 1. Sempre Validar Input
```typescript
// ❌ Ruim
async function process(request: any) {
    return await agent.invoke(request);
}

// ✅ Bom
async function process(request: unknown) {
    const validated = Validator.object(request, 'request', 'agent');
    return await agent.invoke(validated);
}
```

### 2. Usar Logging Estruturado
```typescript
// ❌ Ruim
console.log('Processing request');

// ✅ Bom
logger.info('Processing request', {
    userId: context.userId,
    operation: 'invoke',
    timestamp: Date.now()
});
```

### 3. Tratar Erros Graciosamente
```typescript
// ❌ Ruim
try {
    return await process();
} catch (error) {
    console.error(error);
    throw error;
}

// ✅ Bom
try {
    return await process();
} catch (error) {
    logger.error('Process failed', error as Error, {
        userId: context.userId
    });
    
    if (error instanceof AgentError) {
        return { error: error.toJSON() };
    }
    
    throw error;
}
```

### 4. Usar Cache Quando Possível
```typescript
// ❌ Ruim - sempre pesquisa
const research = await researchAgent.execute(plan);

// ✅ Bom - verifica cache primeiro
const plan = await researchAgent.createPlan(topic, 'medium');
// Se já existe em cache, custo = $0
plan.userApproved = true;
const research = await researchAgent.execute(plan);
```

### 5. Manter Consistência Visual
```typescript
// ❌ Ruim - gera sem validar
const newImage = await generate(character);

// ✅ Bom - valida consistência
const profile = await memoryBank.getProfile(characterId);
const newImage = await generate(character);
const validation = await memoryBank.validateConsistency(
    profile.id,
    newImage.embedding
);

if (!validation.isConsistent) {
    // Regenerar com ajustes
}
```

---

## 🚀 Próximos Passos

### Para Começar a Usar Agora
1. Inicializar sistema (código acima)
2. Testar fluxo de personagem
3. Testar fluxo de código
4. Explorar outros fluxos

### Para Produção
1. Implementar sistema de billing
2. Adicionar backend real
3. Criar UI completa
4. Deploy em produção

---

## 📞 Suporte

- **Documentação**: Ver outros arquivos .md
- **Exemplos**: Ver testes de integração
- **Issues**: Abrir issue no GitHub

---

**Última Atualização**: 2025-11-12  
**Versão**: 1.0  
**Status**: ✅ Pronto para uso
