# 🔐 Sistema de Credenciais Seguras - Aethel Engine

## Visão Geral

Sistema unificado de gerenciamento de credenciais que permite às IAs solicitarem e usarem dados sensíveis dos usuários de forma segura, transparente e fluida.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE CREDENCIAIS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   IA Precisa de Acesso                                                       │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────┐     ┌─────────────┐     ┌──────────────┐                 │
│   │ Verifica se  │ Não │ Solicita ao │     │ Usuário      │                 │
│   │ já existe no ├────►│ Usuário via ├────►│ fornece no   │                 │
│   │    Vault     │     │    Chat     │     │ LivePreview  │                 │
│   └──────┬───────┘     └─────────────┘     └──────┬───────┘                 │
│          │ Sim                                     │                         │
│          │                                         ▼                         │
│          │              ┌─────────────────────────────────────┐             │
│          │              │ Criptografa com AES-256-GCM         │             │
│          │              │ Armazena no Secure Vault            │             │
│          │              └──────────────┬──────────────────────┘             │
│          │                             │                                     │
│          ▼                             ▼                                     │
│   ┌────────────────────────────────────────────────────────────┐            │
│   │               IA USA CREDENCIAL COM PERMISSÃO               │            │
│   │                  (Auditoria completa)                       │            │
│   └────────────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Arquitetura

### Componentes

```
src/common/credentials/
├── credential-types.ts       # Tipos e interfaces
├── secure-vault.ts           # Cofre criptografado
├── credential-flow-manager.ts# Gerenciador de fluxo
├── credential-ui-controller.ts# Controlador de UI
└── index.ts                  # Exports
```

### Secure Vault

Cofre criptografado para armazenamento seguro:

- **Criptografia**: AES-256-GCM
- **Derivação de Chave**: PBKDF2 (100.000 iterações)
- **Auto-Lock**: 15 minutos de inatividade
- **Lockout**: 5 tentativas falhas = 30 min bloqueio
- **Auditoria**: Log de todos os acessos

### Categorias de Credenciais

| Categoria | Exemplos | Nível de Segurança |
|-----------|----------|-------------------|
| `trading` | Binance, MetaTrader | Critical |
| `freelance` | Upwork, Fiverr | High |
| `email` | Gmail, SMTP | High |
| `development` | GitHub, npm | High |
| `cloud` | AWS, GCP, Azure | Critical |
| `ai` | OpenAI, Anthropic | High |
| `social` | Twitter, LinkedIn | High |
| `custom` | Qualquer outro | High |

## Fluxo de Uso

### 1. IA Solicita Credencial

```typescript
// Dentro de um agente
const access = credentialFlow.createAgentAccess('trading-ai');

const response = await access.requestCredential(
  'binance',                    // Schema ID
  'Conectar à exchange',        // Motivo
  currentWorkflow               // Contexto
);

if (response.success) {
  // Usar credencial
  const values = await access.useCredential(response.credentialId!, 'trade');
}
```

### 2. Usuário Vê no Chat

```
📈 **Trading AI** precisa de acesso a **Binance** para continuar.

_"Conectar à exchange para análise de mercado"_

🔒 Seus dados serão criptografados com AES-256.

[🔐 Configurar Acesso] [Agora não]
```

### 3. Formulário no LivePreview

O LivePreview exibe um formulário seguro:

```
┌─────────────────────────────────────────────┐
│ 🔐 Configurar Acesso                        │
├─────────────────────────────────────────────┤
│                                             │
│ 📈 Trading AI (verificado)                  │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ API Key                                 │ │
│ │ ●●●●●●●●●●●●●●●●                        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ API Secret                              │ │
│ │ ●●●●●●●●●●●●●●●●                        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 🔒 Criptografia: AES-256-GCM               │
│ 💾 Armazenamento: Criptografado localmente │
│ ⏰ Retenção: Até revogação manual          │
│                                             │
│ [Autorizar]                     [Cancelar] │
└─────────────────────────────────────────────┘
```

### 4. IA Continua Automaticamente

Após o usuário fornecer as credenciais, o workflow resume automaticamente.

## Comandos de Chat

