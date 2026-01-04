# Handoff para outra IA (mapa completo) — Aethel Engine

Data: 2026-01-01

Objetivo deste documento: permitir que outra IA (ou dev) continue **sem contexto prévio**. Ele mapeia **o que é Portal**, **o que é IDE**, **o que é Desktop**, onde estão os **pontos de verdade**, e o que falta (checklist).  
Filosofia do repo: **real-or-fail** — quando não existe, retorna erro explícito (ex.: `501 NOT_IMPLEMENTED`, `503 *_NOT_CONFIGURED`).

---

## 0) TL;DR (como subir tudo local)

### Portal Web (rosto/entrada)
- Pasta: `cloud-web-app/web`
- Porta: **3001**
- Rodar:
  - `npm run portal:dev`

### IDE (protótipo atual / browser-ide-app)
- Pasta: `examples/browser-ide-app`
- Porta padrão: **3000** (env `PORT`)
- Rodar:
  - `npm run ide`
- Health:
  - `GET http://127.0.0.1:3000/api/health`

### Desktop (Electron)
- Pasta: `cloud-ide-desktop/desktop-app`
- Rodar:
  - `npm run desktop:dev`
- Comportamento: sobe o servidor do IDE e abre uma janela apontando para `http://127.0.0.1:<porta>`.

---

## 1) Arquitetura do produto (separação obrigatória)

### 1.1 Portal Web (Next.js) = “rosto” da plataforma
Responsável por:
- Landing, login/cadastro, conta, billing, quotas/uso, admin, downloads.
- Autenticação e enforcement (JWT + rate limit + RBAC via middleware).

NÃO é a IDE.

### 1.2 IDE = produto separado
Hoje há 2 “camadas” no repo:
1) **IDE protótipo** (ativa e rodável): `examples/browser-ide-app` (Express + WS + HTML/Monaco).  
2) **IDE real desejada** (Theia fork): `cloud-ide-desktop/aethel_theia_fork` (pacotes `@theia/*` + `ai-*`).

O protótipo existe para validar o core e fluxos de IA; o alvo final é **Theia como fonte de verdade** (web + desktop).

### 1.3 Desktop
O desktop atual é um **shell Electron** que abre o mesmo servidor da IDE protótipo.

---

## 2) Mapa de scripts (ponto de partida para CI/dev)

Arquivo: `package.json` (raiz)
- `npm run portal:dev` → Next em `cloud-web-app/web` (porta 3001)
- `npm run ide` → server do protótipo em `examples/browser-ide-app` (porta 3000)
- `npm run desktop:dev` → Electron em `cloud-ide-desktop/desktop-app`
- `npm run ci:local` / `npm run check:syntax` → validação e testes

Observação: o `package.json` raiz mudou recentemente (confirmado em 2026-01-01). Sempre revalidar scripts antes de automatizar.

---

## 3) Portal Web (Next.js) — mapa por arquivo

### 3.1 Entrada pública
- `cloud-web-app/web/app/page.tsx`
  - Landing pública (CTA Entrar / Criar conta)
  - Se cookie `token` existe → `redirect('/dashboard')`

- `cloud-web-app/web/app/register/page.tsx`
  - UI de cadastro chamando `AuthContext.register()`

### 3.2 Auth (client)
- `cloud-web-app/web/contexts/AuthContext.tsx`
  - Fonte client-side de sessão.
  - Carrega token de `localStorage` (`aethel-token`).
  - No bootstrap: chama `apiClient.getProfile()`; se falhar limpa token.

- `cloud-web-app/web/lib/api-client.ts`
  - Client HTTP do browser chamando **somente** `/api/*` do Next.
  - Suporta `login`, `register`, `getProfile`, e APIs de projetos/arquivos etc.

### 3.3 Auth (server)
- `cloud-web-app/web/app/api/auth/login/route.ts`
  - Valida credenciais e gera JWT
  - Grava `session` no Prisma
  - Seta cookie `token` (httpOnly)

- `cloud-web-app/web/app/api/auth/register/route.ts`
  - Cria usuário em `starter_trial`
  - Gera JWT + cria session + cookie `token`

