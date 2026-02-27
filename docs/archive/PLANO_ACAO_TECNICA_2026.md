# PLANO MESTRE DE ARQUITETURA: USUÁRIO vs. ADMIN (2026)

**Objetivo:** Segregar claramente as responsabilidades, interfaces e estruturas técnicas da plataforma entre "Quem Cria" (Usuário) e "Quem Controla" (Admin).
**Alinhamento:** Aproveitar a estrutura existente (`cloud-web-app`) sem criar repositórios novos desnecessários.

---

## 1. VISÃO GERAL DA ARQUITETURA DUAL
Não criaremos dois sites diferentes. Usaremos **RBAC (Role-Based Access Control)** na estrutura atual.

*   **Rota Pública (`/app`):** Interface Imersiva "Dark Mode", foco em criação (Unreal-like).
*   **Rota Admin (`/ops`):** Interface Densa "Data-Heavy", foco em controle (Stripe-like).

---

## 2. O LADO DO USUÁRIO (Aethel Studio)
*Foco: "Magia", Imersão, Zero-Friction.*

### 2.1 Estrutura de UX e Componentes
O usuário paga pela **produtividade**. A interface deve "esconder" a complexidade.

| Componente | Função | Qualidade Específica | Arquivo Alvo |
| :--- | :--- | :--- | :--- |
| **NewProjectWizard** | Onboarding visual (Carrossel). | **Sedução:** Animações fluídas, zero loading. | `components/dashboard/Wizard.tsx` |
| **PremiumLock** | Paywall visual elegante. | **Transparência:** Mostra o que perdeu mas não bloqueia a visão. | `components/ui/PremiumLock.tsx` |
| **SquadChatUI** | Personificação das IAs (Claude). | **Humanização:** Avatares (Arquiteto/QA) conversando entre si. | `components/ai/SquadSession.tsx` |
| **EngineViewport** | A tela do jogo. | **Performance:** WebGPU/WASM, sem travar UI. | `components/viewport/Renderer.tsx` |

### 2.2 Integração com o Agente (Claude/Squads)
O usuário não quer ver "Logs de API". Ele quer ver **Resultados**.
*   **O que o Usuário Vê:** "O Arquiteto está analisando...", "O Engenheiro criou 3 arquivos."
*   **O que o Sistema Faz:** Oculta a complexidade do Prompt Engineering.
*   **Feature Chave:** **Diff Review**. O usuário vê o código "Antes vs Depois" lado a lado (estilo GitHub PR) antes de aceitar a mudança da IA.

### 2.3 Qualidade Técnica Esperada (User-Facing)
*   **Latência:** < 100ms nas interações.
*   **Visual:** Pós-processamento (Bloom, ToneMapping) ativado por padrão para parecer "caro".
*   **Física:** Implementação Rapier3D invisível (funciona e pronto).

---

## 3. O LADO DO ADMIN (Aethel Ops / "God Mode")
*Foco: Dados, Controle, Custo-Benefício.*

Este painel é **exclusivo para Você (Dono)** e equipe interna.

### 3.1 Estrutura de Controle (Dashboard)
O Admin precisa ver a "verdade crua" que escondemos do usuário.

| Módulo | Função | Qualidade Específica | Arquivo Alvo |
| :--- | :--- | :--- | :--- |
| **FinancialHealth** | MRR vs Burn Rate (Custos OpenAI). | **Densidade:** Gráficos Sparkline, números vermelhos/verdes. | `app/ops/finance/page.tsx` |
| **AgentMonitor** | Ver o que o Claude está pensando. | **Auditoria:** Log cru dos prompts e respostas (Token Count). | `app/ops/agents/page.tsx` |
| **Infrastructure** | Status dos Pods K8s e Filas. | **Confiabilidade:** Alertas de gargalo de Build. | `app/ops/infra/page.tsx` |
| **ModerationQueue** | Aprovar jogos/Assets. | **Velocidade:** Hotkeys para Aprovar/Banir rápido. | `app/ops/trust/page.tsx` |

