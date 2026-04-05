# Análise Abrangente de UX/UI - Aethel Engine vs Benchmarks

**Data:** 2026-04-04  
**Status:** Análise Estratégica  
**Comparação:** VSCode, Unreal Engine, Adobe Premiere, Replit, Manus, Genspark

---

## 1. Diagnóstico Estratégico

### 1.1 Estado Atual do Produto

Baseado nos documentos canônicos e análise de componentes, o Aethel Engine atual tem:

**Pontos Fortes:**
- Arquitetura técnica sólida com AI-Native design
- Preview Engine canônico com lifecycle management (idle → provisioning → warming → syncing → healthy/degraded/failed)
- AI Console com estrutura base para Plan, Runs, Approvals
- Multi-agent orquestração definida (Architect, Engineer, Critic, QA)
- Design system unificado com tokens CSS
- Acessibilidade WCAG 2.2 AA implementada em hotspots críticos
- Localização PT-BR centralizada

**Pontos Fracos Identificados (Blueprint 65):**
1. O produto parece várias ferramentas conectadas por navegação, não um sistema único
2. A IA ainda aparece demais como chat e de menos como camada operacional
3. O dashboard explica demais e hierarquiza mal o que é core loop vs suporte
4. Preview e runtime ainda parecem infraestrutura exposta, não resultado natural do fluxo
5. Marketing, auth, studio e admin compartilham tokens, mas não compartilham a mesma dramaturgia de produto

---

## 2. Análise por Área vs Benchmarks

### 2.1 Gateway (Web de Entrada)

#### VS Benchmark (Replit, Vercel, Linear)

**Estado Atual Analisado:**

1. **Landing Page (landing-v3.tsx)**
   - **Implementado:** Magic Box com prompt-to-workspace, sugestões rotativas, screenshots reais, pricing teaser
   - **Gap:** Magic Box funciona mas não gera workspace real em <90s (redireciona para dashboard com onboarding)
   - **Benchmark:** Replit tem "Start coding immediately" com template instantâneo
   - **Recomendação:** Implementar geração real de workspace em <90s via API

2. **Auth (login-v2.tsx, register-v2.tsx)**
   - **Implementado:** Login/Register funcionais com AuthExperiencePanel, painel lateral com prova visual do dashboard/editor
   - **Gap:** Prova visual é estática (screenshots), não interativa. OAuth desabilitado.
   - **Benchmark:** Vercel mostra preview interativo do dashboard no login
   - **Recomendação:** Adicionar preview interativo do dashboard/editor. Habilitar OAuth.

3. **Onboarding (Onboarding.tsx)**
   - **Implementado:** WelcomeModal com 4 steps, OnboardingChecklist com 7 itens, Achievements, SystemHealthReport
   - **Gap:** Onboarding é checklist genérico, não mission-first específico para o projeto do usuário
   - **Benchmark:** Linear tem onboarding focado em "what are you building"
   - **Recomendação:** Tornar onboarding mission-first com template específico baseado no Magic Box

**Lacunas Específicas Identificadas:**

1. **Magic Box não gera workspace real**
   - Landing tem Magic Box mas redireciona para dashboard com onboarding
   - Deveria gerar workspace pré-configurado em <90s
   - Impacto: Primeira vitória não é instantânea

2. **AuthExperiencePanel é estático**
   - Painel lateral mostra screenshots estáticos do dashboard/editor
   - Deveria ser preview interativo ou animado
   - Impacto: Prova visual é menos convincente

3. **Onboarding não é mission-first**
   - Checklist genérico não adapta ao projeto específico do usuário
   - Deveria personalizar baseado no Magic Box
   - Impacto: Onboarding parece genérico, não personalizado

4. **OAuth desabilitado**
   - Botões GitHub/Google marcados como "em breve"
   - Deveria estar habilitado para redução de atrito
   - Impacto: Aumento de atrito no registro

#### Prioridade Gateway: **ALTA** (primeira impressão é crítica)

---

### 2.2 Nexus (Live Preview & Chat Multimodal)

#### VS Benchmark (Gemini Live, Canvas, Manus, Genspark)

**Estado Atual Analisado:**