- `cloud-web-app/web/app/api/auth/profile/route.ts`
  - `requireAuth(req)`
  - Retorna `{id,email,name,plan,role?}`

### 3.4 Middleware (enforcement)
- `cloud-web-app/web/middleware.ts`
  - Headers de segurança
  - Rate limit via Upstash (em `production` sem Upstash → 503 em `/api/*`)
  - RBAC para `/admin` e `/api/admin`
  - CSRF simples: bloqueia métodos mutáveis em API quando cookie-only e `origin` inválida

**Checklist de melhorias (Portal) — por prioridade**
1) Fluxo profissional de conta: reset senha, verify email
2) SSO (Google/Microsoft/GitHub)
3) Página de conta/sessões + revogar sessões
4) Org/Teams + RBAC por roles (admin/billing-manager/etc.)
5) Auditoria (eventos) e observabilidade (requestId/traceId)
6) Botão “Abrir IDE” (integração Portal → IDE) com SSO/handshake

---

## 4) IDE protótipo (Express + WS + HTML/Monaco) — mapa por arquivo

### 4.1 Servidor
- `examples/browser-ide-app/server.js`
  - Carrega `.env` do repo (se existir)
  - Registra `ts-node` e executa `server.ts`

- `examples/browser-ide-app/server.ts`
  - Express + CORS + JSON
  - `express.static(rootDir)` servindo arquivos do diretório
  - Endpoints observados:
    - `GET /api/health` (readiness + status do orchestrator)
    - `GET /api/status` (orchestrator status)
    - `POST /api/tasks/execute` e `GET /api/tasks/:id` (tasks do orchestrator)
    - (o arquivo é grande; há também agentes e WS em outras seções)
  - Integrações core:
    - `LLMRouter` (`src/common/llm/llm-router.ts`) → budgets/custos/fallback
    - `createSupremeOrchestrator` (`src/common/supreme-ai` / `src/common/supreme-orchestrator`)

### 4.2 UI (Monaco)
- `examples/browser-ide-app/monaco-editor.html`
  - Monaco via CDN
  - Chat dock na direita
  - Chama `POST /api/agent/coder` com prompt + contexto (seleção ou arquivo inteiro)

⚠️ Ponto importante: o `runCode()` no fim do arquivo parece conter **trechos “quebrados”/sobrando** (código colado no meio da função, com `headers:` fora de contexto e `alert/confirm`). Isso pode gerar erros JS em runtime. Corrigir isso é uma tarefa rápida e de alto impacto.

### 4.3 Outros HTMLs do protótipo
Há várias páginas “tooling/IDE” que dependem do mesmo servidor e scripts:
- `examples/browser-ide-app/index.html` (hub/entrada do protótipo)
- `examples/browser-ide-app/asset-manager.html`, `project-manager.html`, `visual-scripting.html`, etc.

---

## 5) Desktop (Electron) — mapa por arquivo

- `cloud-ide-desktop/desktop-app/src/main.cjs`
  - Determina repo root
  - Encontra porta livre (preferida: 3000; fallback até 3020)
  - Sobe o IDE server chamando `node <repo>/examples/browser-ide-app/server.js`
  - Aguarda `GET /api/health` ficar OK
  - Abre janela Electron com `loadURL(baseUrl)`

---

## 6) Core de IA / custos / multi-agente (engine)

### 6.1 Router / custos / planos (fonte de verdade)
- `src/common/llm/llm-router.ts`
  - Define `PlanType` e `PLAN_BUDGETS`
  - Decide modelo/provedor com base em custo/latência/qualidade
  - Mantém budget por workspace e bloqueia quando esgota
  - Implementa fallback e circuit breaker

### 6.2 Orquestrador (multi-sistemas)
- `src/common/supreme-orchestrator/index.ts`
  - Integra sistemas (web automation, missions, deploy, learning, trading)
  - Tem backpressure (fila), e gating para trading HFT (`AETHEL_ENABLE_HFT=1`)

- `src/common/supreme-ai/index.ts`
  - Reexport central
  - `createSupremeAI()` cria o orchestrator
  - `checkSystemReadiness()` valida disponibilidade

---

