# Registro de Execução — 2026-07-03 (Rodada 1 de implementação real)

> Contexto: após a rodada anterior de análise/crítica dos 6 documentos `CLAUDE_*` +
> `AUDITORIA_V33_CRITICA_DOS_3_MDS.md`, o usuário pediu para começar a implementar de verdade
> ("pôr a mão na massa"), priorizando as tarefas reclassificadas de `Build` para `Wire`/`Harden`
> (maior valor, menor risco, infraestrutura já existente). Este documento registra exatamente o que
> foi mudado, verificado e descoberto nesta sessão, para que a próxima rodada não precise redescobrir
> nada e não alucine sobre o que já está pronto.

## Resumo executivo

1. **Ledger financeiro do marketplace: de simulação para dados reais.** Split corrigido de 70/30
   para 88/12 (conforme política documentada), tabela real de transações criada, fluxo de checkout
   Stripe Connect real implementado, webhook real ligado, chargebacks tratados.
2. **Cost guard: de `Map()` em memória para Redis real** (via infraestrutura já existente,
   `lib/redis-cache.ts`), sem quebrar nenhum chamador (confirmado: não havia nenhum chamador real —
   ver nota de escopo abaixo).
3. **Mock financeiro não catalogado removido**: `packages/engine/services/RedisLedgerClient.ts`
   (código morto, não usado em lugar nenhum, nome enganoso).
4. **Rate limiting adicionado** a 5 rotas de export (render-farm) e 3 rotas de marketplace
   (checkout, install, cart) que não tinham nenhuma proteção contra abuso.
5. **Mock visível removido do Outliner 3D** (`packages/ide-ui/Outliner3D.tsx`): parava de inventar
   uma cena fake ("Cube", "Sphere", "Directional Light") quando nenhum dado real era passado; agora
   mostra estado vazio honesto. PT-BR residual na UI também corrigido (regra do `.cursorrules`).
6. **Bug de import quebrado corrigido e verificado** em `CanvasViewportSurface.tsx` (crash ao vivo
   no "Canvas Mode" do viewport) — e, ao investigar esse bug isoladamente, foi descoberta a
   **descoberta mais crítica desta sessão**: ver item 7.
7. **🔴 P0 NOVO: `npm run build`/`npm run typecheck` falham hoje**, com 152 erros de módulo não
   encontrado, afetando literalmente toda página do app (`app/layout.tsx`). Causa raiz confirmada,
   nenhum arquivo está de fato perdido, padrão de correção provado e documentado em detalhe em
   `cloud-web-app/CLAUDE_MASTER_EXECUTION_PLAN_V8.md` (seção R1.1) e
   `docs/architecture/AUDITORIA_V33_CRITICA_DOS_3_MDS.md` (seção §0-T). **Isto deve ser a prioridade
   nº 1 da próxima rodada**, antes de qualquer feature nova — sem isso não há artefato implantável.

---

## 1. Ledger financeiro real do marketplace

### Arquivos criados
- `cloud-web-app/web/prisma/migrations/20260703000000_marketplace_sale_transactions/migration.sql`
  — tabela real `marketplace_sale_transactions`, seguindo a mesma convenção já usada para
  `marketplace_creator_payout_accounts` (SQL cru fora do schema Prisma, acessado via
  `$queryRaw`/`$executeRaw`). Colunas cobrem split criador/plataforma, IDs Stripe
  (checkout session, payment intent, transfer), status (`pending|cleared|disputed|refunded|failed`)
  e `escrow_release_at` (janela de 14 dias).
- `cloud-web-app/web/lib/marketplace/transactions.ts` — módulo de acesso a dados: `recordSaleTransaction`
  (idempotente por `stripe_checkout_session_id`), `listCreatorTransactions`, `computeCreatorBalances`
  (classifica pending/available comparando `escrowReleaseAt` a `now()`, correto mesmo sem nenhum job
  de background rodando), `markTransactionDisputed`, `releaseEligibleEscrow` (job opcional, não é
  necessário para a correção do saldo).
- `cloud-web-app/web/app/api/marketplace/checkout/route.ts` — cria uma Stripe Checkout Session real
  em `mode: 'payment'` com **destination charge** (`transfer_data.destination` = conta Connect do
  criador, `application_fee_amount` = corte da plataforma). Só permite compra se o criador já
  completou onboarding do Connect (`chargesEnabled`). Um item por sessão (limitação documentada no
  próprio arquivo — carrinho multi-criador precisaria de N sessões ou split multi-parte do Stripe).

