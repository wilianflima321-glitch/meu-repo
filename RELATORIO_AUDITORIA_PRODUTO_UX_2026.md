# RELATÓRIO DE AUDITORIA UX/BUSINESS: ESTRUTURA DE PRODUTO

**Data:** 07 de Janeiro de 2026
**Auditor:** GitHub Copilot (Product Strategist)
**Escopo:** Fluxos de Usuário, Monetização, Administração e Onboarding
**Veredito Geral:** Plataforma SaaS madura, mas inconsistente na integração com o motor 3D.

---

## Doc 1 — Dashboard e Gestão de Produto (`app/dashboard/*`)

### 1.1 Interface Principal (`AethelDashboard.tsx`)
*   **Completo:** O componente é um "Sistema Operacional" dentro do navegador. Possui sistema de abas (`overview`, `ai-chat`, `unreal`, `wallet`), painéis colapsáveis e sidebar.
*   **Integração:** Usa `useSWR` para dados em tempo real.
*   **Gap de Usabilidade:** O dashboard tenta fazer tudo (Chat IA, Code Editor, Unreal Viewport, Wallet). Isso pode sobrecarregar o usuário.
    *   *Recomendação:* Separar claramente o modo "Gestão" (Dashboard) do modo "Criação" (IDE/Editor). Atualmente parecem misturados no mesmo componente React gigante.

### 1.2 Criação de Projetos e Templates
*   **Achado:** Existem interfaces de "Templates" e "Use Cases", mas parecem ser listas estáticas ou mockadas no frontend.
*   **Risco:** Se o usuário clicar em "Novo RPG", o sistema backend sabe criar os arquivos certos? A auditoria técnica (Doc 4) indicou que `seed.ts` existe, mas falta a conexão clara entre o clique no card de template e a execução do seed.

---

## Doc 2 — Monetização e Billing (`lib/stripe.ts` + `app/billing`)

### 2.1 Estrutura de Planos
*   **Status:** Implementado. Código define planos claros: `starter`, `basic`, `pro`, `studio`, `enterprise`.
*   **Infraestrutura:** Cliente Stripe (`lib/stripe.ts`) configurado corretamente com variáveis de ambiente.
*   **Lacuna de UX:** A página de gerenciamento de assinatura (`app/billing/page.tsx`) precisa mostrar visualmente o consumo de recursos (Storage usado, Horas de GPU, Tokens de IA). O modelo `UsageBucket` existe no banco, mas o usuário precisa VER isso para entender o que está pagando.

---

## Doc 3 — Área Administrativa e Backoffice (`app/admin/*`)

### 3.1 Painel de Controle (`AdminPanel.tsx`)
*   **Surpresa Positiva:** O sistema de administração é extremamente granular.
    *   Abas: `ai-training`, `bias-detection`, `ip-registry`, `arpu-churn`.
    *   Isso indica que a plataforma foi pensada para escala global, com preocupação jurídica (IP Registry) e ética de IA (Bias Detection).
*   **Funcionalidade:** Permite adicionar créditos manuais, suspender usuários e ver métricas de receita (`monthly_revenue`).
*   **Segurança:** Protegido por `authHeaders` e flag `is_admin`.

---

## Doc 4 — Onboarding e Primeiros Passos (`Onboarding.tsx`)

### 4.1 Gamification
*   **Mecanismo:** O sistema de "Achievements" e "Badges" (`Award` icon) está codificado.
*   **Fluxo:** O provider carrega o estado via `/api/onboarding`.
*   **Gap:** O "Tour" guiado precisa ser intrusivo na primeira vez. Ele deve destacar onde clicar para:
    1.  Criar o primeiro projeto.
    2.  Abrir o editor.
    3.  Rodar o jogo.
    Atualmente, o código sugere um checklist passivo.

---

## Doc 5 — Autenticação e Identidade

### 5.1 RBAC e Times
*   **Prisma Schema:** Suporta `ProjectMember` (times).
*   **Interface:** Não vi telas claras de "Convidar Membro" ou "Gerir Permissões". O backend suporta, mas a UI pode estar faltando.

---

## Conclusão Geral de Produto
A Aethel Engine possui uma casca de **SaaS Enterprise** (Billing, Admin, Dashboard complexo) envolvendo um núcleo de **Game Engine**.

**Pontos Fortes:**
1.  **Backoffice:** O painel administrativo é nível "banco digital" em termos de recursos.
2.  **Monetização:** Tudo pronto para cobrar via Stripe.

**Pontos Fracos:**
1.  **Foco:** O Dashboard tenta ser IDE.
2.  **Onboarding:** Muito checklist, pouca ação guiada ("Faça X").

**Próximo Passo Recomendado:**
Limpar o Dashboard. Deixar o Dashboard apenas para "Meus Projetos" e "Cobrança". Quando clicar em um projeto, abrir uma **nova rota** `/editor/[id]` que carrega a interface de IDE focada, sem as distrações de wallet/admin.
