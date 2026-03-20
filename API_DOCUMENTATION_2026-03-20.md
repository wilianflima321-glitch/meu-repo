# API Documentation — Aethel Studio v2.1.0
**Data:** 20 de Março de 2026
**Versão:** 1.0 (Final)
**Base URL:** `https://api.aethel.app`

---

## 1. Autenticação

### 1.1. OAuth2 (Recomendado)

```bash
# 1. Redirecionar usuário para login
https://aethel.app/auth/signin?callbackUrl=/dashboard

# 2. Aethel redireciona para callback com code
https://seu-app.com/callback?code=...&state=...

# 3. Trocar code por token
POST /api/auth/callback/credentials
Content-Type: application/json

{
  "code": "...",
  "state": "..."
}

# Response
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshToken": "...",
  "expiresIn": 3600
}
```

### 1.2. API Key

```bash
# Incluir em todos os requests
Authorization: Bearer sk_live_...

# Ou como header customizado
X-API-Key: sk_live_...
```

### 1.3. Rate Limiting

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

---

## 2. Recursos

### 2.1. Autenticação

#### GET /auth/me
Obter usuário atual

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/auth/me

# Response
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "owner",
    "plan": "pro"
  }
}
```

#### POST /auth/logout
Fazer logout

```bash
curl -X POST \
  -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/auth/logout

# Response
{
  "success": true
}
```

---

### 2.2. Projetos

#### GET /projects
Listar projetos

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/projects

# Response
{
  "success": true,
  "data": [
    {
      "id": "proj_123",
      "name": "My Project",
      "type": "web",
      "status": "active",
      "createdAt": "2026-03-20T10:00:00Z"
    }
  ]
}
```

#### POST /projects
Criar projeto

```bash
curl -X POST \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Project",
    "type": "web",
    "description": "My awesome project"
  }' \
  https://api.aethel.app/projects

# Response
{
  "success": true,
  "data": {
    "id": "proj_456",
    "name": "New Project",
    "type": "web",
    "status": "active",
    "createdAt": "2026-03-20T10:00:00Z"
  }
}
```

#### GET /projects/:id
Obter projeto

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/projects/proj_123

# Response
{
  "success": true,
  "data": {
    "id": "proj_123",
    "name": "My Project",
    "type": "web",
    "status": "active",
    "owner": {...},
    "members": [...],
    "createdAt": "2026-03-20T10:00:00Z"
  }
}
```

#### PATCH /projects/:id
Atualizar projeto

```bash
curl -X PATCH \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "description": "New description"
  }' \
  https://api.aethel.app/projects/proj_123

# Response
{
  "success": true,
  "data": {...}
}
```

#### DELETE /projects/:id
Deletar projeto

```bash
curl -X DELETE \
  -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/projects/proj_123

# Response
{
  "success": true
}
```

---

### 2.3. Billing

#### GET /billing
Obter dados de billing

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/billing

# Response
{
  "success": true,
  "data": {
    "plan": "pro",
    "status": "active",
    "usage": {
      "tokens": 1500,
      "storage": 250,
      "requests": 15000
    },
    "limits": {
      "tokens": 10000,
      "storage": 1000,
      "requests": 100000
    },
    "nextBillingDate": "2026-04-20"
  }
}
```

#### POST /billing/upgrade
Fazer upgrade de plano

```bash
curl -X POST \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "pro"
  }' \
  https://api.aethel.app/billing/upgrade

# Response
{
  "success": true,
  "data": {
    "plan": "pro",
    "status": "active"
  }
}
```

#### GET /billing/usage
Obter uso de recursos

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/billing/usage

# Response
{
  "success": true,
  "data": {
    "tokens": {
      "used": 1500,
      "limit": 10000,
      "percentage": 15
    },
    "storage": {
      "used": 250,
      "limit": 1000,
      "percentage": 25
    },
    "requests": {
      "used": 15000,
      "limit": 100000,
      "percentage": 15
    }
  }
}
```

---

### 2.4. Deploy

#### POST /deploy
Iniciar deploy

```bash
curl -X POST \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_123",
    "branch": "main"
  }' \
  https://api.aethel.app/deploy

