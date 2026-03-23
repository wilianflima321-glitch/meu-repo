# Relatório de Continuação — Auditoria Multi‑Agente (Baseado nos .md)

## Contexto e Fonte de Verdade
Esta continuidade usa exclusivamente os documentos em `audit dicas do emergent usar/` como fonte de verdade, conforme solicitado. Esses arquivos definem o estado atual (ausência de IDE), lacunas e o plano de execução para uma IDE web AAA unificada com Workbench, IA nativa, preview e colaboração.

---

## FASE 0 — Leitura Completa (Escopo: pasta de fonte de verdade)
Arquivos revisados (todos em `audit dicas do emergent usar/`):
- `FULL_AUDIT.md`
- `DUPLICATIONS_AND_CONFLICTS.md`
- `LIMITATIONS.md`
- `COMPETITIVE_GAP.md`
- `WORKBENCH_SPEC.md`
- `AI_SYSTEM_SPEC.md`
- `EXECUTION_PLAN.md`
- `8_ADMIN_SYSTEM_SPEC.md`
- `9_BACKEND_SYSTEM_SPEC.md`

---

## FASE 1 — Auditoria Total do Produto (paralelo por dimensão)

### 1) Produto & UX
- **Estado atual**: não existe Workbench/IDE implementada; fluxos, onboarding e jornadas críticas estão ausentes ou não documentados como implementação, apenas como definição necessária. A base é um template React sem consistência finalizada. Isso confirma que o produto real ainda não funciona como IDE (estado: “não implementado”).【F:audit dicas do emergent usar/FULL_AUDIT.md†L13-L76】
- **Fluxos definidos (mas não implementados)**: criação de projeto, edição (editor + preview + viewport + timeline) e deploy one‑click são exigidos, porém listados como P0/P1 sem implementação atual.【F:audit dicas do emergent usar/FULL_AUDIT.md†L29-L63】
- **Jornadas críticas**: criar app, editar com IA, preview, deploy e colaboração estão listados como prioridade, mas com status “não implementado”.【F:audit dicas do emergent usar/FULL_AUDIT.md†L53-L61】

### 2) Frontend & IDE
- **Workbench (shell única)**: especificação completa do layout, menu, barras, painel inferior, AI panel e status bar, com layout grid e painéis redimensionáveis; isso define o alvo, mas não prova implementação existente.【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L1-L166】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L229-L318】
- **Editor**: Monaco é o componente alvo; tabs, minimap e atalhos estilo VS Code são requisitos, não capacidades existentes.【F:audit dicas do emergent usar/FULL_AUDIT.md†L78-L126】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L118-L176】
- **Preview & Viewport**: preview via iframe e viewport 3D via Three.js definidos, mas não implementados; timeline é escopo futuro (P2/P3).【F:audit dicas do emergent usar/FULL_AUDIT.md†L85-L125】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L176-L227】
- **Performance percebida**: targets claros (load, refresh, latency) definidos para Workbench, porém são metas, não métricas de produção atuais.【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L387-L401】

### 3) Backend & Infra
- **Arquitetura necessária**: API Gateway FastAPI, serviços de auth, projects, files, execution, preview, AI, collab e deploy, com MongoDB/S3/Redis/containers/K8s; descrito como arquitetura alvo, não existente.【F:audit dicas do emergent usar/FULL_AUDIT.md†L128-L185】【F:audit dicas do emergent usar/9_BACKEND_SYSTEM_SPEC.md†L1-L87】
- **Serviços core**: execução em containers, build/deploy, WebSocket para preview e collab; definidos no spec, mas listados como a construir no plano P0/P1.【F:audit dicas do emergent usar/FULL_AUDIT.md†L150-L173】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L146】

### 4) IA & Automação
- **Níveis de IA**: L1 a L5 (inline → multi‑agent) são exigidos, com status atual “não implementado” no documento de auditoria; o spec detalha arquitetura e fluxos para chat, ações, agent e multi‑agent, porém sem implementação comprovada.【F:audit dicas do emergent usar/FULL_AUDIT.md†L186-L229】【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L1-L118】【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L119-L233】

### 5) Colaboração & DX
- **Colaboração real‑time**: prevista com Yjs + awareness, comentários, histórico e roles; status atual é inexistente, apontado no gap geral e roadmap P1.【F:audit dicas do emergent usar/FULL_AUDIT.md†L238-L264】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L146】

