# Aethel Engine — Spec Canônica
## Chat Copilot + Livro (Gibi) + Grafo (Memória IA) + 1/2/3 Agentes (Autopiloto)

**Data**: 2026-01-01  
**Status**: Spec proposta para implementação  
**Objetivo**: entregar a melhor experiência tipo “Copilot Chat”, com autopiloto real, multi-agentes opcionais (1/2/3), e um **Livro** (história/projeto) editável no split view — sincronizado com um **Grafo interno** para evitar perda de contexto em projetos grandes (10k+ linhas).

---

## 0) Alinhamento com o que já existe no repo (base real)

Esta spec aproveita e se integra explicitamente com:

- **Infra AI + Orquestração**: ver [docs/ai-agent-architecture.md](ai-agent-architecture.md)
  - Orchestrator + Provider Registry + Streaming contract + Tooling + Billing/Metering + Safety.
- **Mapa de UI AI/Chat**: ver [docs/ai-ui-map.md](ai-ui-map.md)
  - Widgets de configuração de agentes, providers, tokens, prompts, ferramentas.
- **Estratégia de integração AI com IDE**: ver [docs/AI_INTEGRATION_STRATEGY.md](AI_INTEGRATION_STRATEGY.md)
  - Actions API (read/write/list/run), Consent System, Observability (OTel), integração com editor/terminal/preview.
- **Limites por plano no Web App**: ver [cloud-web-app/web/lib/plan-limits.ts](../cloud-web-app/web/lib/plan-limits.ts)
  - checkAIQuota / checkModelAccess / checkFeatureAccess.
- **Status de uso (fonte de verdade p/ UI)**: [cloud-web-app/web/app/api/usage/status/route.ts](../cloud-web-app/web/app/api/usage/status/route.ts)
  - expõe `models`, `features`, `limits.maxAgents`, `limits.maxTokensPerRequest`.
- **Copilot Context & Actions (Web)**:
  - Actions allowlist: [cloud-web-app/web/app/api/copilot/action/route.ts](../cloud-web-app/web/app/api/copilot/action/route.ts)
  - Context store/merge: [cloud-web-app/web/app/api/copilot/context/route.ts](../cloud-web-app/web/app/api/copilot/context/route.ts)
- **Trace de detalhes ("Ver detalhes")**: [cloud-web-app/web/app/api/ai/trace/[traceId]/route.ts](../cloud-web-app/web/app/api/ai/trace/%5BtraceId%5D/route.ts)
  - leitura lazy do trace persistido (AuditLog), sem transcrição bruta.
- **Chat avançado (multi-role 1/2/3)**: [cloud-web-app/web/app/api/ai/chat-advanced/route.ts](../cloud-web-app/web/app/api/ai/chat-advanced/route.ts)
  - contrato (POST) suporta `agentCount` (1|2|3) e `roleModels` (architect/engineer/critic), com enforcement por plano/quota/model.
- **Credenciais seguras com LivePreview**: ver [src/common/credentials/CREDENTIAL_SYSTEM.md](../src/common/credentials/CREDENTIAL_SYSTEM.md)

Nota de realidade: existem áreas marcadas como “DEMO/PAPEL” na matriz owner. Esta spec define como evoluir essas áreas sem quebrar o que já é REAL (gates, CI, quotas, allowlist).

---

## 1) Princípios de produto (“dono”, sem lacunas)

1. **Autopiloto real por padrão**
   - O sistema executa ações e entrega resultados concretos.
   - Deve existir um modo opcional “Confirmar mudanças” para usuários que desejam controle.

2. **Sem mocks / sem protótipos / sem lacunas**
   - Proibido: respostas vazias, TODOs, placeholders e “depois fazemos”.
   - Se faltar dado: perguntar até **3 perguntas objetivas**; se ainda for possível avançar com opções explícitas, avançar.

3. **Chat é conversa; Livro é memória oficial**
   - O chat não é o “lugar onde o projeto mora”.
   - A fonte de verdade é o Livro (para humanos) + Grafo (para IA).