```
@credentials list       - Listar credenciais armazenadas
@credentials status     - Status do vault
@credentials lock       - Bloquear vault
@credentials history    - Ver histórico de acessos
@credentials manage     - Abrir gerenciador
@credentials help       - Ajuda
```

## Schemas Pré-definidos

### Trading

```typescript
'binance': {
  fields: ['api_key', 'api_secret'],
  permissions: ['read', 'use', 'trade'],
  securityLevel: 'critical',
}

'metatrader': {
  fields: ['server', 'login', 'password'],
  permissions: ['read', 'use', 'trade'],
  securityLevel: 'critical',
}
```

### Freelance

```typescript
'upwork': {
  fields: ['email', 'password', 'mfa'],
  permissions: ['read', 'use', 'execute'],
  securityLevel: 'high',
}
```

### Email

```typescript
'gmail': {
  fields: ['email', 'app_password'],
  permissions: ['read', 'use', 'send_email'],
  securityLevel: 'high',
}
```

### Development

```typescript
'github': {
  fields: ['token'],
  permissions: ['read', 'use', 'commit_code', 'deploy'],
  securityLevel: 'high',
}
```

## Sistema de Permissões

### Tipos de Permissão

| Permissão | Descrição |
|-----------|-----------|
| `read` | Ler dados não sensíveis |
| `use` | Usar para autenticação |
| `execute` | Executar operações |
| `trade` | Operações de trading |
| `transfer` | Transferências financeiras |
| `send_email` | Enviar emails |
| `post_social` | Postar em redes sociais |
| `commit_code` | Commit em repositórios |
| `deploy` | Deploy de aplicações |
| `admin` | Acesso administrativo |

### Solicitação de Permissão

```typescript
// IA solicita permissão específica
const grant = await access.requestPermission(
  credentialId,
  ['trade', 'read'],
  'Executar ordem de compra'
);

if (grant) {
  // Permissão concedida por 1 hora
  console.log(`Permissão válida até ${grant.expiresAt}`);
}
```

## Workflows Integrados

### Trading Autônomo

```
1. 🔌 Conectar à Corretora (requer: binance)
2. 📊 Analisar Mercado
3. 🎯 Aplicar Estratégia
4. 💹 Executar Trades
5. 👁️ Monitorar Posições
```

### Freelance

```
1. 🔑 Login na Plataforma (requer: upwork)
2. 🔍 Buscar Projetos
3. 📝 Filtrar Oportunidades
4. 📋 Analisar Requisitos
5. ✍️ Criar Proposta
6. 📤 Enviar Aplicação
```

### Email

```
1. 📧 Conectar ao Email (requer: gmail)
2. 📥 Buscar Emails
3. 🏷️ Categorizar
4. ✉️ Rascunhar Respostas
5. 📂 Organizar
```

## Segurança

### Criptografia

```
Master Password
      │
      ▼
   PBKDF2 (100k iterations, SHA-256)
      │
      ▼
   256-bit Key
      │
      ▼
   AES-256-GCM
      │
      ▼
   Encrypted Data + Auth Tag
```

### Proteções

1. **Master Password nunca armazenada**
2. **Auto-lock após inatividade**
3. **Lockout após tentativas falhas**
4. **Auditoria de todos os acessos**
5. **Permissões com expiração**
6. **Confirmação para operações críticas**

### Níveis de Segurança

| Nível | Comportamento |
|-------|---------------|
| `low` | Cache em memória |
| `medium` | Criptografado em disco |
| `high` | Criptografado + confirmação |
| `critical` | Nunca persistido, sempre solicita |

## Integração com LivePreview

### Painel de Credenciais

