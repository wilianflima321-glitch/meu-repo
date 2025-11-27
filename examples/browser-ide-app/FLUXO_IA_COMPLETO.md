# 🤖 FLUXO DE IA COMPLETO

**Data**: 2025-11-27  
**Status**: ⚠️ MOCK - PRONTO PARA API REAL

---

## 📊 ARQUITETURA ATUAL

### **Componentes de IA**

```
┌─────────────────────────────────────────────┐
│         USUÁRIO (Interface)                 │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│      GlobalContextManager                   │
│  - Coleta contexto do projeto               │
│  - Valida consistência                      │
│  - Mantém memória de sessão                 │
│  - Previne alucinações                      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│      IntegrationHub                         │
│  - Gerencia comunicação                     │
│  - Event bus                                │
│  - State management                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│      API de IA (MOCK)                       │
│  ⚠️ Aguardando implementação real           │
│  - Análise de código                        │
│  - Geração de código                        │
│  - Sugestões inteligentes                   │
│  - Correção de erros                        │
└─────────────────────────────────────────────┘
```

---

## 🎯 FUNCIONALIDADES IMPLEMENTADAS

### **1. GlobalContextManager** ✅

#### **Contexto do Projeto**
```javascript
{
  metadata: {
    id: 'project_xxx',
    name: 'My Game',
    type: 'game',
    created: timestamp,
    modified: timestamp
  },
  
  settings: {
    genre: 'action',
    style: 'realistic',
    targetAudience: 'adults',
    language: 'en'
  },
  
  world: {
    gravity: 9.81,
    scale: 'realistic',
    physics: 'enabled',
    environment: 'urban',
    timeOfDay: 'day',
    weather: 'clear',
    rules: []
  },
  
  story: {
    theme: null,
    tone: 'neutral',
    pacing: 'medium',
    currentAct: 1,
    totalActs: 3,
    plotPoints: [],
    conflicts: [],
    resolutions: []
  },
  
  characters: [],
  scenes: [],
  assets: {
    models: [],
    textures: [],
    audio: [],
    scripts: []
  },
  
  relationships: [],
  facts: [],
  constraints: {...}
}
```

#### **Métodos Disponíveis**
```javascript
// Adicionar ao contexto
globalContext.addToContext('characters', {
  name: 'Hero',
  personality: 'brave'
});

// Obter contexto para IA
const context = globalContext.getContextForAI({
  includeMemory: true,
  memoryLimit: 20,
  includeConstraints: true
});

// Adicionar fato
globalContext.addFact({
  entity: 'player',
  property: 'health',
  value: 100
});

// Validar ação
const validation = globalContext.validateAction({
  type: 'scene',
  characterId: 'hero_1',
  action: 'jump'
});

// Buscar memória
const memories = globalContext.searchMemory('player');

// Exportar/Importar
const exported = globalContext.export();
globalContext.import(exported);

// Reset
globalContext.reset();
```

---

### **2. IntegrationHub** ✅

#### **Integração com IA**
```javascript
// Método askAI (mock)
async function askAI(prompt, context = {}) {
  const fullContext = {
    project: IntegrationHub.state.currentProject,
    code: Object.fromEntries(IntegrationHub.state.code),
    scene: IntegrationHub.state.scene,
    ...context
  };
  
  console.log('🤖 AI Request:', prompt, fullContext);
  
  // ⚠️ MOCK - Em produção, chamar API real
  return {
    response: 'AI response would go here',
    suggestions: []
  };
}
```

#### **Event System**
```javascript
// Emitir evento
IntegrationHub.emit('ai:request', {
  prompt: 'Generate player movement code',
  context: globalContext.getContextForAI()
});

// Escutar evento
IntegrationHub.on('ai:response', (response) => {
  console.log('AI Response:', response);
  // Aplicar sugestões
});
```

---

## 🔄 FLUXO DE TRABALHO

### **Cenário 1: Usuário Pede Ajuda no Editor**

```
1. Usuário clica em "AI Help" no monaco-editor
   ↓
2. GlobalContextManager coleta:
   - Código atual
   - Linguagem
   - Projeto ativo
   - Histórico recente
   ↓
3. IntegrationHub prepara request:
   {
     prompt: "Help me with this code",
     context: {
       code: "function player() {...}",
       language: "javascript",
       project: {...},
       recentActions: [...]
     }
   }
   ↓
4. ⚠️ MOCK: Retorna resposta simulada
   (Em produção: Chama API real)
   ↓
5. IntegrationHub emite evento 'ai:response'
   ↓
6. Editor recebe e mostra sugestões
   ↓
7. Usuário aceita/rejeita sugestões
   ↓
8. GlobalContextManager atualiza memória
```

---

### **Cenário 2: Geração de Código Automática**