### 3.2 Integração com o Agente (Visão de Raio-X)
Enquanto o usuário vê "magia", o Admin vê "custo".
*   **O que o Admin Vê:** "Usuário X pediu script complexo. Custo: $0.12. Modelo usado: Claude-3.5-Sonnet. Latência: 4s."
*   **Controle:** Botão de emergência **"Downgrade to GPT-4o-mini"** se o custo estiver explodindo.
*   **Feature Chave:** **Shadow Ban**. Se um usuário estiver abusando da IA para gerar conteúdo tóxico, o Admin pode "desligar" a inteligência dele sem ele saber (IA começa a responder genérico).

### 3.3 Qualidade Técnica Esperada (Admin-Facing)
*   **Real-time:** WebSockets para ver gráficos de uso de CPU/Token subindo ao vivo.
*   **Segurança:** Autenticação 2FA obrigatória. Rota protegida por Middleware severo.

---

## 4. ALINHAMENTO COM A ESTRUTURA ATUAL (REALITY CHECK)
*Mapeamento exato baseada na varredura da pasta `cloud-web-app/web`.*

Não criaremos pastas fantasmas. Vamos usar o que já existe:

### Onde o Código Novo entra (Sem Refatorar Rotas):
```bash
cloud-web-app/web/
├── app/
│   ├── dashboard/           # JÁ EXISTE: Será a Home do Usuário (Aethel Studio)
│   │   └── new/             # CRIAR: NewProjectWizard aqui
│   ├── admin/               # JÁ EXISTE:Home do Admin (Aethel Ops)
│   │   ├── finance/         # CRIAR: Painel Financeiro
│   │   └── ai-monitor/      # CRIAR: Raio-X dos Agentes
│   └── ide/                 # JÁ EXISTE: O editor principal
├── components/
│   ├── ai/                  # JÁ EXISTE: SquadChatUI vai aqui
│   ├── billing/             # JÁ EXISTE: PremiumLock e UsageEnforcer aqui
│   ├── dashboard/           # JÁ EXISTE: CardProject e listas aqui
│   └── engine/              # JÁ EXISTE: RapierPhysicsSystem entra aqui
└── lib/
    ├── rbac.ts              # CRIAR: Controle de permissão (Admin vs User)
    └── stripe.ts            # CRIAR: Integração Connect
```

## 5. RESUMO DAS DIFERENÇAS DE QUALIDADE

| Característica | Interface do Usuário (Studio) | Interface do Admin (Aethel Admin) |
| :--- | :--- | :--- |
| **Estética** | Cinematográfica, Dark, Minimalista. | Utilitária, Compacta, Informação Densa. |
| **Dados** | Abstraídos ("Uso da IA: Baixo"). | Precisos ("Uso da IA: 4503 tokens"). |
| **Erros** | Amigáveis ("Ops, a IA tropeçou."). | Técnicos ("Error 500: Timeout na OpenAI API"). |
| **Tecnologia** | WebGL/Canvas (Foco em GPU). | SSR/Server Components (Foco em Dados). |

---

## 6. PRÓXIMOS PASSOS: EXECUÇÃO "CIRÚRGICA"
A estrutura está pronta e validada. Não precisamos apagar nada, apenas preencher.

1.  **Segurança Primeiro:** Criar `lib/rbac.ts` para proteger a rota `/admin` existente.
2.  **Conversão (User):** Criar `NewProjectWizard` em `app/dashboard/new/page.tsx`.
3.  **Controle (Admin):** Criar `FinancialDashboard` em `app/admin/finance/page.tsx`.

---

## 7. ROTEIRO DE EXECUÇÃO TÁTICA (Q1 2026)
*Baseado na auditoria de "Bloatware" e na necessidade de dados reais.*