### 6) Negócio & Mercado
- **Proposta de valor**: IDE web unificada (code + game + vídeo + IA), com paralelismo via multi‑agents; segmentos alvo e diferenciais estão definidos, mas sem indicação de validação real atual.【F:audit dicas do emergent usar/FULL_AUDIT.md†L266-L309】

---

## FASE 2 — Duplicidades e Conflitos
- **Storage**: duplicidade S3 + MongoDB para conteúdo é rejeitada; decisão é S3 para conteúdo e MongoDB só metadata (unificar).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L16-L27】
- **Auth**: conflito JWT vs session; decisão remover session e manter JWT único (remover).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L29-L37】
- **Preview**: conflitos entre iframe/webview e múltiplos HMRs; decisão unificar em iframe sandboxed + único HMR (unificar).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L39-L49】
- **Workbench vs editor simples**: decisão firme por IDE completa com preview integrado e terminal fixo (unificar visão).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L51-L63】
- **AI chat**: decisão manter chat lateral + integração no editor (combinar).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L65-L74】
- **Fluxos**: criação e deploy devem convergir para Workbench e one‑click deploy, com Git opcional (unificar fluxo).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L90-L113】
- **Nomenclatura e atalhos**: padronização com VS Code (Ctrl+Shift+P, Ctrl+P etc.) definida como P0 UX consistency.【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L125-L157】

---

## FASE 3 — Comparação AAA (sem marketing)
**Baseado no documento competitivo; apenas o que está documentado.**
- **VS Code Web**: superior em extensões, performance e IntelliSense; inferior em deploy integrado e colaboração nativa. Oportunidade: IDE web com AI/Deploy nativos.【F:audit dicas do emergent usar/COMPETITIVE_GAP.md†L19-L64】
- **Replit**: superior em zero‑config, deploy e collab; inferior em poder do editor e debug; não oferece 3D/ vídeo nativo. Oportunidade: editor mais poderoso + multi‑agent e 3D web básico.【F:audit dicas do emergent usar/COMPETITIVE_GAP.md†L66-L111】
- **Cursor**: superior em AI code intelligence e multi‑file; inferior por ser desktop e sem deploy/collab; oportunidade: browser‑first + deploy + collab.【F:audit dicas do emergent usar/COMPETITIVE_GAP.md†L113-L150】
- **Vergent**: multi‑agent paralelo forte; fraco em UX, deploy e preview; oportunidade: UX superior e deploy integrado no browser.【F:audit dicas do emergent usar/COMPETITIVE_GAP.md†L151-L188】
- **Unreal/Unity/Premiere**: AAA em viewport/timeline, mas desktop‑only e complexos; gaps do web incluem limitações reais de WebGL/WebGPU e processamento de mídia; a plataforma visa versões simplificadas (não equivalentes totais).【F:audit dicas do emergent usar/COMPETITIVE_GAP.md†L190-L261】【F:audit dicas do emergent usar/LIMITATIONS.md†L1-L176】
- **Matriz por área (editor, docking, viewport, timeline, preview, AI, collab, deploy)**: targets e scores definidos, mostrando o que é possível no web e onde ficam os limites; não há prova de implementação, apenas metas.【F:audit dicas do emergent usar/COMPETITIVE_GAP.md†L263-L392】

---