```
1. Usuário digita comentário: "// Create player movement"
   ↓
2. Editor detecta trigger (comentário especial)
   ↓
3. GlobalContextManager coleta contexto:
   - Código existente
   - Padrões do projeto
   - Bibliotecas disponíveis
   ↓
4. IntegrationHub envia request:
   {
     prompt: "Generate player movement code",
     context: {...},
     constraints: {
       language: "javascript",
       style: "existing code style",
       libraries: ["three.js", "cannon.js"]
     }
   }
   ↓
5. ⚠️ MOCK: Retorna código simulado
   ↓
6. Editor insere código gerado
   ↓
7. GlobalContextManager valida:
   - Sintaxe correta
   - Consistência com projeto
   - Sem contradições
   ↓
8. Se válido: Aceita
   Se inválido: Pede correção
```

---

### **Cenário 3: Validação de Consistência**

```
1. Usuário adiciona personagem "Hero" com health=100
   ↓
2. GlobalContextManager adiciona fato:
   { entity: 'Hero', property: 'health', value: 100 }
   ↓
3. Usuário tenta adicionar "Hero" com health=50
   ↓
4. GlobalContextManager detecta contradição:
   - Mesmo entity
   - Mesma property
   - Valor diferente
   ↓
5. Retorna erro:
   {
     success: false,
     error: 'Fact contradicts existing facts',
     contradictions: [...]
   }
   ↓
6. Usuário corrige ou confirma mudança
   ↓
7. Se confirmado: Atualiza fato existente
```

---

## ⚠️ O QUE ESTÁ MOCK

### **1. API de IA**
```javascript
// ATUAL (mock)
async function askAI(prompt, context) {
  console.log('🤖 AI Request:', prompt, context);
  return {
    response: 'AI response would go here',
    suggestions: []
  };
}

// FUTURO (real)
async function askAI(prompt, context) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful coding assistant...'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      context: context
    })
  });
  
  return await response.json();
}
```

---

### **2. Botões de IA**
```javascript
// ATUAL (mock)
function askAI() {
  console.log('AI Help clicked');
  alert('AI feature coming soon!');
}

// FUTURO (real)
async function askAI() {
  const code = editor.getValue();
  const context = globalContext.getContextForAI();
  
  const response = await IntegrationHub.askAI(
    'Help me improve this code',
    { code, ...context }
  );
  
  showAISuggestions(response.suggestions);
}
```

---

### **3. Sugestões Automáticas**
```javascript
// ATUAL (mock)
const suggestions = [
  '• Adicionar física aos objetos',
  '• Gerar animação básica',
  '• Otimizar performance'
];

// FUTURO (real)
async function getAISuggestions() {
  const context = globalContext.getContextForAI();
  const response = await IntegrationHub.askAI(
    'Suggest improvements for this project',
    context
  );
  
  return response.suggestions.map(s => ({
    title: s.title,
    description: s.description,
    code: s.code,
    confidence: s.confidence
  }));
}
```

---

## 🚀 IMPLEMENTAÇÃO REAL

### **Passo 1: Configurar API Key**
```javascript
// config.js
const AI_CONFIG = {
  provider: 'openai', // ou 'anthropic', 'cohere', etc
  apiKey: process.env.AI_API_KEY,
  model: 'gpt-4',
  maxTokens: 2000,
  temperature: 0.7
};
```

---

### **Passo 2: Criar Serviço de IA**
```javascript
// ai-service.js
class AIService {
  constructor(config) {
    this.config = config;
    this.client = this.initializeClient();
  }
  
  initializeClient() {
    // Inicializar cliente da API
    return new OpenAI({
      apiKey: this.config.apiKey
    });
  }
  
  async generateCode(prompt, context) {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(context)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature
    });
    
    return response.choices[0].message.content;
  }
  
  buildSystemPrompt(context) {
    return `
You are an expert coding assistant for a game development IDE.

Project Context:
- Type: ${context.project.metadata.type}
- Genre: ${context.project.settings.genre}
- Language: ${context.project.settings.language}

Current State:
- Total Scenes: ${context.summary.totalScenes}
- Total Characters: ${context.summary.totalCharacters}
- Current Act: ${context.summary.currentAct}

World Rules:
- Gravity: ${context.project.world.gravity}
- Physics: ${context.project.world.physics}
- Environment: ${context.project.world.environment}

Constraints:
${JSON.stringify(context.constraints, null, 2)}

Recent Actions:
${context.recentActions.map(a => `- ${a.action}: ${a.category}`).join('\n')}

Established Facts:
${context.facts.map(f => `- ${f.entity}.${f.property} = ${f.value}`).join('\n')}