4. **Multi-agente é opcional e não muda a UX**
   - Com 1 IA: ela faz Arquiteto + Engenheiro + Crítico internamente.
   - Com 2–3 IAs: paraleliza, mas o usuário continua vendo uma thread organizada.

5. **Não travar IDE/plataforma**
   - Execução de agentes em worker/processo isolado.
   - UI recebe eventos e aplica backpressure.

6. **Planos e consumo são parte do produto**
   - Seleção de modelos/roles respeita plano e quota.
   - O usuário vê consumo por etapa e recebe degradação elegante se atingir limites.

---

## 2) Superfícies de UX (Copilot-like)

### 2.1 Chat com barra inferior (modelo Copilot)

No composer do chat (parte inferior), o usuário escolhe:

- **Quantidade de agentes**: 1 / 2 / 3
- **Roles → Modelos** (dropdown por role, filtrado por plano):
  - Arquiteto (Roteiro/Lore/PRD)
  - Engenheiro (Execução)
  - Crítico (Consistência/QA)
- **Modo**: Autopiloto (default) / Confirmar mudanças
- **Entrada**: texto + áudio

Regras:
- A UI só lista modelos permitidos pelo plano (via checkModelAccess).
- A UI só habilita 2/3 agentes quando a feature/entitlement permitir.

### 2.2 Split view profissional: Chat + Livro (Gibi)

- Painel esquerdo: chat.
- Painel direito: Livro do Projeto (editor e viewer).

O Livro deve permitir:
- leitura “como história” (páginas/capítulos, layout tipo gibi)
- edição direta
- histórico de alterações
- busca
- navegação por capítulos e entidades (personagens, locais, habilidades)

### 2.3 Transparência organizada (sem spam)

Cada etapa no chat aparece como um bloco compacto:

- Resumo (1–3 linhas)
- “Atualizado no Livro”: links para as seções alteradas
- “Arquivos alterados / comandos”: colapsados por padrão
- “Revisão do Crítico”: badge ✅/⚠️/❌ com 1–3 bullets
- Botões: Cancelar etapa, Reexecutar etapa, Aplicar correções do crítico

Camadas de detalhe (UX profissional, Copilot-like):
- **Padrão (compacto)**: só o que o usuário precisa para decidir “seguir ou ajustar”.
- **Ver detalhes (expandido)**: evidências e execução, sem transcrição bruta do debate interno.
  - evidências (arquivos consultados, trechos relevantes, checks executados)
  - decisões (A/B quando aplicável) + justificativa curta
  - comandos e resultados (ex.: testes/gates) com saída colapsada
  - consumo por role (tokens/custo) e alertas de quota
- **Trilha técnica (debug/admin)**: logs e telemetria completos, com redaction de segredos, acessível por permissão.

---

## 3) Livro do Projeto (humano) — estrutura recomendada

O Livro é um documento vivo, editável pelo usuário e pela IA, com estrutura estável (para âncoras e sincronização).

### 3.1 Seções fixas (para games/filmes)

- **Mundo e Mapa**
  - regiões, clima, facções, timeline global
- **Jogabilidade**
  - loops, progressão, economia, regras
- **Personagens e Habilidades**
  - skills, efeitos, cooldown, custos, fraquezas, relações
- **Roteiro e Sub-roteiros**
  - capítulos, quests, arcos, eventos, consequências

### 3.2 Para software (apps/sites/ferramentas)

A mesma lógica, com rótulos diferentes:

- Visão do Produto (PRD)
- Arquitetura (módulos/contratos)
- Backlog (épicos → histórias → tarefas)
- Regras e padrões (lint, testes, deploy)

---

## 4) Grafo interno (IA) — memória eficiente e consistência

O Grafo é reservado para as IAs, mas derivado do mesmo conteúdo do Livro.

### 4.1 Tipos de nós

- Character
- Location
- Event
- Quest (ou Chapter)
- Mechanic
- Ability
- Rule
- Asset (som, imagem, VFX)

### 4.2 Tipos de arestas

- depends_on
- causes
- appears_in
- contradicts
- relates_to
- balances_with

