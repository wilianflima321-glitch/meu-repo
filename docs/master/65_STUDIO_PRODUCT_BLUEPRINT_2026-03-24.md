# 65_STUDIO_PRODUCT_BLUEPRINT_2026-03-24
Status: ACTIVE
Date: 2026-03-24
Owner: Product + UX + Frontend + AI

## 1) Objetivo
Definir o blueprint canonico da experiencia do Aethel para orientar:
- refactor integral de interfaces
- montagem do arquivo Figma
- decomposicao de navegacao e shells
- unificacao de IA, preview, billing e governanca

Este documento substitui intuicao local por uma arquitetura explicita de produto.

Documento complementar:
- `docs/master/66_AI_OPERATIONAL_EXPERIENCE_BLUEPRINT_2026-03-24.md`

## 2) Diagnostico Brutal
O estado atual ainda tem 5 falhas de categoria:
1. O produto parece varias ferramentas conectadas por navegacao, nao um sistema unico.
2. A IA ainda aparece demais como chat e de menos como camada operacional.
3. O dashboard explica demais e hierarquiza mal o que e core loop vs suporte.
4. Preview e runtime ainda parecem infraestrutura exposta, nao resultado natural do fluxo.
5. Marketing, auth, studio e admin ainda compartilham tokens, mas nao compartilham a mesma dramaturgia de produto.

## 3) North Star
O Aethel deve parecer:
- studio operacional premium
- workbench de criacao e validacao com IA
- sistema continuo entre briefing, research, code, preview, review, deploy e governanca

Nao deve parecer:
- dashboard SaaS comum
- copiloto acoplado ao editor
- chat com paineis em volta
- ferramenta interna poderosa porem caotica

## 4) Camadas de Produto

### 4.1 Builder Layer
Objetivo:
- primeira vitoria em menos de 90s
- linguagem simples
- uma acao principal por tela
- minima carga cognitiva

Superficies:
- `/`
- `/pricing`
- `/login`
- `/register`
- `/onboarding`
- `/dashboard` em modo starter

Contrato:
- mostrar so o proximo passo
- ocultar opcoes profundas por padrao
- reduzir explicacao longa
- usar cards, progress, CTA e previews reais

### 4.2 Operator Layer
Objetivo:
- controle, contexto, iteracao e velocidade
- mostrar estado real do sistema
- preservar continuidade entre tarefa, codigo, preview e validacao

Superficies:
- `/dashboard`
- `/projects/*`
- `/ide`
- `/nexus`
- `/billing`
- `/settings`

Contrato:
- shell persistente
- contexto visivel
- IA com modos, custo, progresso e impacto
- preview embutido na narrativa de trabalho

### 4.3 Governance Layer
Objetivo:
- readiness, auditoria, seguranca, observabilidade e operacao
- ficar disponivel sem poluir o fluxo principal

Superficies:
- `/status`
- `/admin/*`
- `/monitoring`
- `/admin/ai-monitor`

Contrato:
- separado visualmente da camada builder
- linguagem objetiva
- forte uso de tabelas, timeline, health and evidence

### 4.4 Live Layer
Objetivo:
- preparar o produto para voice, background agents, browser operator, multi-agent e memoria persistente

Superficies:
- `Live rail` dentro de `/dashboard` e `/ide`
- `Agent sessions`
- `Operator console`
- `Context memory panel`

Contrato:
- nao abrir uma area separada sem necessidade
- aparecer como camada viva no studio
- sempre mostrar: quem esta rodando, etapa, custo, risco, aprovacao e resultado esperado

## 5) Arquitetura de Navegacao

### 5.1 Regra principal
O produto passa a ter 4 niveis de navegacao:
1. Public web
2. Entry/Auth
3. Studio shell
4. Governance shell

### 5.2 Public Web
Rotas:
- `/`
- `/pricing`
- `/docs`
- `/status`
- `/contact-sales`

Papel:
- vender a categoria
- mostrar prova visual
- levar para login, register ou demo

Nao fazer:
- expor nav de produto interno
- listar features em excesso
- competir com dashboard

### 5.3 Entry/Auth
Rotas:
- `/login`
- `/register`
- `/onboarding`

Papel:
- transicao de marketing para uso
- preparar missao inicial
- iniciar projeto e contexto

Nao fazer:
- abrir area neutra
- mandar o usuario para dashboard vazio

### 5.4 Studio Shell
Rotas principais:
- `/dashboard`
- `/projects`
- `/ide`
- `/billing`
- `/settings`