Instructions:
1. Generate code that is consistent with the project context
2. Follow established facts and constraints
3. Maintain narrative coherence
4. Use appropriate coding style
5. Include comments explaining the code
6. Suggest improvements when relevant
    `.trim();
  }
  
  async analyzecode(code, language) {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a code analysis expert. Analyze the code and provide insights.'
        },
        {
          role: 'user',
          content: `Analyze this ${language} code:\n\n${code}`
        }
      ]
    });
    
    return response.choices[0].message.content;
  }
  
  async suggestImprovements(context) {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a project improvement advisor.'
        },
        {
          role: 'user',
          content: `Based on this project context, suggest improvements:\n\n${JSON.stringify(context, null, 2)}`
        }
      ]
    });
    
    return response.choices[0].message.content;
  }
}

// Create global instance
window.AIService = new AIService(AI_CONFIG);
```

---

### **Passo 3: Integrar com IntegrationHub**
```javascript
// Atualizar integration-hub.js
async askAI(prompt, context = {}) {
  // Preparar contexto completo
  const fullContext = {
    project: this.state.currentProject,
    code: Object.fromEntries(this.state.code),
    scene: this.state.scene,
    ...globalContext.getContextForAI(),
    ...context
  };

  try {
    // Chamar serviço de IA REAL
    const response = await window.AIService.generateCode(prompt, fullContext);
    
    // Emitir evento
    this.emit('ai:response', {
      prompt,
      response,
      timestamp: Date.now()
    });
    
    return response;
  } catch (error) {
    console.error('AI Error:', error);
    this.showToast('AI service error: ' + error.message, 'error');
    return null;
  }
}
```

---

### **Passo 4: Atualizar Botões**
```javascript
// monaco-editor.html
async function askAI() {
  const code = editor.getValue();
  const selection = editor.getSelection();
  const selectedCode = editor.getModel().getValueInRange(selection);
  
  const prompt = selectedCode 
    ? `Explain and improve this code:\n${selectedCode}`
    : `Analyze this code and suggest improvements:\n${code}`;
  
  // Mostrar loading
  showLoading('Asking AI...');
  
  try {
    const response = await window.IntegrationHub.askAI(prompt);
    
    // Mostrar resposta
    showAIResponse(response);
  } catch (error) {
    showError('AI request failed: ' + error.message);
  } finally {
    hideLoading();
  }
}
```

---

## 📊 MÉTRICAS E MONITORAMENTO

### **Tracking de Uso**
```javascript
class AIMetrics {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      tokensUsed: 0,
      cost: 0
    };
  }
  
  trackRequest(request, response, duration) {
    this.metrics.totalRequests++;
    
    if (response.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    // Atualizar tempo médio
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration) 
      / this.metrics.totalRequests;
    
    // Atualizar tokens e custo
    if (response.usage) {
      this.metrics.tokensUsed += response.usage.total_tokens;
      this.metrics.cost += this.calculateCost(response.usage);
    }
  }
  
  calculateCost(usage) {
    // GPT-4 pricing (exemplo)
    const inputCost = (usage.prompt_tokens / 1000) * 0.03;
    const outputCost = (usage.completion_tokens / 1000) * 0.06;
    return inputCost + outputCost;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%',
      averageResponseTime: this.metrics.averageResponseTime.toFixed(2) + 'ms',
      totalCost: '$' + this.metrics.cost.toFixed(4)
    };
  }
}

window.AIMetrics = new AIMetrics();
```

---

## 🎯 PRÓXIMOS PASSOS

### **Fase 1: Configuração** (1-2 dias)
1. [ ] Obter API key (OpenAI, Anthropic, etc)
2. [ ] Configurar variáveis de ambiente
3. [ ] Criar ai-service.js
4. [ ] Testar conexão com API

### **Fase 2: Integração** (2-3 dias)
1. [ ] Atualizar IntegrationHub.askAI()
2. [ ] Conectar botões de IA
3. [ ] Implementar loading states
4. [ ] Implementar error handling

### **Fase 3: Features** (3-5 dias)
1. [ ] Code generation
2. [ ] Code analysis
3. [ ] Auto-suggestions
4. [ ] Code completion
5. [ ] Error fixing

### **Fase 4: Otimização** (2-3 dias)
1. [ ] Cache de respostas
2. [ ] Rate limiting
3. [ ] Cost optimization
4. [ ] Performance monitoring

---

## ✅ CONCLUSÃO

**Status Atual**:
- ✅ Arquitetura completa
- ✅ Context management robusto
- ✅ Event system funcionando
- ✅ Validação de consistência
- ⚠️ API mock (aguardando implementação real)

**Quando Implementar API Real**:
1. Obter API key
2. Criar ai-service.js
3. Atualizar IntegrationHub
4. Conectar botões
5. Testar e validar

**Tempo Estimado**: 7-13 dias para implementação completa

---

**🤖 FLUXO DE IA DOCUMENTADO E PRONTO PARA IMPLEMENTAÇÃO! 🤖**
