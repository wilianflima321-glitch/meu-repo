# 🔒 Política de Segurança - Aethel Engine

A segurança dos nossos usuários é nossa prioridade máxima. Este documento descreve nossas práticas de segurança e como reportar vulnerabilidades.

---

## 📋 Índice

- [Versões Suportadas](#versões-suportadas)
- [Reportando Vulnerabilidades](#reportando-vulnerabilidades)
- [Práticas de Segurança](#práticas-de-segurança)
- [Modelo de Ameaças](#modelo-de-ameaças)
- [Conformidade](#conformidade)

---

## 🏷️ Versões Suportadas

| Versão | Suportada | Notas |
|--------|-----------|-------|
| 2.x.x  | ✅ Sim    | Versão atual, recebe patches de segurança |
| 1.x.x  | ⚠️ Limitado | Apenas vulnerabilidades críticas |
| < 1.0  | ❌ Não    | Descontinuada |

Recomendamos sempre usar a versão mais recente.

---

## 🚨 Reportando Vulnerabilidades

### ⚠️ NÃO reporte vulnerabilidades em issues públicas!

### Canal Seguro

**Email:** security@aethel.io  
**PGP Key:** [Baixar chave pública](https://aethel.io/.well-known/security.txt)

### O Que Incluir no Relatório

```markdown
## Resumo
[Breve descrição da vulnerabilidade]

## Tipo de Vulnerabilidade
[Ex: XSS, SQL Injection, CSRF, RCE, etc.]

## Componente Afetado
[Qual parte do sistema é vulnerável]

## Passos para Reproduzir
1. [Passo detalhado]
2. [...]

## Impacto
[O que um atacante poderia fazer]

## Sugestão de Correção (opcional)
[Se você tem uma ideia de como corrigir]

## Seu Contato
[Para acompanhamento e possível recompensa]
```

### Nosso Compromisso

| Prazo | Ação |
|-------|------|
| 24 horas | Confirmação de recebimento |
| 72 horas | Avaliação inicial de severidade |
| 7 dias | Plano de ação definido |
| 30 dias | Correção implementada (críticos) |
| 90 dias | Correção implementada (outros) |

### Política de Divulgação

- **Divulgação Coordenada:** Trabalhamos com você para definir uma data de divulgação
- **Crédito:** Reconhecemos pesquisadores em nosso Hall of Fame (com consentimento)
- **Sem Retaliação:** Não tomaremos ações legais contra pesquisadores de boa-fé

---

## 🛡️ Práticas de Segurança

### Autenticação & Autorização

```typescript
// ✅ JWT com rotação de tokens
const accessToken = jwt.sign(payload, SECRET, { expiresIn: '15m' });
const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

// ✅ Validação de permissões em toda API
async function handler(req: Request) {
  const session = await validateSession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const hasPermission = await checkPermission(session.userId, 'project:write');
  if (!hasPermission) return Response.json({ error: 'Forbidden' }, { status: 403 });
  
  // ... lógica
}
```

### Proteção de Dados

| Dado | Proteção |
|------|----------|
| Senhas | bcrypt (cost factor 12) |
| Tokens | Criptografia AES-256-GCM |
| API Keys | Hash SHA-256 (armazenamento) |
| PII | Criptografia em repouso |
| Sessões | HttpOnly + Secure cookies |

### Sanitização de Input

```typescript
// ✅ Validação com Zod em todas as APIs
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[\w\s-]+$/),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(false),
});

// ✅ Escape de output
function renderUserContent(content: string) {
  return DOMPurify.sanitize(content, { ALLOWED_TAGS: ['b', 'i', 'p'] });
}
```

### Rate Limiting

```typescript
// Limites por endpoint
const rateLimits = {
  'auth/login': { window: '15m', max: 5 },      // Previne brute force
  'auth/register': { window: '1h', max: 3 },    // Previne spam
  'api/*': { window: '1m', max: 100 },          // Rate limit geral
  'ai/generate': { window: '1m', max: 10 },     // Protege recursos caros
};
```

### Proteção de Execução (Sandbox)

```typescript
// ✅ Execução de código do usuário em sandbox isolado
const sandbox = new IsolatedVM({
  memoryLimit: 128,        // MB
  timeout: 5000,           // ms
  allowedModules: [],      // Nenhum módulo externo
  filesystem: 'none',      // Sem acesso ao FS
  network: 'none',         // Sem acesso à rede
});
```

---

## 🎯 Modelo de Ameaças

### Ativos Protegidos

1. **Código-fonte dos usuários** - Projetos de jogos
2. **Credenciais** - Senhas, API keys, tokens
3. **Assets** - Modelos 3D, texturas, áudio
4. **Metadados** - Informações de conta, billing

### Vetores de Ataque Considerados

| Vetor | Mitigação |
|-------|-----------|
| Injeção (SQL, XSS, Command) | Validação Zod, sanitização, parameterized queries |
| Autenticação quebrada | JWT com refresh tokens, rate limiting |
| Exposição de dados | Criptografia, RBAC, audit logs |
| XXE | Parsing JSON apenas, sem XML |
| SSRF | Allowlist de URLs, validação de destino |
| Deserialização insegura | Schema validation, tipos explícitos |
| Componentes vulneráveis | Dependabot, npm audit, SBOM |
| Log Injection | Sanitização de logs, structured logging |

### Assumções de Segurança

- Infraestrutura cloud (AWS/GCP/Azure) é segura
- TLS 1.3 em todas as conexões
- Containers isolados por usuário
- Secrets gerenciados externamente (não em código)

---

## 📜 Conformidade

### Padrões Seguidos

- **OWASP Top 10** - Mitigações para todos os riscos
- **CWE/SANS Top 25** - Práticas de código seguro
- **NIST Cybersecurity Framework** - Identificar, Proteger, Detectar, Responder, Recuperar

### Auditorias

| Tipo | Frequência | Última |
|------|------------|--------|
| Pentest externo | Anual | Q4 2025 |
| Code review de segurança | Por release | Contínuo |
| Dependency audit | Semanal (automatizado) | Contínuo |
| SAST/DAST | Por PR (CI) | Contínuo |

### Logs de Segurança

Eventos monitorados:
- Tentativas de login falhas
- Mudanças de permissão
- Acesso a dados sensíveis
- Operações administrativas
- Erros de autorização
- Padrões anômalos de uso

---

## 🔑 Gerenciamento de Secrets

### Em Desenvolvimento

```bash
# Use .env.template como base
cp .env.template .env

# NUNCA commite .env ou secrets
# .gitignore já inclui padrões corretos
```

### Em Produção

- Secrets em AWS Secrets Manager / HashiCorp Vault
- Rotação automática de credenciais
- Princípio do menor privilégio
- Audit trail de acesso

### O Que NUNCA Fazer

```typescript
// ❌ NUNCA hardcode secrets
const API_KEY = "sk-1234567890abcdef";

// ❌ NUNCA logue secrets
console.log(`Token: ${userToken}`);

// ❌ NUNCA exponha em erros
throw new Error(`DB connection failed: ${connectionString}`);

// ✅ SEMPRE use variáveis de ambiente
const API_KEY = process.env.API_KEY;
```

---

## 🆘 Resposta a Incidentes

### Níveis de Severidade

| Nível | Descrição | Tempo de Resposta |
|-------|-----------|-------------------|
| **Crítico** | RCE, data breach, auth bypass | 4 horas |
| **Alto** | SQL injection, XSS stored, privilege escalation | 24 horas |
| **Médio** | CSRF, XSS reflected, information disclosure | 7 dias |
| **Baixo** | Best practices, hardening | 30 dias |

### Processo

1. **Detecção** - Monitoramento, relatórios, alertas
2. **Contenção** - Isolar sistemas afetados
3. **Erradicação** - Remover causa raiz
4. **Recuperação** - Restaurar operações normais
5. **Lições Aprendidas** - Post-mortem e melhorias

---

## 🏆 Hall of Fame

Agradecemos aos pesquisadores de segurança que contribuíram para a segurança do Aethel Engine:

| Pesquisador | Vulnerabilidade | Data |
|-------------|-----------------|------|
| *Seja o primeiro!* | - | - |

---

## 📞 Contato

- **Email de Segurança:** security@aethel.io
- **Relatório Urgente:** +55 (11) XXXX-XXXX (24/7)
- **PGP Fingerprint:** `XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX`

---

**Última atualização:** 20 de Janeiro de 2026  
**Versão do documento:** 1.0.0
