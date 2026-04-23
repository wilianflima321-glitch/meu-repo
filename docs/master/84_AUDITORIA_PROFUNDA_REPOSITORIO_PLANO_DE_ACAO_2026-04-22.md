# 84_AUDITORIA_PROFUNDA_REPOSITORIO_PLANO_DE_ACAO_2026-04-22
Date: 2026-04-22
Status: ACTIVE (PRIMARY COMPLEMENTARY AUDIT â€” REPO + CI/CD + EXECUTION)
Source: imported from `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/auditoria-profunda-repositorio-plano-de-acao-2026-04-22.pdf`
Synced branch baseline: `genspark_ai_developer@632775aa4`

## Papel no Conjunto CanÃ´nico
Este documento entra como a terceira auditoria principal complementar do ciclo atual.
Ele **nÃ£o substitui** os outros documentos â€” ele fecha um Ã¢ngulo que as demais auditorias tratavam sÃ³ parcialmente: limpeza real do monorepo, discrepÃ¢ncia entre polÃ­tica e CI aplicado, e custo operacional escondido no root / docs / pipelines.

Usar sempre o conjunto abaixo, nesta funÃ§Ã£o:

1. `docs/master/82_AUDITORIA_V5_AETHEL_ENGINE_DEEP_2026-04-19.md`
   - rumo principal, benchmark, produto e barra de qualidade
2. `docs/master/83_AUDITORIA_PROFUNDA_SISTEMAS_INTERFACES_GITHUB_2026-04-22.md`
   - profundidade em shell, superfÃ­cies, UX e interfaces
3. `docs/master/84_AUDITORIA_PROFUNDA_REPOSITORIO_PLANO_DE_ACAO_2026-04-22.md`
   - profundidade em monorepo, CI/CD, root hygiene, policy-vs-reality e custo estrutural
4. `docs/master/81_VALIDATED_PRIORITY_BACKLOG_2026-04-20.md`
   - guardrail factual anti-fake-success para nÃºmeros, claims e priorizaÃ§Ã£o executiva

