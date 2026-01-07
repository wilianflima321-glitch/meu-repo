# PLANO DE OPERAÇÕES E ADMINISTRAÇÃO (AETHEL OPS 2026)

**Objetivo:** Transformar a Área Admin de uma "lista de pastas vazias" em um **Centro de Comando Operacional** real.
**Filosofia:** "Se não gera dado ou controle, não existe." (Zero Mocks).

---

## 1. DIAGNÓSTICO ATUAL (O QUE TEMOS VS. O QUE PRECISAMOS)
*   **Estado Atual:**
    *   `app/admin` possui ~40 subpastas (`ai-evolution`, `banking`, `bias-detection`).
    *   **Veredito:** Isso é bloatware. Nenhuma startup tem um painel dedicado a "Evolução da IA". Isso são métricas, não páginas.
    *   A página principal é uma tabela HTML simples.
*   **Meta Studio Quality:**
    *   Dashboard denso (Information Desktop).
    *   Gráficos em tempo real (Tremor/Recharts).
    *   Ações imediatas (Banir, Reembolsar, Desligar).

---

## 2. ARQUITETURA DE DADOS REAIS (SEM MOCKS)
Para o painel funcionar, ele precisa ler de fontes reais.

| Módulo Admin | Fonte de Dados Real | Implementação Necessária |
| :--- | :--- | :--- |
| **Financeiro** | Stripe API (Balance/Transactions) | Webhook Listener para salvar `stripe_events` no DB local para consulta rápida. |
| **Custos IA** | OpenAI Usage API + Log Interno | Tabela `UsageLogs` no Prisma (User, Tokens, Model, Cost). |
| **Infra K8s** | Kubernetes API / Vercel API | Endpoint seguro que roda `kubectl get pods` e retorna JSON. |
| **Usuários** | Prisma Database (`User` table) | CRUD direto no banco de produção. |

---

## 3. ESTRUTURA VISUAL E UX (ADMIN LAYOUT)
O Admin não deve parecer o App. Ele deve parecer um terminal da Bloomberg.
*   **Dark Mode Obrigatório:** Para reduzir cansaço visual da equipe de Ops.
*   **Densidade de Dados:** Tabelas compactas, fontes mono-espaçadas para IDs.
*   **Sidebar Simplificada:** (Apenas 4 botões, não 40).

### Novo Sitemap Proposto (Simplificação Radical):
```bash
app/admin/
├── page.tsx            # Visão Geral (MRR, Erros, Alertas)
├── users/              # Busca, Ban, Dar Acesso Studio, Ver Projetos
├── finance/            # Stripe Connect Logs, Saques, Custos de Nuvem
├── ai-ops/             # Monitor de Tokens, Logs de Conversa (Shadow Mode)
└── system/             # Feature Flags, Manutenção, Build Queue
```

---

## 4. DETALHAMENTO DE FUNCIONALIDADES (O QUE CODIFICAR)

### 4.1 Módulo Financeiro (O "CFO")
*   **KPIs:**
    *   **MRR (Monthly Recurring Revenue):** Soma das assinaturas ativas.
    *   **Net Revenue:** (Receita Stripe - Custo OpenAI - Custo AWS).
    *   **Burn Rate:** Velocidade de queima de caixa diária.
*   **Ações:**
    *   *Refund Button:* Reembolsar usuário irritado com 1 clique.
    *   *Grant Credits:* Dar 1000 créditos para compensar um bug.

### 4.2 Módulo AI Ops (O "LLM Manager")
*   **Visão de "Raio-X":**
    *   Lista das últimas 100 requisições de IA.
    *   Coluna "Custo" em vermelho se > $0.50 por request.
    *   Link para ver o Prompt exato e a Resposta (Auditoria de Qualidade).
*   **Panic Button:**
    *   Se a API da OpenAI cair ou começar a alucinar, botão **"Switch to Anthropic"** global.

### 4.3 Módulo de Moderação (O "Police")
*   **Fila de Revisão:**
    *   Jogos que ganharam tração (>100 players) aparecem aqui automaticamente.
    *   Admin clica para "Verificação Humana" (Jogar o jogo).
*   **Trust & Safety:**
    *   Bloquear usuário de publicar (mas deixar jogar).
    *   Banir IP e Fingerprint do Browser.

---

## 5. TRAVAS DE SEGURANÇA (RBAC)
Não podemos deixar qualquer um entrar aqui.
*   **Middleware:**
    *   `lib/rbac.ts` deve verificar `user.role === 'ADMIN'` e `user.email === 'seu-email@aethel.com'`.
*   **Audit Log Admin:**
    *   "Quem baniu o usuário X?" -> O sistema deve logar as ações dos administradores.

---

## 6. PRÓXIMOS PASSOS (LIMPEZA)
1.  **Deletar** as pastas inúteis em `app/admin/` (`ai-evolution`, `banking`, etc).
2.  **Criar** o Layout base (`app/admin/layout.tsx`) com a Sidebar simplificada.
3.  **Implementar** a Dashboard principal conectada a dados reais (começando por Usuários do Prisma).