1. **NexusChatMultimodal (NexusChatMultimodal.tsx)**
   - **Implementado:** Chat com 4 agentes (Arquiteto, Designer, Engineer, QA), seleção de agente, thinking process básico, multimodalidade base (voz, imagem)
   - **Gap:** Thinking process é apenas texto "Raciocinio resumido", não expõe steps, ferramentas, decisões detalhadas. Falta modo observador proativo. Falta colaboração entre agentes.
   - **Benchmark:** Manus tem agents mas sem visualização detalhada de progresso
   - **Recomendação:** Implementar "Thinking Process" detalhado com steps visíveis, modo observador proativo, colaboração entre agentes

2. **CanonicalPreviewSurface (CanonicalPreviewSurface.tsx)**
   - **Implementado:** Preview canônico com lifecycle management robusto (idle → provisioning → warming → syncing → healthy/degraded/failed), HMR, health polling, fallback inline
   - **Gap:** Falta "AI Painting" - visualização de IA criando em tempo real. Falta Magic Wand - clique em elemento → mini-chat contextual. Falta device emulation.
   - **Benchmark:** Nenhum benchmark tem AI painting (oportunidade de diferenciação)
   - **Recomendação:** Implementar AI Painting, Magic Wand, device emulation

3. **NexusCanvas**
   - **Implementado:** NexusCanvasV2 referenciado mas arquivo não encontrado no caminho esperado
   - **Gap:** Estado atual não verificado, mas blueprint menciona Live Preview interativo
   - **Benchmark:** Unreal Engine tem editor 3D extremamente poderoso
   - **Recomendação:** Verificar implementação atual e alinhar com blueprint

**Lacunas Específicas Identificadas:**

1. **Thinking Process não exposto detalhadamente**
   - NexusChatMultimodal tem thinking mas apenas "Raciocinio resumido"
   - Deveria expor steps, ferramentas usadas, decisões, dependências
   - Impacto: Multi-agent não é inteligível

2. **Modo observador proativo ausente**
   - IA é reativa (só responde quando perguntada)
   - Deveria monitorar ações e sugerir não-intrusivamente
   - Impacto: IA não é proativa, perde oportunidade de diferenciação

3. **AI Painting não implementado**
   - Preview não visualiza IA criando em tempo real
   - Deveria mostrar elementos surgindo, código sendo digitado visualmente
   - Impacto: Perde diferencial competitivo crítico

4. **Magic Wand ausente**
   - Preview não permite clique em elemento → mini-chat contextual
   - Deveria ter interatividade precisa e localizada
   - Impacto: UX de preview é inferior

5. **Colaboração entre agentes não implementada**
   - Agentes trabalham de forma isolada
   - Deveria ter agentes chamando outros agentes
   - Impacto: Multi-agent orquestração é superficial

#### Prioridade Nexus: **ALTA** (diferencial competitivo crítico)

---

### 2.3 Forge (IDE/Workbench)

#### VS Benchmark (VSCode, Unreal Engine, Replit)

**Estado Atual Analisado:**

1. **ModernIDEShell (ModernIDEShell.tsx)**
   - **Implementado:** Shell moderno com split view (sidebar, editor, preview, chat), header com panel toggles, mobile bottom bar, compact mode detection
   - **Gap:** Painel direito não implementa AI Console canônico (Ask, Plan, Context, Agents, Memory). Falta Bottom Dock unificado (Terminal, Output, Problems, Debug). Falta Command Palette refinada (Ctrl+Shift+P). Falta Status Bar operacional.
   - **Benchmark:** VSCode tem painéis laterais mas sem AI Console estruturado
   - **Recomendação:** Implementar painel direito com tabs AI Console, Bottom Dock unificado, Command Palette refinada, Status Bar operacional

2. **AIChatPanelPro (AIChatPanelPro.tsx)**
   - **Implementado:** Chat panel refatorado com strings PT-BR centralizadas, estado consoleMode, estrutura base para modos (Ask, Plan, Execute, Review, Live)
   - **Gap:** Modos não implementados visualmente. Falta Run Card com status, custo, approval required. Falta Agent Board com progresso individual. Falta Approval Card. Falta Cost Capsule e Confidence Band visíveis.
   - **Benchmark:** Nenhum benchmark tem AI Console estruturado (oportunidade de liderança)
   - **Recomendação:** Implementar modos visualmente, Run Card, Agent Board, Approval Card, Cost Capsule, Confidence Band