### FASE 1: O GRANDE EXPURGO (Limpeza do Admin)
Antes de construir, precisamos destruir o "teatro".
*   [ ] **Delete:** `app/admin/banking` (Dados falsos do Bank of America).
*   [ ] **Delete:** `app/admin/ai-evolution` (Pasta vazia/conceitual).
*   [ ] **Delete:** `app/admin/bias-detection` (Feature teórica não implementada).
*   [ ] **Delete:** `app/admin/ip-registry` (Mock sem função real).
*   [ ] **Delete:** `app/admin/sustainability` (Desnecessário agora).
*   [ ] **Delete:** Qualquer pasta em `components/admin/*` que suporte esses mocks.

### FASE 2: FUNDAÇÃO SÓLIDA
*   [ ] **Criar `app/admin/layout.tsx`:** O Admin precisa de um layout persistente (Sidebar fixa + Header com status do sistema) que não recarregue ao navegar.
*   [ ] **Segurança (Zero Trust):** Implementar `lib/rbac.ts` e conectá-lo ao Middleware. Se `user.role !== 'owner'`, redirecionar para 404 instantaneamente. Ninguém deve saber que o admin existe.

### FASE 3: FUNCIONALIDADES "KILLER" (Sugestões Estratégicas)

#### A. O "Botão de Pânico" Financeiro (Cost Control)
*   **O Problema:** Um ataque DDoS ou bug no loop da IA pode drenar o cartão de crédito na OpenAI em minutos.
*   **A Solução:** Um toggle global no Header do Admin: `[ EMERGENCY MODE ]`.
*   **Efeito:** 
    *   Desliga chamadas GPT-4.
    *   Força fallback para modelos baratos (GPT-4o-mini) ou cache estático.
    *   Envia email de alerta para você.

#### B. Shadow Ban & "Hellbanning"
*   **O Problema:** Banir trolls faz eles criarem contas novas.
*   **A Solução:** Flag `is_shadow_banned` no DB.
*   **Efeito:** 
    *   O usuário loga normalmente.
    *   O "NewProjectWizard" dele carrega infinitamente ou dá erros aleatórios de "Rede ocupada".
    *   As gerações de IA retornam texto genérico e sem graça.
    *   Eles desistem sozinhos por tédio.

#### C. Analytics de Verdade (Server Actions)
*   **Mudança Técnica:** Chega de `useEffect` no Admin.
*   **Nova Abordagem:** Usar **Next.js Server Actions** para buscar dados financeiros (Stripe) e de usuários (Prisma) diretamente no servidor.
*   **Vantagem:** Zero exposição de API endpoints públicos para dados sensíveis. O Admin renderiza o HTML já com os dados.

#### D. O "God View" (Sessão ao Vivo)
*   **Sugestão:** Usar WebSocket (Pusher ou Supabase Realtime) para ver *quem* está online no Studio agora.
*   **Admin vê:** "User Omega está editando 'Projeto Alpha' há 45 min."
*   **Ação:** Poder enviar um "Toast" (notificação) direto para a tela dele: *"Ei, vi que você está travado na física. Quer ajuda?"* (Atendimento VIP proativo).

### FASE 4: HIGIENE ARQUITETURAL (Detox do `lib/`)
*Uma varredura na pasta `lib/` revelou mais de 100 arquivos misturando infraestrutura básica com "Sonhos de Engenharia" (ex: `nanite-virtualized-geometry.ts` junto com `auth.ts`).*

*   **Ação:** Reestruturar `lib/` em domínios claros para evitar que a IA se confunda importando módulos "Fantasiosos".
    *   `lib/core/`: Apenas infra Next.js (`auth`, `db`, `stripe`).
    *   `lib/engine/`: Movemos a física e renderização para cá.
    *   `lib/prototypes/`: Movemos ("Nanite", "Fluid Sim") para cá ou deletamos até que sejam necessários.
    *   **Meta:** Reduzir o ruído cognitivo do projeto. O Arquiteto (IA) precisa saber onde está a "verdade".