## EvidÃªncia Fonte Preservada
- PDF original preservado em:
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/auditoria-profunda-repositorio-plano-de-acao-2026-04-22.pdf`
- A auditoria nÃ£o expÃ´s imagens embutidas extraÃ­veis como assets isolados.
- Para preservar o contexto visual, renderizamos pÃ¡ginas-chave do PDF em:
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/page-01.png`
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/page-02.png`
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/page-03.png`
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/page-04.png`
  - `docs/master/assets/auditoria-repositorio-plano-acao-2026-04-22/page-05.png`

## PrÃ©via Visual do Documento-Fonte
| PÃ¡gina | Preview |
|---|---|
| Capa | ![PÃ¡gina 1](assets/auditoria-repositorio-plano-acao-2026-04-22/page-01.png) |
| SumÃ¡rio e score recalibrado | ![PÃ¡gina 2](assets/auditoria-repositorio-plano-acao-2026-04-22/page-02.png) |
| Root orphan files | ![PÃ¡gina 3](assets/auditoria-repositorio-plano-acao-2026-04-22/page-03.png) |
| `docs/archive` e overload documental | ![PÃ¡gina 4](assets/auditoria-repositorio-plano-acao-2026-04-22/page-04.png) |
| CI/CD policy-vs-reality | ![PÃ¡gina 5](assets/auditoria-repositorio-plano-acao-2026-04-22/page-05.png) |

## O Que Esta Auditoria Acrescenta de Verdade
Ela reforÃ§a e explicita pontos que as auditorias `82` e `83` jÃ¡ tangenciavam, mas sem o mesmo foco operacional:

- o root do monorepo ainda comunica ruÃ­do e ambiguidade para quem chega novo
- existe descompasso entre polÃ­tica de qualidade declarada e o que o CI realmente exige em PRs
- hÃ¡ custo arqueolÃ³gico em `docs/archive/` e excesso de documentos ativos em `docs/master/`
- vÃ¡rios problemas de qualidade nÃ£o sÃ£o sÃ³ â€œde interfaceâ€; sÃ£o problemas de **governanÃ§a do repositÃ³rio**
- parte do dÃ©bito do Aethel nÃ£o estÃ¡ no que falta construir, e sim no que falta **desligar, consolidar ou tornar inequÃ­voco**

## Snapshot Reconciliado do Estado Atual
Este documento nÃ£o reaproveita cegamente os nÃºmeros do PDF. Abaixo estÃ¡ a leitura reconciliada com o branch atual `632775aa4`.

- tracked repo files: `5487`
- tracked repo size: `~60.14 MB`
- `docs/master` files: `106`
- `cloud-web-app/web/app/**/page.tsx`: `80`
- `cloud-web-app/web/app/api/**/route.ts`: `320`
- `cloud-web-app/web/app/admin/**/page.tsx`: `46`
- `cloud-web-app/web/components/**/*.tsx`: `311`
- `cloud-web-app/web/lib/**/*.ts`: `345`
- tracked test files (real `*.test.*` / `*.spec.*`, excluding snapshot assets): `45`
- current branch is typechecking green again after compatibility repairs

## Claims da Nova Auditoria Que Continuam Fortes
### 1. Root hygiene ainda Ã© um problema real
A crÃ­tica continua vÃ¡lida.
Hoje o root ainda contÃ©m arquivos que confundem o papel do monorepo e aumentam carga cognitiva:

- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\physics.js`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\physics_adv.test.js`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\physics_performance.test.js`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\server.js`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\proxy-shim.js`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\workbench-preview.html`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\visual-regression.spec.ts`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\soft-warn.spec.ts`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\soft-warn-e2e.spec.ts`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\executor.spec.ts`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\accessibility.spec.ts`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\integration-test.spec.ts`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\playwright.legacy.config.js`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\playwright.config.ts`

DireÃ§Ã£o correta: consolidar root e tornar claro o que Ã© runtime, o que Ã© tooling e o que Ã© legado.
Melhora jÃ¡ aplicada: a ambiguidade entre duas configs com o mesmo papel foi resolvida; agora existe uma config canÃ´nica e uma config legada explicitamente nomeada.

### 2. O overload documental Ã© real
A crÃ­tica continua vÃ¡lida, mesmo depois da hierarquia `81/82/83`.

- `docs/master` ainda estÃ¡ em `105` arquivos
- `docs/archive` ainda pesa cerca de `17.7 MB`
- a existÃªncia de muitas auditorias fortes exige hierarquia explÃ­cita para nÃ£o virar drift narrativo

ConclusÃ£o: a soluÃ§Ã£o nÃ£o Ã© apagar docs Ãºteis Ã s cegas; Ã© manter **poucos documentos com papel nÃ­tido** e o resto como histÃ³rico/referÃªncia.

### 3. O gap entre polÃ­tica declarada e enforcement em CI melhorou materialmente
A nova auditoria acertou num ponto estrutural importante, e esse ponto jÃ¡ foi parcialmente resolvido no branch atual:

- `qa:enterprise-gate` continua existindo em `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\package.json`
- a policy continua mencionando esse gate em `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\.github\BRANCH_PROTECTION_POLICY.md`
- agora o `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\.github\workflows\ci.yml` executa esse agregador diretamente
- o agregador passou a incluir `qa:billing-runtime-readiness`, `qa:preview-runtime-readiness`, `lint` e `typecheck`

ConclusÃ£o honesta: esse bloco deixou de ser um mismatch central de polÃ­tica-vs-CI. O que sobra aqui Ã© principalmente o fato de que o **merge-pressure E2E padrÃ£o agora existe, mas o full matrix ainda nÃ£o Ã© obrigatÃ³rio**, alÃ©m da qualidade estrutural contÃ­nua do root.

### 4. E2E deixou de ser totalmente opcional, mas ainda nao chegou ao full-matrix required
Esse ponto mudou no branch atual:

- o workflow principal agora roda um job canÃ´nico `Web App - Merge Pressure E2E`
- esse job executa `npm run test:e2e:merge`
- a suite usa um arquivo dedicado `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\tests\e2e\merge-pressure.spec.ts`
- a suite usa uma config dedicada `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\playwright.merge.config.ts`
- a mesma suite ja foi validada localmente em navegador real com resultado atual de `5 passed`
- a pressÃ£o padrÃ£o de PR agora cobre:
  - landing e CTAs pÃºblicos
  - contact-sales via backend submit
  - entry/login surface
  - redirects de superfÃ­cies protegidas
  - health/metrics da runtime API
- o job `Playwright E2E (full matrix, manual)` continua existindo
- ele segue condicionado por `github.event.inputs.run_e2e == 'true'`

Leitura correta agora:
- E2E jÃ¡ faz parte da pressÃ£o padrÃ£o de merge
- o que ainda **nÃ£o** Ã© pressÃ£o padrÃ£o de merge Ã© o full matrix completo do Playwright
- a browser lane esta comprovada localmente; o que ainda nao esta comprovado e a paridade de build de producao, porque a tentativa local mais recente de `next build` falhou em varias rotas com erros de prerender/runtime

### 5. `noImplicitAny: false` continua um risco concreto
Isso segue vÃ¡lido e alinhado com `81`.

- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\tsconfig.json` ainda mantÃ©m `"noImplicitAny": false`