3. **CanonicalPreviewSurface (CanonicalPreviewSurface.tsx)**
   - **Implementado:** Preview canônico com lifecycle management robusto, HMR, health polling, fallback inline, LifecycleIndicator visual
   - **Gap:** Preview ainda parece infraestrutura exposta, não resultado natural do fluxo. Falta device emulation, network inspector, console logs integrados.
   - **Benchmark:** Replit integra preview de forma mais natural
   - **Recomendação:** Tornar preview parte nativa do workbench, adicionar device emulation, network inspector, console logs

**Lacunas Específicas Identificadas:**

1. **AI Console não implementado visualmente**
   - AIChatPanelPro tem estrutura base mas modos não são visíveis/funcionais
   - Deveria ter tabs Ask, Plan, Context, Agents, Memory
   - Impacto: IA ainda aparece como chat, não como console operacional

2. **Run Card ausente**
   - Falta visualização de run com status, custo, approval required
   - Deveria mostrar: run ID, status, duration, cost, approval state
   - Impacto: Operações de IA não são rastreáveis

3. **Agent Board não implementado**
   - Falta visualização de progresso individual de cada agente
   - Deveria mostrar: role, current task, dependency, progress, output, confidence, cost
   - Impacto: Multi-agent não é inteligível

4. **Approval Card ausente**
   - Falta workflow de aprovação visual
   - Deveria ter: scope, impact summary, cost, diff preview, rollback path
   - Impacto: Governança de IA não é visível

5. **Cost Capsule e Confidence Band ausentes**
   - Custo estimado existe mas não em Run Card
   - Deveria mostrar: modelo, custo estimado, impacto no plano, nível de confiança, contexto ausente
   - Impacto: Custo e risco não são visíveis

6. **Memory Panel não implementado**
   - Memória definida mas não visualizada
   - Deveria mostrar: workspace memory, project memory, task memory, session memory
   - Impacto: Contexto não é visível e controlável

7. **Bottom Dock não unificado**
   - TerminalPro e OutputPanel existem mas não unificados
   - Deveria ter tabs unificados: Terminal, Output, Problems, Debug
   - Impacto: Shell operacional incompleto

8. **Command Palette não refinada**
   - CommandPalette existe mas não tão refinada quanto VSCode
   - Deveria ter: fuzzy search, comandos categorizados, shortcuts visíveis
   - Impacto: Produtidade reduzida

9. **Status Bar operacional ausente**
   - Falta status bar com sinais operacionais
   - Deveria mostrar: branch, sync, errors, AI status, deploy
   - Impacto: Estado do sistema não é visível

#### Prioridade Forge: **CRÍTICA** (coração do produto)

---

## 3. Análise de Benchmarks Específicos

### 3.1 VSCode

**O que faz bem:**
- Editor extremamente rápido e responsivo
- Extensões poderosas e ecossistema maduro
- Command palette (Ctrl+Shift+P) excepcional
- Split view e multi-cursor
- Integrated terminal robusto

**O que o Aethel pode superar:**
- AI contextual profunda (entende projeto como um todo, não apenas snippets)
- Quality Gates nativos (verificações contra design manifesto)
- Multi-agent orquestração (equipe de IAs especialistas)
- Preview integrado com lifecycle management
- Cost e confidence signals visíveis

**Gap Aethel vs VSCode:**
- Editor ainda não tem qualidade de VSCode (Monaco precisa de extensões proprietárias)
- Command palette existe mas não tão refinada
- Extensões existem mas ecossistema imaturo

---

### 3.2 Unreal Engine

**O que faz bem:**
- Editor 3D extremamente poderoso e visual
- Blueprint system para lógica visual
- Pixel Streaming para preview remoto
- Marketplace de assets maduro
- Collaboration real-time

**O que o Aethel pode superar:**
- Acessibilidade (roda no browser, sem download pesado)
- Cloud-native (offloading para nuvem reduz requisitos de hardware)
- Criação assistida por IA (acelera drástica criação de assets)
- Multi-agent para orquestração complexa

**Gap Aethel vs Unreal:**
- Editor 3D ainda não tem qualidade de Unreal (Nexus Canvas em desenvolvimento)
- Blueprint system não existe (VisualScripting em desenvolvimento)
- Marketplace imaturo

---

### 3.3 Adobe Premiere

**O que faz bem:**
- Timeline editor extremamente refinado
- Preview em tempo real de vídeo
- Efeitos e transições profissionais
- Collaboration em projetos
- Exportação otimizada

