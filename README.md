# Aethel Engine

Plataforma web para criacao assistida por IA, com foco em Studio (`/dashboard`) e workbench avancado (`/ide`).

## Estado Atual
- Monorepo ativo com frontend principal em `cloud-web-app/web`
- Contratos explicitos de capability/deprecation em rotas criticas
- Documentacao canonica centralizada em `docs/master/`
- Qualidade tecnica forte, mas L4 continua bloqueado por evidencia operacional e runtime local incompleto

## Fonte de Verdade
Leia nesta ordem:
1. `docs/master/00_INDEX.md`
2. `docs/master/35_L4_L5_COMPLETION_MAP_2026-03-05.md`
3. `docs/master/36_QUALITY_90_EXECUTION_MAP_2026-03-08.md`
4. `docs/master/DUPLICATIONS_AND_CONFLICTS.md`

## Estrutura Principal
- `cloud-web-app/web/`: app Next.js, APIs e scripts de QA
- `docs/master/`: contratos canonicos de execucao
- `docs/archive/`: historico documental nao-canonico
- `tools/`: scripts de QA, preflight e operacao local

## Setup Local Minimo
1. Instale dependencias:

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
- opcionalmente o caminho canonico de preview gerenciado:
  - `AETHEL_PREVIEW_PROVIDER`
  - `AETHEL_PREVIEW_PROVISION_ENDPOINT`
  - `AETHEL_PREVIEW_PROVISION_TOKEN`
  - exemplo route-managed: `AETHEL_PREVIEW_PROVIDER=e2b`
  - exemplo browser-side-only: `AETHEL_PREVIEW_PROVIDER=webcontainers`
  - `webcontainers` ainda nao suporta provisionamento via rota; hoje ele e alvo de wiring browser-side
- opcionalmente use os bootstraps canonicos de setup:
  - `npm run setup:preview-runtime`
  - `npm run setup:billing-runtime`

4. Suba a stack local:

```bash
npm run up:local-stack
cd cloud-web-app/web
npm run db:push
cd ../..
```

Ou use o caminho canonico unico:

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

O preflight CLI agora tambem exige que a app responda em `AETHEL_BASE_URL` (padrao `http://localhost:3000`) antes de liberar o probe de producao.

## Bloqueadores Reais de L4
O runtime de prova operacional continua bloqueado se qualquer item abaixo falhar:
- `cloud-web-app/web/.env.local` ausente
- `DATABASE_URL` ausente ou sem reachability basica
- app local indisponivel em `AETHEL_BASE_URL`
- `JWT_SECRET` ausente
- `CSRF_SECRET` ausente
- Docker daemon inativo para fluxos mais pesados

## Validacao
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

## Regras de Execucao
- Sem fake success
- Sem inflar claims de maturidade
- `PARTIAL`, `BLOCKED` e `ACTIVE` devem refletir runtime real
- Claim de L4/L5 so com evidencia operacional no repositorio