Rotas contextuais:
- `/nexus`
- `/profile`
- `/status`

Decisao:
- `Nexus` sai da navegacao primaria global e vira modo contextual de colaboracao/coordenação
- `Billing`, `Settings` e `Status` continuam acessiveis, mas abaixo do core loop

Nova nav primaria:
- Home
- Projects
- Workbench

Nova nav secundaria:
- AI Sessions
- Billing
- Settings
- Status

### 5.5 Governance Shell
Rotas:
- `/admin`
- `/admin/ai-monitor`
- `/admin/payments`
- `/admin/monitoring`
- `/admin/users`

Papel:
- operacao e maturidade enterprise

## 6) Mapa de Screens

### 6.1 Home
Intencao:
- vender a categoria "software studio with AI"

Estrutura:
- hero com 1 headline, 1 subheadline, 1 CTA principal
- prova visual real do Studio
- 3 diferenciais
- workflow em 3 passos
- pricing teaser
- proof strip
- footer enxuto

### 6.2 Pricing
Intencao:
- converter sem ruido

Estrutura:
- hero curto
- grade de planos
- matrix comparativa
- FAQ
- CTA enterprise

### 6.3 Login/Register
Intencao:
- transicao para uso

Estrutura:
- form principal
- painel lateral com prova visual real
- 3 sinais do que acontece apos entrar
- zero jargao extra

### 6.4 Onboarding
Intencao:
- criar a missao inicial

Passos:
1. O que voce quer construir
2. Como quer comecar
3. Provider ou demo
4. Criar primeiro projeto

### 6.5 Dashboard
Intencao:
- mostrar o estado atual do trabalho e o proximo passo

Blocos canonicos:
- Mission header
- Project rail
- Next action card
- Agent/live strip
- Recent work
- Runtime readiness

Remover:
- excesso de cards com o mesmo peso
- explicacao de sistema em texto corrido
- varios grupos secundarios sempre visiveis

### 6.6 Projects
Intencao:
- operar portfolio de trabalho

Blocos:
- project grid/list
- filters
- status chips
- last run / last preview / owner / readiness
- CTA "abrir workbench"

### 6.7 Workbench (`/ide`)
Intencao:
- virar o coracao do produto

Layout:
- top app bar compacta
- left rail: files/search/git
- center: editor
- right rail: AI/Context/Plan
- bottom rail: output/problems/runtime
- integrated preview panel

Regra:
- preview e AI sao partes do editor, nao anexos externos

### 6.8 Nexus
Intencao:
- coordenacao de agentes e research multi-step

Papel:
- nao competir com o editor
- funcionar como "mission control" quando necessario

### 6.9 Billing
Intencao:
- mostrar plano, uso, limites, invoices e upgrade

### 6.10 Settings
Intencao:
- configurar sem virar dump de opcoes

Secoes:
- account
- AI providers
- workspace memory
- runtime/deploy
- security

### 6.11 Status
Intencao:
- estado publico dos servicos

### 6.12 Admin
Intencao:
- operacao interna enterprise

## 7) Handoffs Canonicos

### 7.1 Marketing -> Auth
CTA principal da home:
- `Comecar no Studio`

Destino:
- `/register?intent=builder`

### 7.2 Auth -> Onboarding
Apos criar conta:
- onboarding obrigatorio em vez de dashboard vazio

### 7.3 Onboarding -> Dashboard
Dashboard abre com:
- missao pronta
- projeto criado
- CTA unico para abrir workbench

### 7.4 Dashboard -> Workbench
Ao abrir o workbench:
- projeto atual
- arquivo inicial
- chat/AI contextual
- preview pronto ou onboarding do runtime

### 7.5 Workbench -> Preview
Preview nunca deve parecer sistema a parte.

Estados:
- ready
- provisioning
- warming
- live
- degraded
- approval needed

### 7.6 Preview -> Review
Toda mudanca relevante precisa mostrar:
- diff
- impacto
- source
- opcao de aprovar / descartar

### 7.7 Review -> Deploy/Billing/Status
Depois de validar:
- deploy
- share preview
- review billing/quota
- consultar status/health se falhar

## 8) Fluxos Principais

### 8.1 Builder Flow
`Home -> Register -> Onboarding -> Dashboard -> Workbench -> Preview -> Share`

Meta:
- primeiro valor rapido

### 8.2 Operator Flow
`Dashboard -> Project -> Workbench -> AI plan -> Apply -> Preview -> Review -> Deploy`

Meta:
- throughput e confianca