## FASE 4 — Limitações Atuais (somente fatos documentados)
- **Browser/3D**: WebGL/WebGPU limitações (compute, memória GPU ~2GB, WebGPU incompleto, multi‑threading restrito).【F:audit dicas do emergent usar/LIMITATIONS.md†L11-L37】
- **Execução de código**: sandbox do browser impede filesystem real; Node.js não nativo; WASM não é full‑native; multi‑language exige containers.【F:audit dicas do emergent usar/LIMITATIONS.md†L39-L58】
- **Infra**: cold start de containers (2–5s), custo por usuário e limites de concorrência; WebSocket scale e limites de APIs de IA são críticos。【F:audit dicas do emergent usar/LIMITATIONS.md†L70-L108】
- **IA**: context windows caros, latência e custos por usuário são relevantes; risco de hallucinations e perda de contexto é real。【F:audit dicas do emergent usar/LIMITATIONS.md†L110-L150】
- **Gráficos & mídia**: 3D web com limites severos de triângulos/draw calls/texture; edição de vídeo web com limites de codec, tracks e export; áudio com restrições Web Audio e ausência de VST. 【F:audit dicas do emergent usar/LIMITATIONS.md†L152-L200】
- **Colaboração**: conflitos, escala >10 editores e offline são riscos; Git no browser e diffs binários são limitados.【F:audit dicas do emergent usar/LIMITATIONS.md†L202-L232】
- **Produto/UX**: onboarding complexo e mobile editing limitado; estratégia desktop‑first é assumida.【F:audit dicas do emergent usar/LIMITATIONS.md†L234-L248】
- **Negócio**: custos operacionais altos (compute + AI), necessidade de pricing com limites; riscos mapeados (AI costs, performance, segurança).【F:audit dicas do emergent usar/LIMITATIONS.md†L250-L318】

---

## FASE 5 — Decisões Executivas (baseadas nos .md)
- **Remover imediatamente**: auth baseado em session e qualquer duplicidade de preview/ HMR; manter JWT e preview único (decisão explícita).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L29-L49】
- **Unificar**: sistema de arquivos (S3 conteúdo + MongoDB metadata), nomenclatura, atalhos e fluxos de criação/deploy; Workbench como shell principal (decisão explícita).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L16-L27】【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L90-L157】
- **Refatorar agora**: estabelecer layout Workbench, editor Monaco, preview e AI chat/inline como P0 (roadmap).【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L146】
- **Adicionar (viável)**: IA nativa L1‑L3 P0/P1, colaboração real‑time P1, RAG/agent P1; viewport 3D e timeline são P2/P3.【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L146】
- **Adiar conscientemente**: plugins, multi‑provider AI e self‑hosted são P2/P3; mobile full‑editing e export de vídeo 8K são explicitamente não‑prioridades.【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L159-L188】【F:audit dicas do emergent usar/LIMITATIONS.md†L320-L332】
- **Não fazer**: rodar Unreal completo no browser e edição 8K são limitantes aceitas (escopo morto).【F:audit dicas do emergent usar/LIMITATIONS.md†L320-L332】

---

## FASE 5.1 — Correções e Ajustes Necessários (baseado em gaps documentados)
Esta seção consolida o que precisa ser corrigido/alinhado para sair de “documentação” e chegar ao produto executável, sem adicionar funcionalidades novas.

### 1) Core do produto (bloqueadores)
- **Workbench inexistente** → prioridade P0 para layout e shell única (menu, sidebar, main, AI panel, bottom, status bar).【F:audit dicas do emergent usar/FULL_AUDIT.md†L13-L76】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L88】
- **Editor não integrado** → integrar Monaco com tabs, shortcuts e sincronização de arquivos (P0).【F:audit dicas do emergent usar/FULL_AUDIT.md†L78-L126】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L90-L126】
- **Preview inexistente** → iframe sandbox + hot reload via WebSocket (P0).【F:audit dicas do emergent usar/FULL_AUDIT.md†L85-L125】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L108-L126】

### 2) IA como parte core (não opcional)
- **IA sem implementação** → iniciar com L1‑L3 (autocomplete, chat, quick actions) e preparar caminho para agent/multi‑agent (P1).【F:audit dicas do emergent usar/FULL_AUDIT.md†L186-L229】【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L1-L233】

### 3) Execução/Deploy (sem divergências)
- **Deploy**: padronizar “one‑click” como fluxo principal e tornar Git opcional (P0/P1).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L90-L113】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L168-L186】
- **Execução em container**: reduzir cold‑start com pools quentes e limitar concorrência por tier (mitigação explícita).【F:audit dicas do emergent usar/LIMITATIONS.md†L70-L108】

### 4) Colaboração real (sem promessas vazias)
- **Colab**: introduzir Yjs com awareness como base (P1) e reconhecer limites de escala >10 editores e offline (mitigação futura).【F:audit dicas do emergent usar/LIMITATIONS.md†L202-L232】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L52】

---