### 4.3 Âncoras (link Livro ↔ Grafo)

Cada trecho relevante do Livro recebe um ID estável (ex.: `bookAnchorId`).

- O Livro guarda o texto e a hierarquia (capítulo → cena → parágrafo).
- O Grafo referencia essas âncoras para:
  - citar fonte
  - validar coerência
  - limitar contexto a um subgrafo relevante

---

## 5) Edição e sincronização (Livro ↔ Grafo) com pausa e replanejamento

### 5.1 Eventos centrais

- `book.patch` (usuário editou no painel ou via chat)
- `graph.patch` (reconciliação/atualização do grafo)
- `mission.paused` / `mission.resumed`
- `step.replanned`

### 5.2 Classificação de impacto (simples vs brusca)

Ao receber `book.patch`, o sistema calcula impacto:

- **Simples**: typo, ajuste local, microdetalhe → atualizar grafo local e seguir.
- **Brusca**: muda pilares (mundo, mecânica central, arco principal) → pausar missão, replanejar etapas futuras.

Regra: se o patch toca no escopo/objetivo da etapa atual, sempre pausar.

### 5.3 Replanejamento imediato (autopiloto)

- Em autopiloto, o sistema aplica o patch e replaneja automaticamente.
- Em modo “Confirmar mudanças”, o sistema propõe patch e espera confirmação.

---

## 6) Agentes e papéis

### 6.1 Roles

- **Arquiteto** (Planner/Lore Master)
  - transforma ideias do usuário em Livro + Grafo
  - mantém coerência macro e estrutura
- **Engenheiro** (Executor)
  - executa ferramentas, edita arquivos, roda comandos
  - entrega real (sem protótipos)
- **Crítico** (Consistency/QA)
  - revisa cada etapa em paralelo, sem virar gargalo

### 6.2 Modo 1 IA (multiplex)

Quando o usuário seleciona 1 agente:

1) Arquiteto interno: decide/organiza e atualiza Livro/Grafo
2) Engenheiro interno: executa ações
3) Crítico interno: 1 revisão curta
4) Orquestrador publica 1 resposta final (UX constante)

---

## 6.3 Debate interno (2–3 IAs) sem loop infinito

Objetivo: permitir que Arquiteto/Engenheiro/Crítico “debatam” internamente o necessário **para aumentar qualidade**, mantendo a experiência do usuário **rápida e limpa**.

Princípio:
- Debate é **mecanismo interno**, não uma experiência. O usuário vê **1 resposta final**.

### “Vasculhar” sem se perder (qualidade máxima)

Os agentes podem (e devem) investigar internamente tudo que for necessário para não perder qualidade:
- ler arquivos relevantes, buscar símbolos, checar invariantes, rodar gates
- gerar e validar hipóteses (A/B), apontar riscos e contradições
- revisar consistência entre Livro ↔ Grafo ↔ código

Porém:
- **Não expor transcrição bruta** do debate interno (mensagens “um para o outro”).
- Em vez disso, produzir **artefatos estruturados** para o usuário poder expandir com segurança.

Artefatos mínimos por etapa:
- `decisionRecord`: decisão final + 1–3 motivos + tradeoffs.
- `evidence[]`: lista curta de evidências (o que foi checado e o que sustentou a decisão).
- `riskChecks[]`: o que pode quebrar + mitigação.
- `toolRunSummary`: comandos/ações executadas + status.

### Política por etapa (fixa e anti-loop)

- `maxDebateRoundsPerStep = 1`
- `criticPassesPerStep = 1`
- `maxOptions = 2` (A vs B)
- Se faltar informação: no máximo **3 perguntas objetivas** ao usuário.

### Quando envolver o usuário

Somente quando:
- existir um tradeoff real (custo/tempo/qualidade)
- houver contradição que depende de preferência do usuário
- faltar dado crítico para evitar lacunas
- o usuário pedir explicitamente “mostre opções/debate”

### O que o usuário vê

- Por padrão: decisão final + 1–2 linhas de justificativa.
- Opcional: botão “Ver detalhes” que mostra evidências + execução (colapsado), e (quando aplicável) “Ver opções” com A/B + parecer curto do Crítico.