**O que o Aethel pode superar:**
- IA assistente para edição (auto-cut, color grading assistido)
- Timeline com AI suggestions
- Multi-agent para diferentes aspectos de edição (som, cor, corte)
- Preview instantâneo com hot-reload

**Gap Aethel vs Premiere:**
- Timeline existe mas não tem qualidade de Premiere
- Efeitos e transições inexistentes
- Exportação não implementada

---

### 3.4 Replit

**O que faz bem:**
- "Start coding immediately" com template instantâneo
- Hot-reload extremamente rápido
- Collaboration real-time excelente
- Preview integrado de forma natural
- Simplicidade e velocidade

**O que o Aethel pode superar:**
- AI contextual mais profunda (Reality Matrix)
- Multi-agent orquestração (equipe de IAs)
- Quality Gates nativos
- Cost e confidence signals
- Preview com lifecycle management mais robusto

**Gap Aethel vs Replit:**
- Onboarding não é tão rápido
- Hot-reload não é tão instantâneo
- Preview não parece tão natural
- Collaboration menos refinada

---

### 3.5 Manus

**O que faz bem:**
- Multi-agent orquestração
- Chat multimodal
- Visualização de agentes

**O que o Aethel pode superar:**
- Contexto mais profundo (Reality Matrix, documentos canônicos)
- Visualização do processo de pensamento (Thinking Process)
- Modo observador proativo
- Memory panel estruturado
- Cost e confidence signals

**Gap Aethel vs Manus:**
- Multi-agent menos refinado
- Thinking process não exposto
- Memory não visualizada

---

### 3.6 Genspark

**O que faz bem:**
- AI search avançado
- Contextual search
- UI limpa e moderna

**O que o Aethel pode superar:**
- AI Console estruturado (Ask, Plan, Execute, Review)
- Multi-agent orquestração
- Preview integrado
- Quality Gates
- Memory panel

**Gap Aethel vs Genspark:**
- Search não implementado
- UI menos refinada
- Contexto menos profundo

---

## 4. Lacunas Críticas por Componente

### 4.1 AIChatPanelPro.tsx

**Estado Atual:** Refatorado com strings PT-BR e estrutura base para AI Console

**Lacunas:**
1. Falta implementação visual dos modos (Ask, Plan, Execute, Review, Live)
2. Falta Run Card com status, custo, approval required
3. Falta Agent Board com progresso individual de cada agente
4. Falta Approval Card com scope, impact, cost, diff preview, rollback path
5. Falta Cost Capsule e Confidence Band visíveis
6. Falta Memory Panel integrado

**Prioridade:** CRÍTICA

---

### 4.2 ModernIDEShell.tsx

**Estado Atual:** Shell moderno com split view, header, mobile bottom bar

**Lacunas:**
1. Painel direito não implementa AI Console canônico
2. Falta tabs para Ask, Plan, Context, Agents, Memory
3. Falta Bottom Dock unificado (Terminal, Output, Problems, Debug)
4. Falta Command Palette refinada (Ctrl+Shift+P)
5. Falta Status Bar com sinais operacionais (branch, sync, errors, AI status, deploy)

**Prioridade:** ALTA

---

### 4.3 CanonicalPreviewSurface.tsx

**Estado Atual:** Preview canônico com lifecycle management robusto

**Lacunas:**
1. Falta "AI painting" - visualização de IA criando em tempo real
2. Falta Magic Wand - clique em elemento → mini-chat contextual
3. Falta device emulation (mobile, tablet, desktop)
4. Falta network inspector
5. Falta console logs integrados

**Prioridade:** MÉDIA (já está bem implementado)

---

### 4.4 NexusChatMultimodal.tsx

**Estado Atual:** Chat multimodal com agentes e thinking process básico

**Lacunas:**
1. Falta "Thinking Process" detalhado com steps visíveis
2. Falta modo observador proativo
3. Falta memória de longo prazo visualizada
4. Falta colaboração entre agentes (agentes chamando outros agentes)
5. Falta multimodalidade nativa completa (voz, imagem, texto)

**Prioridade:** ALTA

---

## 5. Recomendações Priorizadas

### 5.1 Quick Wins (1-2 semanas)

1. **Implementar Magic Box no Gateway**
   - Prompt-to-workspace instantâneo
   - Gera workspace em <90s
   - Impacto: Primeira vitória em <90s