## FASE 6 — Visão Final: IDE AAA Unificada (somente alinhamento com specs)
- **Workbench como shell única**: layout, docking, menu, status bar e painéis definidos no spec; esse é o núcleo da experiência de IDE tipo VS Code, com preview e AI integrados no mesmo shell.【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L1-L166】
- **Editor + Preview + Viewport + Timeline**: editor Monaco, preview via iframe, viewport 3D via Three.js, timeline básica planejada; todos integrados no layout principal e sujeitos às limitações web documentadas.【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L118-L227】【F:audit dicas do emergent usar/LIMITATIONS.md†L152-L200】
- **IA nativa**: sistema L1‑L5 com contexto integrado e ações rápidas (Ctrl+K), incluindo agent e multi‑agent com orquestração; integração é core, não plugin.【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L1-L233】
- **Backend e Admin**: backend em FastAPI com serviços de auth, files, execution, deploy, collab e AI; admin para billing, custos de IA, moderação e logs (necessário para operar custos e limites).【F:audit dicas do emergent usar/9_BACKEND_SYSTEM_SPEC.md†L1-L87】【F:audit dicas do emergent usar/8_ADMIN_SYSTEM_SPEC.md†L1-L63】

---

## FASE 6.1 — Interface Coesa e Polida (unificação de UX/UI)
Esta seção consolida decisões de interface para garantir **uma única shell (Workbench)** e UX consistente, alinhada ao que já está definido nos specs (sem inventar capacidades novas).

### 1) Layout único e docking consistente
- **Workbench como shell única** com áreas fixas e redimensionáveis (menu, activity bar, sidebar, main, AI panel, bottom panel, status bar) para evitar variações de layout e estados ambíguos。【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L1-L318】
- **Painéis ancorados**: Explorer à esquerda, AI à direita, Terminal em baixo; preview em tabs na área principal (flexível por projeto).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L145-L157】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L1-L166】