## 7) Integração Portal → IDE (o que falta e como fazer)

Meta UX: usuário entra no Portal (3001), e com 1 clique abre a IDE.

Opções de implementação (escolher 1):
1) **Serviços separados** (recomendado no curto prazo):
   - Portal em 3001
   - IDE em 3000
   - Portal mostra botão “Abrir IDE” (abrindo nova aba)
   - SSO/handshake via token assinado de curta duração

2) **Mesmo domínio via proxy** (para produção):
   - Portal expõe `/ide/*` e faz proxy para o serviço IDE
   - Requer cuidado com cookies, CSRF e WebSocket

Checklist técnico mínimo para SSO/handshake:
- Portal cria endpoint: `POST /api/ide/session` → retorna `oneTimeToken`
- IDE valida `oneTimeToken` em endpoint próprio e cria sessão do IDE
- `oneTimeToken` expira em ~30-120s, uso único, auditável

---

## 8) Prioridades recomendadas (para outra IA executar)

### P0 (alto impacto, rápido)
1) Corrigir JS quebrado no `monaco-editor.html` (função `runCode`/resíduos)
2) Adicionar no Portal um CTA pós-login “Abrir IDE” (mesmo sem SSO) apontando para `http://127.0.0.1:3000/` (dev)

### P1 (produto profissional)
3) Reset de senha + verify email
4) Página de conta/sessões
5) Melhorias de UX para estados de quota/billing

### P2 (produto final)
6) Começar migração da IDE protótipo → Theia fork como fonte de verdade (web + desktop)
7) Integrar chat/IA dentro do Theia (widget/extension), chamando o mesmo backend/rotas

---

## 9) Comandos úteis (sanidade)

- Portal:
  - `npm run portal:dev`

- IDE:
  - `npm run ide`
  - `curl http://127.0.0.1:3000/api/health`

- Desktop:
  - `npm run desktop:dev`

---

## 10) Observações de risco / pontos de atenção

- Não misturar responsabilidades: Portal é “rosto/billing/admin”; IDE é “editor + execução + chat contextual”.
- `middleware.ts` é crítico: rate limit em produção sem Upstash retorna 503 para `/api` (intencional).
- O protótipo da IDE usa Monaco via CDN; para produção, a direção é Theia/Monaco empacotado.

---

## 11) Onde continuar lendo (docs já existentes)

- `docs/PORTAL_WEB_PLATAFORMA.md` — escopo do Portal e checklist (entrada profissional)
- `src/common/SUPREME_AI_COMPLETE.md` e `src/common/SUPREME_AI_SYSTEM_ANALYSIS.md`
- `examples/browser-ide-app/FLUXO_IA_COMPLETO.md` e docs internos do protótipo

---

## 12) Alinhamento com `docs/ide-gap-analysis.md` (gaps → tarefas → onde mexer)

O `docs/ide-gap-analysis.md` lista gaps para uma IDE **profissional** (paridade VS Code/JetBrains).  
Ponto-chave: a forma mais rápida e sustentável de fechar os gaps críticos é **promover o Theia fork (`cloud-ide-desktop/aethel_theia_fork`) para “IDE de verdade”** e parar de depender do protótipo HTML/Monaco como produto final.

### 12.1 Gaps críticos (P0 / showstoppers)

#### A) LSP (inteligência de linguagem)
**Gap**: LSP está parcial/inexistente no protótipo → sem completion/definição/diagnostics/refactors.

**Onde fazer**:
- IDE real: `cloud-ide-desktop/aethel_theia_fork/packages/monaco/`, `packages/editor/`, `packages/markers/`, `packages/languages/` (se existir), `packages/workspace/`.
- Backend/engine de IA não resolve LSP (IA complementa; LSP é base).

**Tarefas mínimas**:
1) Garantir que a distribuição Theia está rodando como “produto principal” (web/desktop).
2) Definir e instalar language servers por linguagem (ex.: TS/JS, Python, Go, Rust, Java, C#/C++).
3) Wiring de diagnostics → UI (Problems/Markers) e navegação (Go to Definition/References/Rename).

#### B) DAP (debugger)
**Gap**: 0% no protótipo → sem breakpoints/step/vars/console.