### Arquivos reescritos
- `cloud-web-app/web/lib/marketplace/payouts.ts` — `calculateRevenueSplit` agora calcula 88/12
  (antes 70/30), arredondamento sempre a favor do criador. `getCreatorEarningsSummary` não fabrica
  mais até 5 transações falsas por item publicado a partir do contador de `downloads` — lê
  `marketplace_sale_transactions` de verdade. **Isso significa que criadores sem venda real agora
  veem R$0,00 corretamente, em vez de números inventados.** Não é regressão, é a correção do bug.
- `cloud-web-app/web/app/api/billing/webhook/route.ts` — novo branch em `checkout.session.completed`
  para `metadata.kind === 'marketplace_sale'` (grava a transação real, incrementa `downloads`, cria
  `InstalledExtension`); novo case `charge.dispute.created` que marca a transação como `disputed`
  (chargebacks nunca contam para o saldo do criador — ver `computeCreatorBalances`).

### O que NÃO foi mexido (decisão consciente)
`app/api/marketplace/creator/{revenue,sales/recent,stats}/route.ts` continuam usando a heurística
`price × downloads` — mas eles **já se auto-rotulam como estimativa** (`estimated: true`,
`metricsSource: 'estimated_from_price_x_downloads'`) para o frontend, o que é honesto (ao contrário
do que `payouts.ts` fazia antes). Ficou como próximo passo migrar esses três endpoints para consumir
`marketplace_sale_transactions` também, mas não é um mock escondido — é uma estimativa rotulada.

---

## 2. Cost guard → Redis real

`cloud-web-app/web/lib/observability/cost-guard.ts` reescrito para usar `lib/redis-cache.ts`
(`cache.get`/`cache.increment`/`cache.expire`), que já resolve Redis real via `ioredis` com fallback
transparente em memória — exatamente a infraestrutura que a auditoria já tinha identificado como
existente e não usada. Buckets chaveados por dia/minuto UTC (`cost-guard:user:<id>:2026-07-03`) para
reset natural de janela, gasto armazenado em micro-USD inteiros para `INCRBY` atômico.

**Nota de escopo importante**: busca full-repo confirmou que `costGuard` **não é chamado em nenhuma
rota hoje** — o caminho real de cobrança por request de IA é outro sistema, já maduro e já ligado
(`lib/credit-wallet.ts` + `lib/plan-limits.ts` + `lib/metering.ts`, visível em
`app/api/ai/chat/route.ts`). `cost-guard.ts` existe como um circuit-breaker de emergência
independente, documentado no próprio arquivo. Decidi **não** inserir `costGuard` numa rota
específica sem uma decisão de produto sobre onde ele deve entrar (evitar duplicar/conflitar com o
sistema de créditos já funcionando) — isso é uma decisão para a próxima rodada, não uma tarefa de
"conectar Redis".

---

## 3. Mock financeiro removido

`cloud-web-app/packages/engine/services/RedisLedgerClient.ts` — **deletado**. Confirmado via busca
que não era importado em nenhum lugar (nem em `packages/`, nem em `web/`). Nome sugeria uso de Redis
real; implementação real era um contador estático em memória com a escrita no Postgres comentada
(`// await prisma.user.update(...)`) — nunca persistia nada. Não fazia sentido "consertar" um
arquivo morto; a ação correta era remover.

---

## 4. Rate limiting

Novo módulo `cloud-web-app/web/lib/server/route-rate-limit.ts` (espelha `ai-core-rate-limit.ts`, usa
o mesmo limitador em memória já usado em todo o resto do código, `lib/rate-limit.ts`). Aplicado a:

- `app/api/exports/{glb,mp4,wav,usdz,project}/route.ts` — 10 req/min (enfileiram jobs no render
  farm, custo real de compute por chamada).
- `app/api/marketplace/checkout/route.ts` — 10 req/min (cria Stripe Checkout Session por chamada).
- `app/api/marketplace/install/route.ts` e `app/api/marketplace/cart/route.ts` (POST) — 30 req/min
  (escrita em DB, sem custo Stripe direto, mas ainda vetor de abuso).

---

## 5. Outliner 3D — mock visível removido