2. **Adicionar modo selector no AIChatPanelPro**
   - Ask, Plan, Execute, Review, Live
   - Visual e funcional
   - Impacto: Transição chat → console

3. **Implementar Run Card básico**
   - Status, custo, approval required
   - Visual e funcional
   - Impacto: Visibilidade de estado

4. **Centralizar mais strings PT-BR**
   - ModernIDEShell, CanonicalPreviewSurface, NexusChatMultimodal
   - Consistência de microcopy
   - Impacto: Qualidade de localização

---

### 5.2 Médio Prazo (1-2 meses)

1. **Implementar Agent Board**
   - Visualização de progresso individual de cada agente
   - Campos: role, current task, dependency, progress, output, confidence, cost
   - Impacto: Multi-agent inteligível

2. **Implementar Approval Card**
   - Scope, impact summary, cost, diff preview, rollback path
   - Estados: pending, approved, revised, rejected, expired
   - Impacto: Governança de IA

3. **Implementar Memory Panel**
   - Workspace memory, project memory, task memory, session memory
   - Scopes, fonte, last updated, reliability, editable summary
   - Impacto: Contexto visível e controlável

4. **Refinar onboarding**
   - Mission-first em 3 passos
   - Prova visual do que acontece após entrar
   - Impacto: Redução de abandono

---

### 5.3 Longo Prazo (3-6 meses)

1. **Implementar AI Painting no Nexus Canvas**
   - Visualização de IA criando em tempo real
   - Elementos surgindo, código sendo digitado
   - Impacto: Diferencial competitivo crítico

2. **Implementar Magic Wand**
   - Clique em elemento → mini-chat contextual
   - Interatividade precisa e localizada
   - Impacto: UX de preview superior

3. **Implementar Modo Observador Proativo**
   - IA monitora ações e sugere não-intrusivamente
   - Transforma IA de reativa para proativa
   - Impacto: Diferencial único

4. **Implementar Quality Gates Nativos**
   - Verificações contra AETHEL_DESIGN_MANIFESTO
   - Antes de commit/deploy
   - Impacto: Qualidade de código enforceable

5. **Implementar Bottom Dock Unificado**
   - Terminal, Output, Problems, Debug
   - Tabs unificados
   - Impacto: Shell operacional completo

---

## 6. Roadmap Sugerido

### Fase 1: Fundação do AI Console (Semanas 1-4)
- Magic Box no Gateway
- Modo selector no AIChatPanelPro
- Run Card básico
- Centralizar strings PT-BR restantes

### Fase 2: Multi-Agent Visual (Semanas 5-8)
- Agent Board completo
- Approval Card
- Memory Panel
- Refinar onboarding

### Fase 3: Nexus Superior (Semanas 9-12)
- AI Painting no Nexus Canvas
- Magic Wand
- Modo Observador Proativo
- Hot-reload universal

### Fase 4: Shell Operacional Completo (Semanas 13-16)
- Bottom Dock unificado
- Command Palette refinada
- Status Bar operacional
- Quality Gates Nativos

### Fase 5: Diferenciais Competitivos (Semanas 17-24)
- Timeline editor (vs Premiere)
- 3D editor refinado (vs Unreal)
- Collaboration real-time (vs Replit)
- Marketplace de assets (vs Unreal)

---

## 7. Métricas de Sucesso

### 7.1 Métricas de UX
- Time to first value: <90s (atualmente: desconhecido)
- Onboarding completion rate: >80% (atualmente: desconhecido)
- Daily active users: Crescimento 20% mês a mês
- Session duration: >30 minutos (atualmente: desconhecido)

### 7.2 Métricas de IA
- AI Console adoption: % de usuários usando modos além de Ask
- Multi-agent usage: % de usuários usando >1 agente
- Approval rate: % de aprovações vs rejeições
- Cost awareness: % de usuários que monitoram custo

### 7.3 Métricas Técnicas
- Hot-reload latency: <500ms (atualmente: desconhecido)
- Preview lifecycle: % de previews que atingem estado healthy
- Memory usage: <500MB por workspace
- Bundle size: <2MB inicial

---

## 8. Conclusão

O Aethel Engine tem uma arquitetura técnica sólida e uma visão de produto ambiciosa. As principais lacunas são:

1. **Gateway:** Falta "Instant On" experience com Magic Box
2. **Nexus:** Falta "AI Painting" e Magic Wand para diferencial competitivo
3. **Forge:** Falta AI Console completo com Run Card, Agent Board, Approval Card

A implementação do roadmap sugerido posicionará o Aethel como líder em:
- AI Console estruturado (vs chat genérico)
- Multi-agent orquestração visível (vs agentes ocultos)
- Preview com lifecycle management (vs preview estático)
- Quality Gates nativos (vs verificação manual)

**Próximo passo imediato:** Implementar Magic Box no Gateway e modo selector no AIChatPanelPro para primeira vitória em <90s.

---

# Benchmark Aethel Engine vs Líderes de Mercado 2026

**Data da auditoria:** 2026-04-01  
**Versão:** v2.0.0  
**Branch:** audit/ux-shell-ptbr-2026-04-01

## Resumo Executivo (direcional, depende de validação)

**Status atual do Aethel Engine**
1. Superfícies inventariadas: 434 arquivos (app/), 325 (components/), 386 (lib/)
2. Sistema de tokens: `var(--aethel-*)` definido em `styles/globals.css` e `styles/design-tokens.css`
3. Gaps P0 identificados: botões sem `type="button"`, cores hardcoded em dezenas de linhas
4. Microcopy PT-BR: drift de inglês em ocorrências chave (Preview, Refresh, Loading, etc.)
5. Blockers operacionais: `node_modules` ausente, `STRIPE_WEBHOOK_SECRET` ausente, Docker daemon

**Comparação de alto nível (estimativa)**
1. Preview/Runtime: 65%
2. Chat/IA Agent: 70%
3. IDE Shell/UX: 60%
4. Acessibilidade WCAG 2.2 AA: 45%
5. Billing/Marketplace: 68%

## Métricas detalhadas por categoria

1. Preview/Runtime: 65% vs Vercel (95%), Replit (88%)
2. Chat/IA Agent: 70% vs Cursor (92%), Copilot (90%)
3. IDE Shell/UX: 60% vs VS Code (98%), Cursor (94%)
4. Acessibilidade: 45% vs VS Code (95%), Figma (88%)
5. Marketplace: 68% vs Figma (90%), Adobe (85%)
6. Billing/Pricing: 72% vs Stripe (98%), Vercel (92%)

## 1) Preview/Runtime

**Comparação detalhada (Aethel vs Vercel/Replit)**

| Recurso | Vercel | Replit | Aethel Engine | Gap |
|---|---|---|---|---|
| Preview deployment automático | PR/Branch | Instant | Manual/E2B | P0 |
| Preview URL único por deploy | Sim | Sim | Parcial | P1 |
| HMR | Sim | Sim | Não | P0 |
| Runtime health monitoring | Vercel Analytics | Built-in | /api/preview/runtime-health | P1 |
| Auto-discovery de runtime | Sim | Sim | /api/preview/runtime-discover | P1 |
| Sync file/workspace | Git-based | Real-time | /runtime-sync, /runtime-sync-file | P1 |
| Provisionamento de runtime | Automático | Instant | E2B API (token) | P0 |
| Feedback visual no preview | Comments | Annotations | Não implementado | P2 |

**Recomendações prioritárias**
1. [P0] Implementar HMR real (não há websocket/SSE para hot reload detectado).
2. [P0] Automatizar preview por branch/PR (PreviewPanel exige seleção manual).
3. [P1] Melhorar feedback visual de sync/readiness com timestamp e diff.
4. [P1] Adicionar telemetria de latência/saúde além de booleano.

## 2) Chat/IA Agent

| Recurso | Cursor | GitHub Copilot | Aethel Engine | Gap |
|---|---|---|---|---|
| Agent Mode (multi-step) | Agent mode | Agent mode GA | Chat only | P0 |
| Background agents | Cloud handoff | Copilot cloud | Não | P0 |
| Context awareness | @Codebase/@Docs | Workspace context | CodebaseContextPanel | P1 |
| Quick prompts/skills | 75+ skills | Custom agents | 8 prompts fixos | P1 |
| Voice input/TTS | Não | Não | useVoiceRecording PT-BR | Vantagem |
| Attachments | Sim | Vision | supportsVision | P1 |
| Code review/regenerate | Sim | Sim | Regenerate button | P1 |
| Apply code directly | Direct apply | Accept/reject | Copy only | P0 |
| Streaming response | Sim | Sim | streamingContent prop | P2 |
| Model selector | Claude/GPT | GPT/Claude | Dropdown | P2 |