# Response
{
  "success": true,
  "data": {
    "id": "deploy_789",
    "projectId": "proj_123",
    "status": "pending",
    "createdAt": "2026-03-20T10:00:00Z"
  }
}
```

#### GET /deploy/:id
Obter status de deploy

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/deploy/deploy_789

# Response
{
  "success": true,
  "data": {
    "id": "deploy_789",
    "status": "success",
    "url": "https://proj-123.aethel.app",
    "duration": 120,
    "completedAt": "2026-03-20T10:02:00Z"
  }
}
```

#### GET /deploy/:id/logs
Obter logs de deploy

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/deploy/deploy_789/logs

# Response
{
  "success": true,
  "data": {
    "logs": "Building...\nInstalling dependencies...\nDeploying...\nSuccess!"
  }
}
```

---

### 2.5. API Keys

#### POST /api-keys
Criar API Key

```bash
curl -X POST \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "permissions": ["project:read", "deploy:create"],
    "expiresIn": 2592000
  }' \
  https://api.aethel.app/api-keys

# Response
{
  "success": true,
  "data": {
    "id": "key_123",
    "key": "sk_live_...",
    "secret": "sk_secret_...",
    "createdAt": "2026-03-20T10:00:00Z"
  }
}
```

#### GET /api-keys
Listar API Keys

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/api-keys

# Response
{
  "success": true,
  "data": [
    {
      "id": "key_123",
      "name": "Production Key",
      "status": "active",
      "createdAt": "2026-03-20T10:00:00Z"
    }
  ]
}
```

#### DELETE /api-keys/:id
Revogar API Key

```bash
curl -X DELETE \
  -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/api-keys/key_123

# Response
{
  "success": true
}
```

---

### 2.6. Webhooks

#### POST /webhooks
Criar webhook

```bash
curl -X POST \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-servidor.com/webhook",
    "events": ["deploy.success", "billing.payment.success"],
    "active": true
  }' \
  https://api.aethel.app/webhooks

# Response
{
  "success": true,
  "data": {
    "id": "wh_123",
    "url": "https://seu-servidor.com/webhook",
    "secret": "whsec_...",
    "createdAt": "2026-03-20T10:00:00Z"
  }
}
```

#### GET /webhooks
Listar webhooks

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/webhooks

# Response
{
  "success": true,
  "data": [...]
}
```

#### DELETE /webhooks/:id
Deletar webhook

```bash
curl -X DELETE \
  -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/webhooks/wh_123

# Response
{
  "success": true
}
```

---

### 2.7. Team

#### GET /team
Listar membros do time

```bash
curl -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/team

# Response
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "email": "member@example.com",
      "name": "John Doe",
      "role": "developer"
    }
  ]
}
```

#### POST /team/invite
Convidar membro

```bash
curl -X POST \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newmember@example.com",
    "role": "developer"
  }' \
  https://api.aethel.app/team/invite

# Response
{
  "success": true,
  "data": {
    "invitationId": "inv_123"
  }
}
```

#### PATCH /team/:userId/role
Alterar role

```bash
curl -X PATCH \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin"
  }' \
  https://api.aethel.app/team/user_123/role

# Response
{
  "success": true,
  "data": {...}
}
```

#### DELETE /team/:userId
Remover membro

```bash
curl -X DELETE \
  -H "Authorization: Bearer sk_live_..." \
  https://api.aethel.app/team/user_123

# Response
{
  "success": true
}
```

---

### 2.8. Auditoria

#### GET /audit
Obter logs de auditoria

```bash
curl -H "Authorization: Bearer sk_live_..." \
  "https://api.aethel.app/audit?userId=user_123&action=project:create&limit=50"

# Response
{
  "success": true,
  "data": [
    {
      "id": "audit_123",
      "userId": "user_123",
      "action": "project:create",
      "resource": "project",
      "resourceId": "proj_123",
      "status": "success",
      "timestamp": "2026-03-20T10:00:00Z"
    }
  ]
}
```

---

## 3. Webhooks

### 3.1. Payload de Webhook

```json
{
  "id": "evt_123",
  "event": "deploy.success",
  "timestamp": "2026-03-20T10:00:00Z",
  "data": {
    "deployId": "deploy_789",
    "projectId": "proj_123",
    "url": "https://proj-123.aethel.app"
  },
  "signature": "sha256=..."
}
```

### 3.2. Validar Assinatura

```javascript
const crypto = require('crypto')

function validateWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')
  
  return `sha256=${hash}` === signature
}
```

### 3.3. Tipos de Eventos

- `deploy.started`
- `deploy.success`
- `deploy.failed`
- `billing.payment.success`
- `billing.payment.failed`
- `billing.subscription.changed`
- `project.created`
- `project.updated`
- `project.deleted`
- `team.member.added`
- `team.member.removed`

---

## 4. Tratamento de Erros

### 4.1. Formatos de Erro

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key",
    "details": {
      "reason": "API key expired"
    }
  }
}
```

### 4.2. Códigos de Erro

| Código | HTTP | Descrição |
| :--- | :--- | :--- |
| UNAUTHORIZED | 401 | API key inválida ou expirada |
| FORBIDDEN | 403 | Permissão insuficiente |
| NOT_FOUND | 404 | Recurso não encontrado |
| CONFLICT | 409 | Conflito (ex: nome duplicado) |
| RATE_LIMITED | 429 | Rate limit excedido |
| SERVER_ERROR | 500 | Erro interno do servidor |

---

## 5. SDKs

### 5.1. JavaScript/TypeScript

```bash
npm install @aethel/sdk
```

```typescript
import { AethelClient } from '@aethel/sdk'

const client = new AethelClient({
  apiKey: 'sk_live_...'
})

// Usar client
const projects = await client.projects.list()
const deploy = await client.deploy.start({ projectId: 'proj_123' })
```

### 5.2. Python

```bash
pip install aethel-sdk
```

```python
from aethel import AethelClient

client = AethelClient(api_key='sk_live_...')

projects = client.projects.list()
deploy = client.deploy.start(project_id='proj_123')
```

### 5.3. Go

```bash
go get github.com/aethel/sdk-go
```

```go
import "github.com/aethel/sdk-go"

client := aethel.NewClient("sk_live_...")

projects, err := client.Projects.List()
deploy, err := client.Deploy.Start(&aethel.DeployOptions{
  ProjectID: "proj_123",
})
```

---

## 6. Boas Práticas

1. **Armazenar API Keys com Segurança** — Usar variáveis de ambiente
2. **Implementar Retry Logic** — Com backoff exponencial
3. **Validar Webhooks** — Sempre verificar assinatura
4. **Monitorar Rate Limits** — Respeitar headers de rate limit
5. **Usar Versionamento** — Planejar para futuras versões
6. **Testar em Sandbox** — Antes de ir para produção
7. **Implementar Logging** — Para debugging

---

## 7. Exemplos

### 7.1. Criar Projeto e Deploy

```javascript
const client = new AethelClient({ apiKey: 'sk_live_...' })

// 1. Criar projeto
const project = await client.projects.create({
  name: 'My App',
  type: 'web'
})

// 2. Iniciar deploy
const deploy = await client.deploy.start({
  projectId: project.id
})

// 3. Monitorar status
let status = 'pending'
while (status !== 'success' && status !== 'failed') {
  const result = await client.deploy.getStatus(deploy.id)
  status = result.status
  console.log(`Status: ${status}`)
  await new Promise(r => setTimeout(r, 5000))
}

console.log(`Deploy ${status}!`)
if (status === 'success') {
  console.log(`URL: ${result.url}`)
}
```

### 7.2. Configurar Webhook

```javascript
const client = new AethelClient({ apiKey: 'sk_live_...' })

const webhook = await client.webhooks.create({
  url: 'https://seu-servidor.com/webhook',
  events: ['deploy.success', 'billing.payment.success'],
  active: true
})

console.log(`Webhook criado: ${webhook.id}`)
console.log(`Secret: ${webhook.secret}`)
```

---

**Versão:** 1.0
**Última Atualização:** 20 de Março de 2026