```
┌─────────────────────────────────────────────────────────┐
│ 🔐 Gerenciador de Credenciais                    [×]    │
├─────────────────────────────────────────────────────────┤
│ [Credenciais] [Histórico] [Configurações]               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📦 Credenciais Armazenadas                             │
│ ─────────────────────────────                          │
│ 🪙 Binance API        ✅ Verificada     2h atrás      │
│ 🐙 GitHub Token       ✅ Verificada     1d atrás      │
│ 📧 Gmail App          ⚠️ Expira em 7d   3d atrás      │
│                                                         │
│ 📜 Atividade Recente                                   │
│ ─────────────────────                                  │
│ 🔑 Trading AI usou Binance        há 5 min            │
│ ✅ Permissão concedida            há 10 min           │
│ 🔓 Vault desbloqueado             há 1h               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Workflow Panel

```
┌─────────────────────────────────────────────────────────┐
│ 📈 Trading Autônomo                    ▶ Em Progresso   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░  40%    │
│                                                         │
│ ✅ Conectar à Corretora                    00:02       │
│ ✅ Analisar Mercado                        00:15       │
│ 🔄 Aplicar Estratégia                      ...         │
│ ⏳ Executar Trades                                      │
│ ⏳ Monitorar Posições                                   │
│                                                         │
│ ⏱️ Iniciado: 14:30  |  Tempo: 00:17                    │
│                                                         │
│               [⏸ Pausar]  [⏹ Cancelar]                 │
└─────────────────────────────────────────────────────────┘
```

## Exemplo Completo

```typescript
import { 
  SecureVault, 
  CredentialFlowManager, 
  CredentialUIController 
} from '@aethel/credentials';
import { WorkflowManager, WorkflowLivePreview } from '@aethel/workflows';

// 1. Inicializar sistema
const vault = new SecureVault();
const flowManager = new CredentialFlowManager(vault);
const credentialUI = new CredentialUIController(vault, flowManager);
const workflowManager = new WorkflowManager(flowManager);
const workflowPreview = new WorkflowLivePreview(workflowManager, credentialUI);

// 2. Desbloquear vault (senha do usuário)
await vault.initialize(userMasterPassword);

// 3. Criar acesso para um agente
const tradingAccess = flowManager.createAgentAccess('trading-ai');

// 4. Iniciar workflow
const workflow = await workflowManager.startWorkflow(
  'trading-auto',
  userId,
  'trading-ai'
);

// 5. O sistema cuida do resto:
// - Solicita credenciais se necessário
// - Mostra progresso no LivePreview
// - Executa steps automaticamente
// - Notifica usuário de ações necessárias

// 6. Eventos
workflowPreview.on('chatMessage', (msg) => {
  // Exibir no chat
});

credentialUI.on('notification', (notif) => {
  // Exibir notificação
});
```

## Extensibilidade

### Adicionar Novo Schema

```typescript
CREDENTIAL_SCHEMAS['minha_api'] = {
  id: 'minha_api',
  name: 'Minha API',
  category: 'custom',
  icon: '🔧',
  description: 'API personalizada',
  securityLevel: 'high',
  fields: [
    { id: 'api_key', type: 'api_key', label: 'API Key', required: true, sensitive: true, mask: true },
    { id: 'endpoint', type: 'endpoint_url', label: 'Endpoint', required: true, sensitive: false, mask: false },
  ],
  permissions: ['read', 'use', 'execute'],
};
```

### Registrar Novo Agente

```typescript
REGISTERED_AGENTS['meu-agente'] = {
  id: 'meu-agente',
  name: 'Meu Agente',
  icon: '🤖',
  description: 'Agente personalizado',
  trustLevel: 'trusted',
  capabilities: ['custom_action'],
  requiredCredentials: ['minha_api'],
  optionalCredentials: [],
};
```

### Adicionar Novo Workflow

```typescript
WORKFLOW_DEFINITIONS['meu-workflow'] = {
  id: 'meu-workflow',
  name: 'Meu Workflow',
  type: 'custom',
  description: 'Workflow personalizado',
  icon: '⚙️',
  requiredCredentials: ['minha_api'],
  optionalCredentials: [],
  category: 'custom',
  steps: [
    { id: 'step1', name: 'Primeiro Passo', description: '...', action: 'custom_action' },
    // ...
  ],
};
```

## Arquivos

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| credential-types.ts | ~500 | Tipos e schemas |
| secure-vault.ts | ~450 | Cofre criptografado |
| credential-flow-manager.ts | ~500 | Gerenciador de fluxo |
| credential-ui-controller.ts | ~550 | Controlador de UI |
| workflow-manager.ts | ~500 | Gerenciador de workflows |
| workflow-livepreview.ts | ~450 | Integração LivePreview |
| **Total** | **~2,950** | |
