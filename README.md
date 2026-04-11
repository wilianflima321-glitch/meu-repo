# Aethel Engine

Plataforma web para criação assistida por IA, com foco em Studio (`/dashboard`) e Workbench avançado (`/ide`).

## Estado Atual
- Monorepo ativo com frontend principal em `cloud-web-app/web`
- Contratos explícitos de capability/deprecation nas rotas e superfícies críticas
- Documentação canônica centralizada em `docs/master/`
- Política anti-fake-success aplicada como requisito de produto
- L4 continua bloqueado por evidência operacional e runtime local incompleto

## Fonte de Verdade
Leia nesta ordem:
1. `docs/master/00_INDEX.md`
2. `AETHEL_INTERFACE_BLUEPRINTS/00_INDEX.md`
3. `docs/master/71_AETHEL_E2E_AUDIT_2026-04-07.md`
4. `docs/master/72_UX_UI_BENCHMARK_TRIAGE_2026-04-08.md`
5. `docs/master/73_AUDIT_RECONCILIATION_2026-04-08.md`
6. `docs/master/DEPRECATED_INDEX.md`

## Estrutura Principal
- `cloud-web-app/web/`: app Next.js, APIs, design system e scripts de QA
- `AETHEL_INTERFACE_BLUEPRINTS/`: blueprints canônicos de produto e interface
- `docs/master/`: contratos canônicos de execução, auditoria e alinhamento
- `docs/archive/`: histórico documental não canônico
- `tools/`: scripts de QA, preflight e operação local

## Setup Local Mínimo
1. Instale dependências:

```bash
npm install
cd cloud-web-app/web
npm install
cd ../..
```

2. Crie o runtime local:

```bash
npm run setup:local-runtime
```

Isso agora sincroniza:
- `.env` na raiz para `docker compose`
- `cloud-web-app/web/.env.local` para a app web
- `DATABASE_URL` local apontando para `localhost:5432`
- segredos locais de `JWT_SECRET` e `CSRF_SECRET`

3. Edite `cloud-web-app/web/.env.local` e ajuste pelo menos:
- `JWT_SECRET`
- `CSRF_SECRET`
- um provider real como `OPENROUTER_API_KEY` ou use `AETHEL_AI_DEMO_MODE=true`
- opcionalmente o caminho canônico de preview gerenciado:
  - `AETHEL_PREVIEW_PROVIDER`
  - `AETHEL_PREVIEW_PROVISION_ENDPOINT`
  - `AETHEL_PREVIEW_PROVISION_TOKEN`
  - exemplo route-managed: `AETHEL_PREVIEW_PROVIDER=e2b`
  - exemplo browser-side-only: `AETHEL_PREVIEW_PROVIDER=webcontainers`
  - `webcontainers` ainda não suporta provisionamento via rota; hoje ele é alvo de wiring browser-side
- opcionalmente use os bootstraps canônicos de setup:
  - `npm run setup:preview-runtime`
  - `npm run setup:billing-runtime`

4. Suba a stack local:

```bash
npm run up:local-stack
cd cloud-web-app/web
npm run db:push
cd ../..
```

Ou use o caminho canônico único:

```bash
npm run setup:local-db
```

5. Rode o preflight:

```bash
npm run qa:production-runtime-readiness
```

6. Suba a app:

```bash
npm run dev
```

O preflight CLI agora também exige que a app responda em `AETHEL_BASE_URL` (padrão `http://localhost:3000`) antes de liberar o probe de produção.

## Bloqueadores Reais de L4
O runtime de prova operacional continua bloqueado se qualquer item abaixo falhar:
- `cloud-web-app/web/.env.local` ausente
- `DATABASE_URL` ausente ou sem reachability básica
- app local indisponível em `AETHEL_BASE_URL`
- `JWT_SECRET` ausente
- `CSRF_SECRET` ausente
- Docker daemon inativo para fluxos mais pesados

## Validação
No app web:

```bash
cd cloud-web-app/web
npm run lint
npm run typecheck
npm run build
npm run qa:interface-gate
npm run qa:canonical-components
npm run qa:route-contracts
npm run qa:no-fake-success
npm run qa:mojibake
npm run qa:enterprise-gate
```

No repo:

```bash
npm run qa:canonical-doc-alignment
npm run qa:production-runtime-readiness
npm run qa:billing-runtime-readiness
npm run qa:preview-runtime-readiness
npm run qa:operator-readiness
```

## Regras de Execução
- Sem fake success
- Sem inflar claims de maturidade
- `PARTIAL`, `BLOCKED` e `ACTIVE` devem refletir runtime real
- Claim de L4/L5 só com evidência operacional no repositório