### 8.3 Governance Flow
`Admin -> AI monitor -> Runtime evidence -> Billing -> Status -> Audit`

Meta:
- operacao confiavel

### 8.4 Live Agent Flow
`Task created -> Agent assigned -> progress visible -> approval -> result applied -> review`

Meta:
- multi-agent inteligivel

## 9) Arquitetura da IA

### 9.1 IA nao e chat
A interface precisa mostrar 4 modos:
- Ask
- Plan
- Execute
- Review

### 9.2 Painel direito do Workbench
Tabs:
- `Ask`
- `Plan`
- `Context`
- `Agents`
- `Memory`

### 9.3 Barra de estado da IA
Mostrar:
- modelo
- tier
- custo estimado
- agent count
- status do run
- approval state

### 9.4 Multi-agent
Sempre mostrar:
- Architect
- Engineer
- Critic

Campos por agente:
- objetivo
- etapa
- dependencia
- output esperado
- risco

## 10) Arquitetura de Memoria e Contexto

Camadas:
- workspace memory
- project memory
- task memory
- session memory

UI:
- `Memory panel`
- `Pinned context`
- `Recent decisions`
- `Known constraints`

Regras:
- memoria relevante sempre visivel
- memoria editavel quando afetar o fluxo
- nunca esconder contexto critico em texto longo

## 11) Componentes Canonicos para o Figma

### 11.1 Shell
- Studio top bar
- Left nav rail
- Right context rail
- Bottom operational rail

### 11.2 Cards
- Mission card
- Next action card
- Runtime card
- Agent card
- Plan card
- Evidence card

### 11.3 AI
- Agent strip
- Run timeline
- Cost chip
- Approval bar
- Context chip

### 11.4 Feedback and State
- Empty state
- Loading skeleton
- Degraded banner
- Approval modal
- Runtime readiness widget

## 12) Paginas do Arquivo Figma

Criar as paginas:
1. `00 Foundations`
2. `01 Public Web`
3. `02 Entry`
4. `03 Studio`
5. `04 Workbench`
6. `05 Governance`
7. `06 Components`
8. `07 Flows`
9. `08 Mobile`

## 13) Frames Obrigatorios no Figma

### 13.1 Public Web
- Home desktop
- Home mobile
- Pricing desktop
- Pricing mobile
- Contact sales

### 13.2 Entry
- Login
- Register
- Onboarding step 1
- Onboarding step 2
- Onboarding step 3
- Onboarding complete state

### 13.3 Studio
- Dashboard overview
- Dashboard projects
- Dashboard empty state
- Projects list
- Projects detail launcher

### 13.4 Workbench
- IDE shell default
- IDE with AI plan
- IDE with preview live
- IDE with degraded runtime
- IDE approval state

### 13.5 Governance
- Billing
- Settings
- Status
- Admin monitoring
- AI monitor

## 14) Ordem de Execucao no Design
1. Foundations
2. Home
3. Auth
4. Onboarding
5. Dashboard
6. Workbench shell
7. Preview + AI rails
8. Projects
9. Billing + Settings
10. Governance

## 15) Quick Wins
1. Rebaixar `Nexus` da nav primaria.
2. Reduzir texto em landing/auth/pricing em 50%+.
3. Unificar CTA principal de cada tela.
4. Fazer dashboard mostrar so uma proxima acao principal.
5. Ocultar controles avancados da IA por padrao.
6. Tornar preview parte nativa do workbench.

## 16) Mudancas Estruturais Profundas
1. Dividir o studio em Builder, Operator, Governance e Live.
2. Reescrever dashboard como mission control, nao menu de features.
3. Reescrever IDE como shell operacional com IA, contexto e preview embutidos.
4. Separar Nexus como modo contextual, nao tela principal de uso diario.
5. Tornar memoria/contexto feature visivel e controlavel.

## 17) Criterios de Aceite do Blueprint
- Cada tela tem 1 objetivo principal claro.
- Cada handoff preserva contexto.
- Builder e Operator nao competem na mesma dobra.
- IA aparece como sistema operacional, nao apenas chat.
- O Figma pode ser criado sem lacunas a partir deste documento.

## 18) Referencias
- `docs/master/39_STUDIO_UNIFIED_INFORMATION_ARCHITECTURE_2026-03-11.md`
- `docs/master/40_L5_CONSOLIDATED_EXECUTION_PLAN_2026-03-18.md`
- `cloud-web-app/web/lib/navigation/surfaces.ts`
- `cloud-web-app/web/components/studio/StudioGlobalNav.tsx`