---

## 7) Contratos de mensagens (interno) e streaming

Baseado em [docs/ai-agent-architecture.md](ai-agent-architecture.md):

- Streaming envelope: `{ id, seq, delta, meta }`
- Backpressure obrigatório (buffer limitado)

Recomendação: todos os agentes respondem internamente com um contrato estruturado (mesmo que o chat mostre só resumo):

- summary
- questions (max 3)
- bookPatch
- graphPatch
- actions
- evidence (lista curta, sem segredos)
- decisionRecord (decisão + motivos)
- riskChecks
- risks
- doneCriteria
- telemetry (model, tokensIn/out, cost)

---

## 8) Prompts base (profissionais, “dono”, sem lacunas)

### 8.1 Prompt global (aplica a todos)

- Você é dono do negócio/produto.
- Proibido: mocks, placeholders, lacunas.
- Se faltar dado: até 3 perguntas objetivas.
- Memória oficial = Livro + Grafo.
- Anti-loop: maxRounds por etapa; crítico 1x por etapa.
- Respeite quotas/planos: validar modelo e consumo.

### 8.2 Prompt do Arquiteto

- Converta ideias do usuário (texto/áudio) em Livro (capítulos/cenas) completo.
- Atualize o Grafo para manter consistência em histórias longas.
- Se houver contradição, proponha 2–3 resoluções e peça escolha.

### 8.3 Prompt do Engenheiro

- Executar ações reais com ferramentas.
- Registrar comandos e artefatos.
- Rodar gates relevantes ao final da etapa.

### 8.4 Prompt do Crítico

- Veredito ✅/⚠️/❌ por etapa.
- 1–3 bullets de correção mínima.
- Sem debate infinito.

---

## 9) Ferramentas e integrações (alinhado ao que temos)

### 9.1 Actions API (Web) — allowlist

No Web app existe uma superfície allowlist (ex.: `workspace.tree`, `workspace.files`, `files.read`).

Regras desta spec:
- manter allowlist por padrão
- expandir com cuidado para “write/run” (se habilitar), sempre via Consent System + auditoria

### 9.2 Copilot Context

- Usar o contexto por workflow para manter:
  - estado do editor (arquivo ativo/seleção)
  - estado do live preview (ponto selecionado/câmera)
  - arquivos abertos

### 9.3 Consent System + credenciais seguras

- Antes de ações de risco (executar comandos destrutivos, acessar credenciais, publicar/deploy), exigir consent.
- Fluxo de credenciais pode usar LivePreview como UI segura (conforme [src/common/credentials/CREDENTIAL_SYSTEM.md](../src/common/credentials/CREDENTIAL_SYSTEM.md)).

### 9.4 LivePreview

- Objetivo: o Livro (gibi) e o preview (web/3D) devem ser superfícies de feedback.
- LivePreview não deve bloquear o chat; eventos e render devem ser desacoplados.

---

## 10) Quotas, planos e custos (sem surpresas)

Alinhar com [cloud-web-app/web/lib/plan-limits.ts](../cloud-web-app/web/lib/plan-limits.ts):

- Antes de iniciar missão:
  - checkFeatureAccess("chat")
  - checkFeatureAccess("agents") para habilitar 2/3 agentes
  - checkModelAccess para cada role
- Antes de cada etapa:
  - checkAIQuota (estimativa) e validar requests/dia

### 10.0 Objetivo econômico (evitar prejuízo)

Multi-agentes aumentam consumo. Para manter margem:

- **Cap de tokens por request** (anti-spike): limite duro por plano.
- **Agentes por plano**: 2–3 agentes somente em planos com feature `agents`.
- **Degradação elegante**: se o usuário estiver perto do limite, reduzir custo automaticamente (ex.: sugerir modelo mais barato para Arquiteto/Crítico) e avisar no chat.

Observação: o enforcement por tokens é um proxy de custo. Para máxima precisão financeira, a evolução natural é contabilizar também custo estimado por modelo (USD) — sem quebrar a UX.