**Onde fazer**:
- IDE real: `cloud-ide-desktop/aethel_theia_fork/packages/debug/` e UI correlata.
- Preferência: usar compatibilidade VS Code via `packages/plugin-ext-vscode/` (quando aplicável) para debuggers prontos.

**Tarefas mínimas**:
1) Habilitar o UI/serviços de debug.
2) Integrar ao menos 1 debugger “primeiro” (Node.js) e depois Python.
3) Garantir persistência de configs (`launch.json`) e estado de breakpoints.

#### C) Sistema de extensões / marketplace
**Gap**: 0% no protótipo → sem extensibilidade, sem ecossistema.

**Onde fazer**:
- IDE real: `cloud-ide-desktop/aethel_theia_fork/packages/plugin/`, `packages/plugin-ext/`, `packages/plugin-ext-vscode/`, `packages/vsx-registry/`.

**Tarefas mínimas**:
1) Habilitar carregamento/gerenciamento de extensões.
2) Definir estratégia de marketplace: Open VSX local/hosted ou registro próprio.
3) Garantir sandboxing/permissões (mínimo: whitelists e políticas internas).

#### D) Infra de testes (Test Explorer)
**Gap**: 0% no protótipo → sem discovery/exec/coverage.

**Onde fazer**:
- IDE real: `cloud-ide-desktop/aethel_theia_fork/packages/test/`, `packages/task/`, `packages/terminal/`.
- Alternativa rápida: suportar via extensões VS Code (quando plugin-ext-vscode estiver ok).

**Tarefas mínimas**:
1) Descoberta de testes (Jest primeiro, depois Pytest/Go).
2) Execução (terminal/task runner) + parsing de output.
3) Coverage (mínimo: exibir link/artefato; ideal: gutters no editor).

#### E) Task automation (detecção + problem matchers)
**Gap**: 25% → falta autodetect e parsing.

**Onde fazer**:
- IDE real: `cloud-ide-desktop/aethel_theia_fork/packages/task/`, `packages/terminal/`, `packages/problem/` (ou equivalente), `packages/markers/`.

**Tarefas mínimas**:
1) Suporte real a `tasks.json`.
2) Auto-detecção (Node, Python, etc.) e templates básicos.
3) Problem matchers para popular Problems view.

### 12.2 Gaps importantes (P1)

#### SCM (Git) completo
**Gap**: merge conflict UI e fluxos avançados.

**Onde fazer**:
- IDE real: `cloud-ide-desktop/aethel_theia_fork/packages/git/`, `packages/scm/`, `packages/scm-extra/`, `packages/diff/` (se existir), `packages/editor/`.

**Tarefas**:
1) Merge conflict resolution UI (mínimo funcional).
2) History/blame/stash (pode vir por extensão).

#### Terminal persistente
**Gap**: persistência de sessão, profiles.

**Onde fazer**:
- IDE real: `cloud-ide-desktop/aethel_theia_fork/packages/terminal/` e `packages/external-terminal/`.

### 12.3 Gaps “polish” (P2)

#### Core editing (sticky scroll, breadcrumbs avançado, multi-file search, diff editor)
**Onde fazer**:
- IDE real: `cloud-ide-desktop/aethel_theia_fork/packages/editor/`, `packages/file-search/`, `packages/search-in-workspace/`, `packages/navigator/`, `packages/outline-view/`.

#### Remote development / colaboração
**Onde fazer**:
- IDE real: `cloud-ide-desktop/aethel_theia_fork/packages/remote/`, `packages/remote-wsl/`, `packages/collaboration/`.

### 12.4 Repriorização prática (alinhada ao Gap Analysis)

O backlog recomendado para virar “IDE profissional” fica assim:
- **P0 (profissional / showstoppers)**: tornar Theia fork a IDE principal + habilitar LSP + DAP + extensões + tasks/test explorer.
- **P1**: SCM completo + terminal persistente.
- **P2**: polish de editor + remote/collab.

> Nota: o protótipo `examples/browser-ide-app` continua útil para validar IA/fluxos rapidamente, mas ele não fecha os gaps de IDE profissional sozinho.
