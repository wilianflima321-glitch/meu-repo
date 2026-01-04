# Portal Web (rosto da plataforma)

Este documento separa claramente:

- **Portal Web**: entrada oficial e "rosto" da plataforma (login, conta, billing, uso, administração, downloads etc.).
- **IDE**: produto de edição/execução (editor, terminal, chat contextual etc.).

> Meta: o usuário entra pelo Portal Web e, a partir dele, acessa a IDE e o ecossistema (marketplace, projetos, billing, times).

---

## O que o Portal Web vai ter (escopo)

### Público (sem login)
- **Home (/)**: landing simples com CTA (Entrar / Criar conta) e links legais.
- **Login (/login)**.
- **Cadastro (/register)**.
- **Termos (/terms)**.
- **Health (/health)** para checagem rápida das rotas principais.

### Autenticado (após login)
- **Dashboard (/dashboard)**: ponto central (projetos, status, atalhos para IDE).
- **Chat (/chat)**: chat com trace e “ver detalhes” (quando aplicável).
- **Projetos (/explorer, /project-settings, /search, /git)**: navegação e operações de workspace.
- **Terminal (/terminal)**.
- **Billing (/billing)**: planos, wallet, purchase intent.
- **Downloads (/download)**: acesso a builds desktop.
- **Marketplace (/marketplace)**: extensões/conteúdo.
- **Admin (/admin)**: painéis internos (somente roles admin).

### APIs (server-side, com enforcement)
- `/api/auth/*`: login/register/profile.
- `/api/usage/status`, `/api/quotas`: uso, limites e caps.
- `/api/billing/*`, `/api/wallet/*`: pagamento e saldo.
- `/api/projects`, `/api/workspace/*`, `/api/terminal/*`: operações do produto.

---

## O que falta para o Portal virar “entrada profissional” (checklist)

### Autenticação & conta
- **Reset de senha** (request + confirm).
- **Verificação de email** (evita abuso e melhora deliverability).
- **SSO** (Google/Microsoft/GitHub) — opcional, mas esperado em ambiente profissional.
- **Página de perfil/conta** (dados, segurança, sessões ativas).

### Navegação e experiência
- **Definir IA/IDE como destino pós-login**: ex. botão “Abrir IDE” com rota única.
- **Separar claramente Portal vs IDE no menu** (não misturar “editor” com “billing/admin”).
- **Erros amigáveis** (401/403/404) e estados vazios.

### Organização (times, RBAC)
- **Org/Team**: convites, membros, papéis.
- **RBAC consistente** no token e nas rotas (admin, billing-manager etc.).
- **Auditoria** (eventos: login, billing, alterações críticas).

### Billing (robusto)
- **Página de planos** com upgrade/downgrade.
- **Estado de trial** e expiração clara.
- **Bloqueios por inadimplência / quota** com UX de recuperação.

### Observabilidade/Operação
- **Status page interna** (serviços, filas, provedores LLM).
- **Logs/telemetria** correlacionados por `traceId` e `requestId`.

---

## Portas / entrypoints locais (dev)

- **Portal Web (Next.js)**: porta **3001**
  - `npm run portal:dev`
- **IDE (protótipo atual / browser-ide-app)**: porta **3000**
  - `npm run ide`

> O objetivo é o Portal ser o entrypoint público e a IDE ser acessada a partir dele.