### 10.1 Contabilização por agente

Registrar uso por etapa e por role:
- architectTokens
- engineerTokens
- criticTokens

Exibir no chat (compacto): “Uso nesta etapa: X tokens (Arquiteto), Y (Eng.), Z (Crítico)”.

### 10.2 Degradação elegante

Se quota/modelo não permitido no meio da missão:
- fallback para modelo permitido
- ou reduzir agentes (desligar crítico primeiro)
- sempre avisar no chat de forma curta

---

## 11) Observabilidade e auditoria (OTel)

Alinhar com estratégia de OTel citada em [docs/AI_INTEGRATION_STRATEGY.md](AI_INTEGRATION_STRATEGY.md):

Eventos estruturados mínimos:
- request.start / request.end
- step.start / step.end
- book.patch.applied
- graph.patch.applied
- tool.start / tool.end
- quota.denied
- consent.requested / consent.granted

Regras de trilha (para “Ver detalhes” e debug):
- Armazenar **trace estruturado por etapa** (evidence/decisionRecord/riskChecks/tool summaries), referenciado por `workflowId/stepId`.
- **Redaction obrigatório**: nunca persistir segredos (tokens/chaves), paths sensíveis fora do workspace, ou payloads de credenciais.
- UI consome o trace de forma **lazy** (carregar detalhes só ao expandir), para não travar o chat.

Todas as entidades devem ter:
- requestId
- workflowId
- projectId
- userId
- stepId

---

## 12) Requisitos não-funcionais (não travar)

- Execução em worker/processo isolado.
- Backpressure para streaming.
- Logs colapsáveis.
- Detalhes carregados sob demanda (lazy expand) por etapa.
- Cancelamento (AbortController) por etapa e por missão.

---

## 13) Roadmap de implementação (incremental e verificável)

### Fase 1 — Livro no split view (MVP de UX)
- Criar o painel do Livro (viewer + editor) ao lado do chat.
- Persistir Livro por workflow/projeto.
- Suportar edição no painel e via chat.

### Fase 2 — Grafo interno + sincronização
- Implementar âncoras e grafo mínimo.
- Reconciliação Livro↔Grafo com classificação de impacto.

### Fase 3 — Multi-agentes (1/2/3) e prompts base
- Seletores no composer (agentes + modelos por role).
- Modo 1 IA multiplex.
- Crítico por etapa em paralelo.

### Fase 4 — Quotas/consent/políticas end-to-end
- Enforcing completo por plano.
- Auditoria + telemetria por etapa/agente.

### Fase 5 — Gibi avançado + export/import
- Export Markdown + JSON do grafo.
- Viewer de “páginas” mais rico e navegação por entidades.

---

## 14) Definição de pronto (DoD)

- O usuário cria um projeto e consegue:
  - conversar no chat
  - ver o Livro no split view
  - editar o Livro e ver replanejamento
  - rodar 1 IA (multiplex) e opcionalmente 2–3 IAs
  - ver consumo por etapa e bloqueios por plano de forma clara
- Sem travamentos perceptíveis na UI durante streaming e execuções.

---

## 15) Apêndice — referências úteis no repo

- Arquitetura agentes: [docs/ai-agent-architecture.md](ai-agent-architecture.md)
- Estratégia AI: [docs/AI_INTEGRATION_STRATEGY.md](AI_INTEGRATION_STRATEGY.md)
- Mapa UI: [docs/ai-ui-map.md](ai-ui-map.md)
- Plan limits: [cloud-web-app/web/lib/plan-limits.ts](../cloud-web-app/web/lib/plan-limits.ts)
- Copilot actions: [cloud-web-app/web/app/api/copilot/action/route.ts](../cloud-web-app/web/app/api/copilot/action/route.ts)
- Copilot context: [cloud-web-app/web/app/api/copilot/context/route.ts](../cloud-web-app/web/app/api/copilot/context/route.ts)
- Credenciais: [src/common/credentials/CREDENTIAL_SYSTEM.md](../src/common/credentials/CREDENTIAL_SYSTEM.md)