**GAP crítico:** ausência de Agent Mode multi-step
1. AIChatPanelPro.tsx é single-turn
2. Sem agent-loop/multi-step executor em lib/
3. /api/ai/chat e /api/ai/stream são single-turn

**Recomendações**
1. [P0] Agent Mode multi-step com persistência de estado
2. [P0] Apply code com preview de diff
3. [P0] Background agents com cloud handoff
4. [P1] Expandir context awareness (@Docs, @Git, @DB)
5. [P1] Biblioteca de Agent Skills customizáveis

## 3) IDE Shell/UX

| Recurso | VS Code | Cursor | Aethel Engine | Gap |
|---|---|---|---|---|
| Command Palette | Sim | Sim | CommandPalette.tsx | P2 |
| Keyboard shortcuts | Customizável | Customizável | Hardcoded | P1 |
| Sidebar panels | Sim | Sim + AI | explorer/search/git/ai/extensions | P2 |
| Bottom panel | Sim | Sim | terminal/output/problems/debug/ports | P2 |
| Layout persistence | localStorage | Cloud sync | localStorage | P1 |
| Drag-and-drop panels | Sim | Sim | Não | P2 |
| Split editors | Sim | Sim | Não | P1 |
| Breadcrumbs | Sim | Sim | Não | P2 |
| Minimap | Sim | Sim | Não | P2 |
| Go to Definition | LSP real | LSP real | LSP mock | P0 |

**Recomendações**
1. [P0] Integrar LSP real (Go to Definition, References, Rename)
2. [P1] Split editors horizontal/vertical
3. [P1] Drag-and-drop de panels/files
4. [P2] Keybindings customizáveis
5. [P2] Minimap e breadcrumbs

## 4) Acessibilidade WCAG 2.2 AA

| Critério | VS Code | Figma | Aethel Engine | Gap |
|---|---|---|---|---|
| 2.4.7 Focus Visible | Sim | Sim | Inconsistente | P0 |
| 2.4.11 Focus Not Obscured | Sim | Sim | Não validado | P0 |
| 2.5.8 Target Size | 24x24 | 24x24 | Alguns <24px | P0 |
| 2.1.1 Keyboard | Full | Full | Parcial | P0 |
| 1.4.3 Contrast | 4.5:1 | 4.5:1 | Não validado | P0 |
| 4.1.3 Status Messages | aria-live | aria-live | Parcial | P1 |

**Plano de conformidade**
1. [P0] Adicionar `type="button"` em todos os botões
2. [P0] Validar contraste (4.5:1 texto, 3:1 UI)
3. [P0] Focus visible consistente (outline 2px + contraste 3:1)
4. [P0] Target size mínimo 24x24px
5. [P1] Keyboard navigation completa
6. [P1] aria-live em status
7. [P1] Testes com NVDA/JAWS/VoiceOver

## 5) Marketplace/Extensions

| Recurso | VS Code | Figma | Aethel Engine | Gap |
|---|---|---|---|---|
| Número de extensões | 40k+ | 2k+ | Mock API | P0 |
| Search/filter | Full-text | Categories | Search + category | P2 |
| Install/Uninstall | 1-click | 1-click | POST /api/marketplace/install | P2 |
| Ratings/Reviews | Sim | Sim | Display only | P1 |
| Auto-updates | Sim | Sim | Não | P1 |
| Publishing API | vsce CLI | Figma Community | Não | P0 |
| Permissions | Granular | OAuth scopes | Não | P0 |
| Dev docs | Extenso | Extenso | Não | P0 |

**Roadmap**
1. [P0] Documentar Extension API (SDK/hooks/lifecycle)
2. [P0] Permissões granulares
3. [P1] Reviews/ratings com moderação
4. [P1] Auto-update de extensões
5. [P2] CLI de publishing

## 6) Billing/Pricing

| Recurso | Stripe | Vercel | Aethel Engine | Gap |
|---|---|---|---|---|
| Customer portal | Hosted | Built-in | /api/billing/portal | P1 |
| Subscription mgmt | Self-service | Self-service | SubscriptionStatusWidget | P1 |
| Invoice automation | Auto | Auto | Não | P1 |
| Usage-based | Metered | Request | /api/billing/usage | P2 |
| Webhooks | 100+ | Custom | /api/billing/webhook (secret faltando) | P0 |

