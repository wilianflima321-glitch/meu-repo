# Aethel Engine

Plataforma web para criação assistida por IA, com foco em fluxo Studio (`dashboard`) e workbench avançado (`/ide`).

## Estado Atual (Factual)
- Monorepo ativo com frontend principal em `cloud-web-app/web`.
- Contratos de capability/deprecação explícitos em rotas críticas (`NOT_IMPLEMENTED`, `DEPRECATED_ROUTE`).
- Qualidade visual crítica rastreada em `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`.
- Documentação canônica centralizada em `docs/master/`.

## Fonte de Verdade
Leia sempre nesta ordem:
1. `docs/master/00_INDEX.md`
2. `docs/master/00_FONTE_CANONICA.md`
3. `docs/master/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`
4. `docs/master/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
5. `docs/master/14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md`

## Estrutura Principal
- `cloud-web-app/web/`: app Next.js (UI, APIs e scripts de QA).
- `docs/master/`: contratos canônicos de execução.
- `docs/archive/`: histórico documental (não-canônico).

## Execução Local
```bash
cd cloud-web-app/web
npm install
npm run dev
```

## Quality Gates (quando for validar)
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

## Regras de Execução
- Sem fake success.
- Sem mudança de escopo de negócio nesta fase.
- Claims de maturidade só com evidência operacional no repositório.