### 6. Giant files continuam problema, mesmo com progresso
A auditoria acerta na categoria, mas jÃ¡ nasceu parcialmente defasada nos nÃºmeros.

O que continua verdadeiro:
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\FullscreenIDE.tsx` ainda Ã© grande demais
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\AIChatPanelPro.tsx` ainda Ã© grande demais
- ainda hÃ¡ outros arquivos grandes no ecossistema engine/editor

## Claims da Nova Auditoria Que Precisam de CorreÃ§Ã£o ou Rebaixe
### 1. Snapshot bruto de tamanho/contagem
O PDF fala em `5440 arquivos` e `84 MB`.
Isso nÃ£o deve mais ser tratado como estado atual do branch.

Hoje, depois do alinhamento documental, extraÃ§Ãµes, assets e reparos:
- tracked repo files: `5480`
- tracked repo size: `~60.14 MB`

Leitura correta:
- a crÃ­tica ao repositÃ³rio antigo inflado continua Ãºtil
- mas o snapshot literal do PDF jÃ¡ nÃ£o Ã© a fotografia atual

### 2. â€œ14 testesâ€ estÃ¡ desatualizado
O PDF tratou a suÃ­te como quase inexistente.
Direcionalmente a crÃ­tica continua vÃ¡lida, mas o nÃºmero literal jÃ¡ nÃ£o representa o estado atual.

Hoje o repositÃ³rio rastreado contÃ©m `45` arquivos reais `*.test.*` / `*.spec.*`.

Leitura correta:
- pressÃ£o de teste ainda Ã© insuficiente para o tamanho do produto
- mas nÃ£o estamos mais no mesmo estado de base usado pelo PDF

### 3. `AIChatPanelPro.tsx` e `FullscreenIDE.tsx` ja melhoraram bastante desde o snapshot
O PDF ainda carrega a leitura de monolitos maiores do que o estado atual do branch.

Estado atual reconciliado:
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\AIChatPanelPro.tsx`: `~549` linhas
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\FullscreenIDE.tsx`: `~788` linhas

Extracoes reais ja ativas:
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ai-chat\useChatContextPreviews.ts`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ai-chat\AIChatHeader.tsx`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ai-chat\AIChatMessagesPane.tsx`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ai-chat\AIChatActivityDeck.tsx`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ai-chat\AIChatComposer.tsx`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ai-chat\AIChatOpsSidebar.tsx`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ai-chat\presets.ts`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\fullscreen\useWorkbenchFullAccess.ts`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\fullscreen\useWorkbenchChrome.ts`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\fullscreen\useWorkbenchFiles.ts`