**Blocker operacional**
1. `STRIPE_WEBHOOK_SECRET` ausente em runtime impede validação de eventos.

**Ações para paridade**
1. [P0] Configurar `STRIPE_WEBHOOK_SECRET`
2. [P1] Invoice auto-generation
3. [P1] Proration logic
4. [P2] Customer portal próprio

## 7) Admin/Monitoring

| Recurso | Linear | Vercel | Aethel Engine | Gap |
|---|---|---|---|---|
| Triage intelligence | AI auto-routing | N/A | Manual | P2 |
| Metrics dashboard | Velocity/cycle | Observability | AdminDashboardPro | P1 |
| Real-time logs | Live logs | Live logs | Não | P1 |
| Error tracking | Sentry | Vercel | Console.error | P0 |
| Security events | Audit logs | Audit logs | Mock | P1 |
| Session replay | Integrations | Integrations | Não | P2 |

**Roadmap**
1. [P0] Error tracking (Sentry/Rollbar)
2. [P1] Real-time logs (SSE/WebSocket)
3. [P1] Security audit logs
4. [P2] Session replay

## 8) Design Tokens

| Aspecto | Figma Variables | Material 3 | Aethel Engine | Gap |
|---|---|---|---|---|
| Naming | Semantic + DTCG | Material | custom | P2 |
| Theming | Variable modes | Dynamic | [data-theme='light'] | P2 |
| Docs | Auto | Material.io | Inline | P1 |
| Enforcement | Lint | Lint | Manual | P0 |
| Hardcoded detection | Automated | Automated | Grep | P0 |
| Cross-platform | Multi | Multi | CSS only | P2 |

**Roadmap**
1. [P0] ESLint rule para bloquear cores hardcoded
2. [P0] Refatorar cores hardcoded para tokens
3. [P1] Documentar token usage (Storybook)
4. [P1] CI check para cores hardcoded
5. [P2] Migrar naming para DTCG

## 9) Microcopy e Localização PT-BR

**Drift de inglês**
1. Termos-chave em Preview, Chat, Explorer, Admin, Marketplace

**Plano de normalização**
1. [P0] Arquivo de strings centralizadas (`lib/locales/pt-BR.ts`)
2. [P0] Refatorar termos em inglês
3. [P1] i18n library (next-i18next)
4. [P1] CI check para strings hardcoded
5. [P2] Glossário PT-BR

## Matriz de priorização

**P0 - Blockers críticos**
1. HMR para preview runtime
2. Agent Mode multi-step
3. Buttons sem type
4. Focus visible inconsistente
5. Contraste não validado
6. LSP real
7. STRIPE_WEBHOOK_SECRET
8. Extension publishing API
9. Hardcoded colors
10. Termos em inglês

**P1 - Alta prioridade**
1. Background agents
2. Apply code com preview diff
3. Split editors
4. Keyboard navigation completa
5. Target size < 24px
6. Invoice auto-generation
7. Extension permissions
8. Real-time logs

**P2 - Backlog**
1. Drag-and-drop panels
2. Minimap/breadcrumbs
3. Custom keybindings editor
4. Feedback visual no preview
5. Session replay
6. Redundant entry prevention
7. Multi-idioma i18n
8. DTCG migration

## Roadmap por fase

**Fase 1 (4-6 semanas) – Conformidade básica**
1. Botões com type
2. STRIPE_WEBHOOK_SECRET
3. Focus visible
4. Contraste
5. Refatorar cores
6. Strings PT-BR

**Fase 2 (8-12 semanas) – Paridade core**
1. HMR runtime
2. Agent mode multi-step
3. LSP real
4. Apply code com diff
5. Split editors
6. Keyboard navigation

**Fase 3 (6-8 semanas) – Ecossistema e observabilidade**
1. Extension API
2. Permissões
3. Error tracking
4. Real-time logs
5. Audit logs

**Fase 4 (contínuo) – Polimento**
1. Background agents
2. Voice-first workflows
3. Session replay
4. Drag-and-drop avançado
5. i18n completo

## Conclusão executiva

Aethel Engine v2.0.0 tem base sólida, mas gaps relevantes em acessibilidade, IDE core e agent mode. Priorizar Fase 1 para liberar operação real e só então promover claims de paridade.