`cloud-web-app/packages/ide-ui/Outliner3D.tsx`: o parâmetro `nodes` tinha fallback `defaultNodes`,
uma cena fake hardcoded ("Cube", "Sphere", "Directional Light", "Camera"). Como
`CanvasViewportSurface.tsx` renderiza `<Outliner3D />` **sem passar `nodes`**, todo usuário no
"Canvas Mode" via essa cena fake independente do projeto real. Corrigido: default agora é `[]`,
com estado vazio honesto ("No objects in this scene yet."). Também corrigido PT-BR residual
("Add objeto" → "Add object", "objetos na cena" → "objects in scene"), que violava a regra do
`.cursorrules` de não misturar idiomas na UI.

**Limite reconhecido**: isso não liga o Outliner a um grafo de cena real — o "Canvas Mode" inteiro
(`CanvasViewportSurface.tsx`) não tem um hook de estado real ainda (seu centro, `NexusCanvasV2`, é um
placeholder estático). Ligar de verdade exigiria construir o equivalente de
`useSceneViewportSurfaceState` (já existe e funciona para o "Viewport 3D" normal, ver
`components/preview/SceneViewportSurface.tsx`) para o Canvas Mode — isso é escopo de feature nova,
não de "remover mock", e fica registrado aqui como próximo passo.

---

## 6-7. Bug de import quebrado + descoberta crítica do build quebrado

Ver `docs/architecture/AUDITORIA_V33_CRITICA_DOS_3_MDS.md` §0-T e
`cloud-web-app/CLAUDE_MASTER_EXECUTION_PLAN_V8.md` (seção R1.1) para o relato completo e detalhado.
Resumo: `npm run typecheck` roda **152 erros reais** hoje (verificado duas vezes nesta sessão,
antes/depois de uma correção pontual que reduziu de 156 para 152), `next.config.js` tem
`ignoreBuildErrors: false`, então `npm run build` falha do mesmo jeito. Causa: extração de código
para `packages/*` nunca atualizou ~50 especificadores de import em `web/` (`@/components/ide/*`,
`@/lib/runtime/*`, `@/lib/export/*`, `components/visual-scripting/*`, parte de `@/lib/engine/*`).
Nenhum arquivo está perdido — todos existem em `packages/`. Prova de conceito de correção executada
e validada em `CanvasViewportSurface.tsx` (3 imports + 1 dependência bare-specifier resolvida via
`npm install --no-save` escopado no pacote). Padrão repetível documentado para os ~140 erros
restantes. Não tentei a migração completa de `workspaces` porque **este ambiente não tem `git`
instalado**, e uma operação de `npm install` que reorganiza hoisting do monorepo inteiro precisa de
um jeito de reverter se der errado.

---

## Validação

- `npm run typecheck` rodado 2x nesta sessão (antes e depois da correção do `CanvasViewportSurface`)
  — **nenhum arquivo tocado nesta sessão introduziu um erro novo** (confirmado por busca textual
  direcionada na saída completa do typecheck por `marketplace|billing.webhook|cost-guard|
  route-rate-limit|payouts|transactions.ts|Outliner3D`, zero resultados exceto o já esperado/corrigido
  `lucide-react`). Os 152 erros remanescentes são 100% pré-existentes.
- `ReadLints` rodado em todos os arquivos editados/criados — zero erros de linter.
- Não foi possível rodar `npx prisma migrate deploy` nem os testes (`vitest run`) nesta sessão — não
  há Postgres/Redis rodando neste ambiente local (sem Docker Compose ativo verificado), então a
  migration SQL nova (`marketplace_sale_transactions`) está escrita e segue exatamente o padrão de
  uma migration já aplicada com sucesso no repositório, mas **não foi executada contra um banco
  real**. Rodar `npx prisma migrate deploy` (ou `db push` em dev) é o primeiro passo de verificação
  da próxima rodada antes de testar o fluxo de checkout end-to-end.

## Prioridades sugeridas para a próxima rodada (ordem)

1. **P0**: resolver os ~152 erros de typecheck (§0-T) — sem isso não há build implantável.
2. Rodar a migration nova e testar o fluxo de checkout do marketplace ponta a ponta com as chaves
   Stripe de teste (checkout → webhook → `marketplace_sale_transactions` → `/api/marketplace/creator/earnings`).
3. Decidir onde `costGuard` deve ser chamado (ou remover se de fato redundante com `credit-wallet.ts`).
4. Migrar `creator/{revenue,sales/recent,stats}` para dados reais da tabela de transações (remover a
   última estimativa `price × downloads`).
5. Construir o hook de estado real do "Canvas Mode" (`CanvasViewportSurface`) para então poder ligar
   o Outliner a dados de cena de verdade.