Leitura correta agora:
- os dois maiores gargalos estruturais continuam importantes
- mas ja nao descrevemos mais um workbench parado em monolitos de 900-1800 linhas
- os proximos grandes candidatos, depois desse corte, sao:
  - `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\ModernIDEShell.tsx`
  - `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\terminal\XTerminal.tsx`

### 4. Sentry "instalada mas inerte" ja nao descreve o branch atual
Essa critica ficou parcialmente velha.

Hoje ja existe init explicito em:
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\app\layout.tsx`
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\lib\sentry.ts`

Leitura correta:
- Sentry esta ligada
- observabilidade ainda nao esta madura
- mas "instalada e morta" ja nao e descricao justa do estado atual

### 5. `images.unoptimized: true` jÃ¡ foi corrigido
O PDF marca isso como blocker.
Essa crÃ­tica tambÃ©m estÃ¡ superada.

O `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\next.config.js` jÃ¡ nÃ£o usa mais `unoptimized: true`; o arquivo inclusive documenta essa remoÃ§Ã£o.

## Alinhamento Final Entre 81, 82, 83 e 84
### O que 82 continua dizendo melhor
- a tese do produto
- o benchmark competitivo
- o norte visual e de experiÃªncia
- o plano de qualidade â€œtop de mercadoâ€

### O que 83 continua dizendo melhor
- o estado das superfÃ­cies, shell, UX e interfaces
- o que jÃ¡ mudou no branch moderno do GitHub
- a reconciliaÃ§Ã£o entre o PDF anterior e o estado real recente

### O que 84 passa a dizer melhor
- onde o monorepo ainda trai a narrativa de qualidade
- onde o CI ainda nÃ£o faz enforcement do que a policy promete
- onde o root e a documentaÃ§Ã£o ainda cobram custo invisÃ­vel
- por que â€œqualidade finalâ€ tambÃ©m depende de governanÃ§a do repositÃ³rio

### O que 81 continua sendo
- o freio factual
- o documento que impede a gente de inflar o que ainda nÃ£o fechou end-to-end

## DireÃ§Ã£o Operacional Sem Lacunas
Depois de alinhar `81 + 82 + 83 + 84`, a leitura conjunta mais honesta Ã©:

1. o Aethel nÃ£o estÃ¡ mais no estÃ¡gio de â€œrepo caÃ³tico sem norteâ€
2. o Aethel estÃ¡ no estÃ¡gio de â€œproduto promissor com gargalos grandes e governanÃ§a em alinhamento progressivoâ€
3. os maiores riscos agora se dividem em quatro blocos:
   - monÃ³litos de workbench/chat
   - full-matrix E2E ainda manual
   - root/documentation hygiene
   - fechamento real de colaboraÃ§Ã£o/preview/testes

## Regra de Uso Desta Auditoria
Se este documento conflitar com outro:

1. `81` vence em nÃºmeros reconciliados e claims factuais
2. `82` vence em rumo de produto e benchmark
3. `83` vence em leitura de sistemas/interfaces do branch moderno
4. `84` vence em leitura de monorepo, CI/CD, root hygiene e drift operacional

## ConclusÃ£o
Esta auditoria nova Ã© valiosa e entra legitimamente entre as principais.
Ela nÃ£o muda o rumo do Aethel; ela **melhora a nitidez** do rumo.

O conjunto atualizado fica assim:

- `82`: para onde vamos
- `83`: como estÃ£o as superfÃ­cies e interfaces
- `84`: como estÃ¡ a casa por baixo do piso
- `81`: o que Ã© verdade factual agora

Esse Ã© o conjunto mais forte que o projeto jÃ¡ teve atÃ© aqui sem cair em alucinaÃ§Ã£o, sem perder qualidade e sem transformar auditoria em narrativa solta.