### 2) Nomenclatura e comandos padronizados
- **Taxonomia unificada**: Project, File (código) e Asset (mídia), Preview, Build, Deploy. Evita duplicidade de termos na UI e docs。【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L125-L141】
- **Atalhos VS Code‑like** para manter familiaridade e reduzir curva de aprendizado (Ctrl+Shift+P, Ctrl+P, Ctrl+`, F5, Ctrl+K).【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L143-L157】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L319-L367】

### 3) UX de IA integrada (não widget)
- **AI panel** como parte do layout principal, com ações rápidas (Ctrl+K) e chat contextual (inline + sidebar), evitando duplicação de experiências desconexas。【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L65-L74】【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L1-L118】

### 4) Feedback e estados do sistema
- **Status bar** como fonte única de estado (branch, erros, AI ready, deploy) para reduzir ambiguidade e tornar o fluxo previsível。【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L229-L287】
- **Metas de performance explícitas** para sensação de fluidez (load, refresh, terminal e AI), evitando regressões de UX durante o build‑out.【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L387-L401】

---

## FASE 6.1.1 — Alinhamento detalhado da experiência do usuário (UX/DX)
Detalhamento prático da experiência, baseado em decisões já documentadas, para garantir consistência de interface e evitar “micro‑sistemas” desconectados.

### 1) Jornada principal (P0) — criação → edição → preview → deploy
- **Criação de projeto** deve convergir para o Workbench como entrada principal, com templates claros e fluxo direto para edição (sem múltiplas rotas concorrentes).【F:audit dicas do emergent usar/FULL_AUDIT.md†L29-L63】【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L90-L113】
- **Edição** acontece no editor Monaco com tabs e atalhos familiares, reduzindo curva de aprendizado e evitando UX custom não documentada。【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L118-L176】
- **Preview** integrado ao Workbench em painel/tab, com refresh rápido e previsível; evita janelas soltas e fluxos alternativos de preview。【F:audit dicas do emergent usar/FULL_AUDIT.md†L85-L125】【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L39-L49】
- **Deploy** one‑click como padrão, com Git opcional; reduz fricção e alinha com o fluxo definido como P0/P1.【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L90-L113】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L168-L186】

### 2) Consistência de módulos (UX unificada)
- **Menu Bar e Command Palette** são fontes primárias de comando; evita duplicar ações em múltiplos menus ocultos e reduz ambiguidade para o usuário。【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L52-L118】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L369-L386】
- **Sidebar fixa com Activity Bar**: Explorer/Search/Git/AI em posição estável (esquerda), mantendo mapa mental consistente durante a sessão。【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L52-L118】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L229-L318】
- **AI Panel fixo à direita**: reduz alternância de contexto e evita “modal fatigue”, mantendo interação previsível com IA。【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L1-L166】【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L1-L118】

### 3) UX de erros e fricções (previsto nos gaps)
- **Estados vazios e erros** precisam ser padronizados; checklist de consistência exige mensagens e loading uniformes antes de cada release.【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L190-L203】
- **Latência de IA e multi‑agent** precisa de feedback visual (progress/streaming), alinhado com o spec de UX de IA e seus limites de latência. 【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L1-L189】【F:audit dicas do emergent usar/LIMITATIONS.md†L110-L150】

### 4) Acessibilidade e teclado‑first
- **Atalhos VS Code‑like** e navegação por teclado são mandatórios para produtividade e familiaridade, reduzindo abandono por curva de aprendizado【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L143-L157】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L319-L367】
- **Requisitos de acessibilidade** (WCAG AA, focus visible, live regions) devem ser seguidos desde o core do Workbench.【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L403-L424】

---

## FASE 6.2 — Sequência de entrega pragmática (sem inventar backend)
O objetivo é “entregar a plataforma pronta” **seguindo o contrato de execução** já definido, respeitando limitações reais e o roadmap P0‑P3.

### P0 (MVP funcional)
- Workbench shell + menu, sidebar, status bar, painéis redimensionáveis.【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L88】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L1-L318】
- Editor Monaco, tabs, atalhos e sync de arquivos.【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L90-L126】
- Preview via iframe com hot reload básico.【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L108-L126】
- AI chat + autocomplete + quick actions (Ctrl+K).【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L128-L166】【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L1-L189】
- Terminal integrado com PTY backend.【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L146-L166】
- Deploy one‑click mínimo viável e URL pública.【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L168-L186】

### P1 (v1.0)
- Colaboração real‑time (Yjs), multi‑agent e RAG básico conforme spec.【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L52】【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L195-L233】
- Git integration e deploy customizado (opcional).【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L52】

### P2/P3 (expansão AAA limitada pelo web)
- Viewport 3D e timeline básica conforme limitações web documentadas; plugins e marketplace somente após estabilidade do core.【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L52】【F:audit dicas do emergent usar/LIMITATIONS.md†L152-L200】

---

## FASE 6.3 — Mapa de Riscos Operacionais (com ações)
Riscos críticos já documentados e suas ações mitigadoras para manter a plataforma viável.

- **Custos de IA** (alto e variável) → limites agressivos por plano, caching e filas de execução para evitar explosão de custo。【F:audit dicas do emergent usar/LIMITATIONS.md†L110-L150】【F:audit dicas do emergent usar/LIMITATIONS.md†L250-L318】
- **Cold‑start de containers** → pools quentes e priorização por tier para preservar UX no preview/terminal。【F:audit dicas do emergent usar/LIMITATIONS.md†L70-L108】
- **Limites de WebGL/WebGPU** → fallback WebGL e otimização agressiva (LOD/streaming), aceitando gaps vs AAA desktop。【F:audit dicas do emergent usar/LIMITATIONS.md†L11-L37】【F:audit dicas do emergent usar/LIMITATIONS.md†L152-L200】
- **Escala de WebSocket** → sharding e Redis PubSub para colaboração e preview real‑time。【F:audit dicas do emergent usar/LIMITATIONS.md†L70-L108】
- **Risco de qualidade da IA** (hallucinations/context loss) → RAG e seleção de contexto, além de UX com revisão/aplicação manual。【F:audit dicas do emergent usar/LIMITATIONS.md†L110-L150】【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L1-L118】

---

## FASE 6.4 — Dicas adicionais e locais de modificação necessários (sem alucinar)
Este bloco lista **o que ainda falta** e **onde modificar** com base direta nos specs, para que nenhuma IA “se perca” e todas as decisões permaneçam rastreáveis.

### 1) Workbench e UI shell (ponto único de verdade)
- **Local de referência**: `WORKBENCH_SPEC.md` define layout, docking, atalhos, status bar, temas e acessibilidade. Alterações de UI devem partir daqui para evitar divergência de UX。【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L1-L424】
- **Lacuna**: Workbench ainda não existe como implementação (documento de auditoria confirma ausência). A primeira modificação real deve criar essa shell antes de qualquer feature avançada。【F:audit dicas do emergent usar/FULL_AUDIT.md†L13-L76】

### 2) Editor + Preview + Terminal (núcleo de produtividade)
- **Editor Monaco**: alvo obrigatório; atalhos e features mínimas já listadas, evitando alternativas paralelas de editor。【F:audit dicas do emergent usar/FULL_AUDIT.md†L78-L126】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L118-L176】
- **Preview**: unificar em iframe sandboxed com HMR único; não permitir múltiplos mecanismos de preview concorrentes。【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L39-L49】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L108-L126】
- **Terminal**: xterm.js integrado + PTY backend, como painel fixo; não usar modal/popups para terminal。【F:audit dicas do emergent usar/FULL_AUDIT.md†L78-L126】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L229-L267】

### 3) IA nativa (L1–L3 primeiro, L4/L5 depois)
- **Local de referência**: `AI_SYSTEM_SPEC.md` define chat, ações rápidas, agent e multi‑agent. As implementações devem seguir esta hierarquia para evitar “IA solta”.【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L1-L233】
- **Lacuna**: todos os níveis estão como “não implementados”; iniciar com autocomplete + chat + quick actions antes de agent/multi‑agent (P0/P1).【F:audit dicas do emergent usar/FULL_AUDIT.md†L186-L229】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L128-L166】

### 4) Backend e execução (evitar backends paralelos)
- **Local de referência**: `9_BACKEND_SYSTEM_SPEC.md` define serviços e stack; deve existir apenas um gateway e serviços claros (auth, file, execution, AI, deploy, collab).【F:audit dicas do emergent usar/9_BACKEND_SYSTEM_SPEC.md†L1-L87】
- **Lacuna**: execução em containers, build e deploy são requisitos, mas ainda não implementados; seguir o roadmap P0/P1 para evitar divergência de stack。【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L186】

### 5) Colaboração e DX (evitar promessas vazias)
- **Colaboração**: Yjs + awareness é a base; limites de escala e offline precisam ser reconhecidos e tratados como P1/P2, não como “já pronto”.【F:audit dicas do emergent usar/LIMITATIONS.md†L202-L232】【F:audit dicas do emergent usar/FULL_AUDIT.md†L238-L264】

### 6) Admin e custos (viabilidade real)
- **Local de referência**: `8_ADMIN_SYSTEM_SPEC.md` define módulos críticos para monitorar custos e uso; sem isso, custos de IA e infra ficam invisíveis。【F:audit dicas do emergent usar/8_ADMIN_SYSTEM_SPEC.md†L1-L63】
- **Lacuna**: painel admin não está implementado e é necessário antes de escalar usuários pagos (riscos já documentados).【F:audit dicas do emergent usar/LIMITATIONS.md†L250-L318】

### 7) Dispositivos e limites web (realidade do browser)
- **Desktop‑first**: edição completa em mobile não é viável; mobile deve ser view‑only ou limitado (decisão explícita).【F:audit dicas do emergent usar/LIMITATIONS.md†L234-L248】
- **3D/Video**: limitações web impedem equivalência total com AAA desktop; roadmap deve manter 3D/timeline como expansão controlada P2/P3。【F:audit dicas do emergent usar/LIMITATIONS.md†L152-L200】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L52】

---

## FASE 6.5 — Planos, assinaturas e sustentabilidade (evitar prejuízo sem reduzir UX)
Esta seção alinha **planos, custos e limites** aos dados documentados para manter viabilidade financeira sem degradar a experiência do usuário.

### 1) Custos reais e risco de prejuízo
- **Custos operacionais por usuário** são altos (compute + AI + storage + bandwidth), variando entre ~$8–34/mês; sem limites claros, o prejuízo é inevitável。【F:audit dicas do emergent usar/LIMITATIONS.md†L250-L287】
- **Custos de IA** crescem rápido e são risco crítico; precisam de limites agressivos e caching já no MVP para não explodir。【F:audit dicas do emergent usar/LIMITATIONS.md†L110-L150】【F:audit dicas do emergent usar/LIMITATIONS.md†L250-L318】

### 2) Metas de preço e posicionamento
- A meta documentada é **plano gratuito limitado + pago entre $15–25**, alinhado a concorrentes (Replit/Cursor).【F:audit dicas do emergent usar/LIMITATIONS.md†L250-L287】
- **Viabilidade depende de limites por tier** (containers concorrentes, IA, storage, bandwidth), porque o custo por usuário pode ultrapassar a receita sem throttling。【F:audit dicas do emergent usar/LIMITATIONS.md†L70-L108】【F:audit dicas do emergent usar/LIMITATIONS.md†L250-L318】

### 3) O que precisa mudar/alinhação prática
- **Definir limites por plano**: quotas de execução, tokens de IA, storage e banda; sem isso o free‑tier inviabiliza o negócio。【F:audit dicas do emergent usar/LIMITATIONS.md†L250-L318】
- **Admin de custos** é obrigatório antes de escalar: monitorar uso e ajustar limites em tempo real para evitar prejuízo。【F:audit dicas do emergent usar/8_ADMIN_SYSTEM_SPEC.md†L1-L63】

---

## FASE 6.6 — Escala para milhões de usuários (infra sem travas)
Este bloco resume o que é necessário para **aguentar milhões de usuários** sem travamentos, baseado nos limites reais documentados.

### 1) Conexões e colaboração
- **WebSocket scale** (~65k conexões/servidor) exige sharding e Redis PubSub; sem isso, colaboração e preview caem em escala。【F:audit dicas do emergent usar/LIMITATIONS.md†L70-L108】
- **Colaboração** deve reconhecer limites de >10 editores e offline; precisa de arquitetura CRDT/Yjs e sharding já no P1。【F:audit dicas do emergent usar/LIMITATIONS.md†L202-L232】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L52】

### 2) Execução e preview em massa
- **Cold‑start** de containers (2–5s) exige pools quentes e priorização por tier para manter UX fluida em grande escala。【F:audit dicas do emergent usar/LIMITATIONS.md†L70-L108】
- **Concorrência de containers** é limitada; precisa de fila e limites por plano para evitar saturação e custo explosivo。【F:audit dicas do emergent usar/LIMITATIONS.md†L70-L108】

### 3) IA em escala
- **Rate limits de APIs** e latência de IA precisam de fila, cache e fallback; sem isso o sistema trava com uso intensivo。【F:audit dicas do emergent usar/LIMITATIONS.md†L110-L150】
- **Context window caro** exige RAG e seleção de contexto para não inviabilizar performance/custo em escala.【F:audit dicas do emergent usar/LIMITATIONS.md†L110-L150】【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L1-L118】

---

## FASE 7 — Plano para Superar o Vergent (documentado, sem invenção)
- **Paralelismo real**: roadmap prevê multi‑agent (L5) para tarefas paralelas, com orquestração e síntese de resultados — diferencial para superar Vergent ao trazer isso para o browser e para dentro do Workbench。【F:audit dicas do emergent usar/AI_SYSTEM_SPEC.md†L195-L233】
- **UX superior**: decisões de padronização de atalhos, layout VS Code‑like, integração de preview e AI em painel lateral suportam uma UX mais integrada do que ferramentas separadas。【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L125-L157】【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L1-L166】
- **Menos fricção**: one‑click deploy e zero‑config estão definidos como P0, alinhando competitividade direta com Replit/Vergent ao reduzir setup e depender menos de Git para publicar。【F:audit dicas do emergent usar/DUPLICATIONS_AND_CONFLICTS.md†L90-L113】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L23-L146】
- **Mais rápido e integrado**: preview web com hot reload e terminal embutido em Workbench criam ciclo de feedback rápido, alinhado com metas de performance do Workbench e P0 MVP【F:audit dicas do emergent usar/WORKBENCH_SPEC.md†L387-L401】【F:audit dicas do emergent usar/EXECUTION_PLAN.md†L92-L146】

---

## Conclusão Executiva
A documentação aponta claramente que **o produto real ainda não existe como IDE funcional**, mas há um contrato detalhado de execução (Workbench, IA, backend, admin e roadmap). A continuidade da auditoria confirma que a prioridade é implementar o núcleo (Workbench + Monaco + preview + AI + deploy básico) antes de qualquer ambição AAA avançada (viewport 3D/timeline). Todos os passos e decisões acima são derivados estritamente dos documentos da pasta de fonte de verdade.

