# AUDITORIA V24 - Matriz do que falta para Aethel ser best-in-market

Data: 2026-05-22  
Base local medida: `c5d2dda21 refactor: split terrain and asset runtimes`  
Escopo: produto web em `cloud-web-app/web`, auditorias/gates atuais, lacunas para superar mercado em IDE, agentes, apps, pesquisa, Studio, jogos/filmes, marketplace, admin, trust e runtime.  
Postura: nao prometer Unreal/AAA/final sem evidencia de runtime, custo, sidecar e aprovacao humana.

## 1. Resumo executivo

Aethel esta muito melhor do que as auditorias antigas indicavam: os P0 de seguranca de build, i18n canonico, Suspense, cleanups, AI Director real, rate-limit IA, Evidence Center, bundle gates e runtime spine estao verdes localmente. O gap restante nao e mais "produto quebrado"; e virar produto de mercado: menos superficie inchada, mais execucao background real, mais evidencia por geracao, mais qualidade de asset e mais performance medida.

| Dimensao | Estado medido agora | Melhor do mercado faz | Gap real | Prioridade |
| --- | --- | --- | --- | --- |
| Robustez tecnica | 95+ QA scripts, gates criticos verdes, 0 P0 large files | CI bloqueia regressao e prova UX com evidencias visuais | Falta ligar todos os gates a PR/CI e screenshot autenticado recorrente | P0 |
| Agent workforce | 27 roles, AI limits, Director real, Evidence Center | Cursor/Linear mostram agentes como entidades rastreaveis, delegaveis e retomaveis | Falta run ledger completo, branch/PR/replay por agente e controle mobile | P0 |
| Bundle/performance | `threeDirect=45/45`, dynamic imports 254, 118 files >800 | v0/Bolt/Linear mantem landing/public ultra leves | Ainda esta no limite, sem folga; precisa ratchet para 40 e depois 30 | P0 |
| Admin | 6 areas canonicas, 46 rotas legadas preservadas | Linear/Vercel escondem complexidade atras de poucas areas e busca | Rotas fisicas ainda vazam complexidade operacional | P1 |
| Studio/game/film | 19 studio routes, engine modules rastreados, Quality Orchestrator existe | Unreal/Unity tem runtime/cooking/render/asset pipeline produtivo | Aethel deve assumir browser=preview, Local=heavy, Cloud=final/cinematic | P0 |
| Asset quality IA | Draft/curated/local/cloud ja conceituado | Pipelines profissionais exigem provenance, LOD, PBR, collision, perf trace | Precisa impedir `ai-draft` de virar `final` e criar fila de upgrade real | P0 |
| UX autenticada | Harness autenticado existe e passa | Mercado tem first-run polido, zero texto sobrando, prova operacional | Precisa screenshot index recorrente e triage visual por rota | P1 |
| Marketplace | Review/preview/provenance existe | Unreal/Fab/Canva mostram licenca, risco, install/rollback e trust | Precisa receipts publicos, badge de maturidade e dados de instalacao reais | P1 |
| Docs | Web docs 67, repo root docs ainda alto | Docs canonicos pequenos e atuais | Falta budget repo-wide e indice unico para agentes/humanos | P2 |

Score honesto atual:

| Score | Nota | Motivo |
| --- | ---: | --- |
| Engenharia/gates | 8.8/10 | Muitos P0 anteriores foram fechados e gates passam. |
| Produto visivel | 7.6/10 | Experiencia ja existe, mas ainda precisa compressao, evidencias e fluidez. |
| Mercado/posicionamento | 7.4/10 | Diferenciacao forte, mas provas publicas e demos precisam acompanhar. |
| Game/film real | 5.8/10 | Boa espinha, mas runtime e asset cooking ainda sao o gargalo. |
| Caminho para 10/10 | +1.2 a +2.4 | Execucao de P0/P1 abaixo. |

## 2. Estado local medido

### 2.1 Inventario do repo

| Metrica | Valor atual | Leitura |
| --- | ---: | --- |
| Arquivos do repo | 3.224 | Muito menor que auditorias antigas reportavam; docs/archive ja foi reduzido em parte. |
| TS/TSX no web app | 2.248 | Produto grande, precisa boundaries fortes. |
| Componentes | 513 | Superficie UI grande; exige Storybook e visual QA. |
| `app/**/page.tsx` | 118 | Rota extensa, mas com limite de pagina controlado. |
| Rotas API | 364 | Backend amplo; precisa observabilidade e limites por dominio. |
| Rotas AI | 38 | Diferencial forte; precisa custo e run ledger por operacao. |
| Studio routes | 19 | Boa cobertura; precisa qualidade de runtime/asset. |
| Admin routes | 46 | Compatibilidade ok; compressao fisica ainda pendente. |
| Testes | 182 | Melhorou muito; meta mercado: 250 curto prazo, 500 medio prazo. |
| Storybook stories | 32 | Meta curto prazo: 60; medio prazo: 100+. |
| QA scripts | 102 | Excelente; proximo passo e CI/PR evidence. |
| Web docs MD | 67 | Saudavel no web app. |
| Repo docs MD | 269 | Ainda alto; precisa indice canonico. |
| Root docs/master | 135 | Alto; precisa colapso para cerca de 50 ativos. |

### 2.2 Gates verdes nesta rodada

| Gate | Resultado | Aceite atual |
| --- | --- | --- |
| `qa:large-file-risk` | PASS | `largeFiles=34`, `p0=0`, `p1=23`. |
| `qa:large-file-ratchet` | PASS | `filesOver800=118/118`, max line `1150/1150`. |
| `qa:bundle-boundaries` | PASS | `threeDirect=45/45`, R3F 2/3, Drei 1/2, Monaco dentro do limite. |
| `qa:route-experience-spine` | PASS | 116 pages, 19 studio, 46 admin, max page 300. |
| `qa:marketing-claims` | PASS | Sem claims bloqueados. |
| `qa:no-fake-success` | PASS | 364 arquivos escaneados. |
| `qa:wcag-critical` | PASS | Checks estaticos criticos verdes. |
| `qa:suspense-boundaries` | PASS | 32 boundaries. |
| `qa:effect-cleanups` | PASS | 148 efeitos de risco checados. |
| `qa:ai-director-real` | PASS | Director nao esta mais preso no stub silencioso. |
| `qa:ai-limits-spine` | PASS | Rotas IA classificadas/limitadas. |
| `qa:runtime-engine-spine` | PASS | Spine de runtime consistente. |
| `qa:engine-spine-modules` | PASS | 14/14 modulos obrigatorios. |
| `qa:i18n-hardcoded-spine` | PASS | Hardcoded PT bloqueado. |
| `qa:i18n-canonical` | PASS | `next-i18next` canonico, legacy import bloqueado. |
| `qa:admin-consolidation` | PASS | 6 secoes, 45 rotas mapeadas. |
| `qa:authenticated-ux-harness` | PASS | Harness autenticado existe. |
| `qa:evidence-center-spine` | PASS | Evidence Center protegido existe. |
| `qa:marketplace-install-review` | PASS | Review governado existe. |

## 3. Referencias de mercado usadas

| Produto | Sinal de mercado verificado | Implicacao para Aethel |
| --- | --- | --- |
| Cursor Background Agents | Agentes remotos assincronos, status, follow-up, takeover, GitHub branch/PR, web/mobile e API com ate 256 agentes ativos por API key. | Aethel precisa transformar 27 roles em execucao observavel: lista, status, branch, PR, replay, takeover e mobile approvals. |
| Replit Agent | Agente cria apps/designs/slides/documentos, planeja, executa, checa e corrige ate deploy. | Aethel precisa fechar loop: plano -> execucao -> preview -> deploy receipt -> rollback. |
| v0 Platform API | API para projects, chats, messages, live previews, deployments e agents integraveis. | Aethel precisa API interna/externa de missions com artifacts enderecaveis, nao so UI. |
| Linear Agents | Agents como app users, delegacao sem tirar responsabilidade humana, contexto de workspace e permissoes. | Aethel deve manter humano responsavel e mostrar permissoes/scope por agente. |
| Unreal Engine 5.6 | Open worlds 60 FPS, MetaHuman in-engine, PCG, Sequencer, iteration/cooking melhorado. | Aethel nao deve prometer paridade browser; deve orquestrar Browser/Local/Cloud com honestidade. |
| Adobe Premiere | Generative Extend adiciona frames/audio e Object Mask isola/tracks sujeitos com IA. | Film Studio precisa AI video tools com labels, provenance, privacidade e requisitos tecnicos. |
| Runway Gen-4 | Video 5/10s, input image obrigatorio, custo por segundo/creditos, iteracao Turbo->qualidade. | Aethel deve planejar video com custo, duracao, input image e iteracao barata antes de final. |
| Canva Magic Studio | AI em toda a experiencia, facil para nao-especialistas, recursos integrados e seguranca/privacidade. | Aethel deve evitar painel poluido: usuario escolhe objetivo e o orquestrador decide ferramentas. |

Fontes oficiais: Cursor docs, Replit docs, v0 docs, Linear docs, Unreal Engine news, Adobe Learn/HelpX, Runway Help Center, Canva Newsroom.

## 4. Matriz principal: o que falta para melhor do mercado

| Area | Estado atual | Necessidade para ser best-in-market | Acao concreta | Prioridade | Esforco | Gate/evidencia |
| --- | --- | --- | --- | --- | ---: | --- |
| Background agents | Roles e safety existem; faltam execucoes longas com branch/PR por agente. | Igualar Cursor: agente remoto, status, follow-up, takeover, PR/review. | Criar `AgentRunLedger` + `AgentRunArtifact` + UI em AgentsWindow/Admin AI. | P0 | 5d | `qa:agent-run-ledger`, screenshot autenticado, PR receipt. |
| Mission scopes | Existe mission-first, mas escopo ainda pode ficar implicito. | Usuario escolhe `Prototype`, `Demo`, `Vertical Slice`, `Full Game/Product`. | Adicionar `MissionScopeSelector` com custo, tempo, evidencias e limites. | P0 | 2d | `qa:mission-scope-contract`. |
| Asset quality | Quality Orchestrator existe, mas precisa virar gate inescapavel. | Draft nunca vira final sem provenance, LOD, PBR, perf trace e aprovacao. | Bloquear status `final` sem `AssetFinalEvidence`. | P0 | 3d | `qa:asset-final-evidence-gate`. |
| Studio Local | Runtime/capability layer existe. | Trabalho pesado deve ir para sidecar/local, nao browser. | Sidecar job queue com receipts para meshopt/gltfpack/ffmpeg/blender. | P0 | 7d | `qa:studio-local-job-receipts`. |
| Cloud Stream | Pixel/Cloud precisa ficar held se nao configurado. | Cloud e para final/cinematic/demo, com custo e idle timeout. | Session manager com cost cap, idle shutdown e held UI. | P1 | 7d | `qa:cloud-stream-cost-safety`. |
| Game/Film claims | Marketing claims passam. | Continuar proibindo AAA sozinho/Unreal-grade/final sem prova. | Ratchet em `marketing-claims` + copy source-of-truth. | P0 | 1d | `qa:marketing-claims`. |
| Bundle | Passa no limite exato. | Ter folga real, nao limite justo. | Reduzir `threeDirect` 45->40, files>800 118->110. | P0 | 4d | `qa:bundle-boundaries`, `qa:large-file-ratchet`. |
| Admin | 6 areas canonicas, 46 legadas. | Navegacao visivel premium, legado via redirect/drawer. | Converter rotas legadas para redirects/canonical tabs gradualmente. | P1 | 5d | `qa:admin-physical-consolidation`. |
| UX autenticada | Harness passa. | Evidencia visual recorrente desktop/mobile. | Gerar index de screenshots por rota com diff baseline. | P1 | 3d | `qa:authenticated-visual-regression`. |
| Evidence Center | Existe. | Toda geracao relevante tem URL/evidenceRefs. | Persistir receipts por AI run, asset, deploy, browser op. | P0 | 4d | `qa:evidence-ref-coverage`. |
| Marketplace | Review existe. | Licenca/provenance/rollback/permission antes de instalar. | Receipts de instalacao e `community/internal preview` reais. | P1 | 4d | `qa:marketplace-trust-receipts`. |
| Pricing | Densidade melhorou. | Decisao rapida, custo claro, sem parede de texto. | Manter 3 planos primarios e advanced em disclosure. | P2 | 1d | `qa:public-visual-density`. |
| i18n | Canonico e hardcoded passam. | Expandir sem drift e preservar EN-first. | Gerar typed keys e bloquear string nova sem key. | P2 | 4d | `qa:i18n-typed-keys`. |
| Tests/Stories | 182 tests, 32 stories. | Mercado exige confianca visual/componentizada. | 250 tests e 60 stories em componentes de alto uso. | P1 | 7d | `qa:coverage-ratchet`, Storybook CI. |
| Docs | Web docs ok; root docs alto. | Poucos docs canonicos, sempre atuais. | Root `docs/master` 135->50, index unico. | P2 | 3d | `qa:docs-budget`. |
| Dependencies | Muitos modulos runtime e deps. | Menos superficie de CVE e bundle. | `depcheck`, `npm audit signatures`, mover dev-only. | P2 | 3d | `qa:dependency-budget`. |
| Editor perf | Gates de risco existem. | Medicao real com cenas grandes. | Bench fixtures para Level/Scene/Film/Audio/ContentBrowser. | P1 | 5d | `qa:editor-benchmarks`. |
| Preview/deploy | APIs existem. | Replit/v0 mostram preview/deploy como loop principal. | Deploy receipts, preview health e rollback visiveis. | P0 | 5d | `qa:preview-deploy-receipts`. |
| Mobile approvals | PWA/harness existem. | Cursor/Linear permitem agentes em mobile. | Mobile approval inbox para pause/approve/takeover. | P1 | 5d | `qa:mobile-agent-approvals`. |
| Video AI | Spine/documentos existem; provider real deve ser governado. | Adobe/Runway mostram custo, labels e requisitos. | Video generation gateway held/available com custo por segundo. | P1 | 5d | `qa:ai-video-cost-provenance`. |

## 5. Games e qualidade de IA: como sair do asset 10k poligonos e chegar em trabalho serio

A regra central: IA generativa produz rascunho, nao asset final. Qualidade de jogo vem de pipeline, nao de prompt magico.

### 5.1 Lanes canonicos de qualidade

| Lane | Quando usar | O que entrega | O que nao pode prometer | Gate obrigatorio |
| --- | --- | --- | --- | --- |
| `ai-draft` | Ideacao rapida, prototipo, placeholder jogavel. | Mesh simples, textura inicial, rig aproximado, audio/video draft. | Final, marketplace-ready, cinematic, AAA. | Label `Draft assets are not final`. |
| `curated-asset` | Demo/vertical slice com qualidade visual maior. | Asset comprado/curado, licenca, metadata, estilo consistente. | Originalidade total se veio de marketplace. | Provenance/licenca + style match. |
| `studio-local-optimized` | Produzir qualidade tecnica: LOD, KTX2, meshopt, collision, navmesh. | Asset cozinhado, otimizado e medido. | Qualidade visual se source for ruim. | Sidecar receipt + perf trace. |
| `cloud-render-grade` | Cinematic/final review/Unreal via stream quando configurado. | Render/preview de alta qualidade, custo visivel. | Disponivel sem backend/custo. | Cloud capability + cost cap + idle timeout. |

### 5.2 Evidencia minima para um asset virar `final-candidate`

| Evidencia | Por que importa | Obrigatorio para |
| --- | --- | --- |
| Provenance/licenca | Evita risco legal e marketplace fake. | Demo, vertical slice, full game. |
| PBR map set | Albedo/normal/roughness/metalness/AO. | Demo+. |
| LOD0/LOD1/LOD2/LOD3 | Performance consistente por distancia. | Demo+. |
| Collision mesh | Gameplay real, fisica, interacao. | Qualquer jogo jogavel. |
| Navmesh markers | IA/bots/minions/NPC pathing. | Jogos com IA/navegacao. |
| Rig/animation retarget status | Personagens nao quebram animacao. | Character assets. |
| Material budget | Evita shader pesado e draw calls fora de controle. | Demo+. |
| Texture budget | Evita VRAM estourar no browser/local. | Demo+. |
| Perf trace | Prova FPS/memoria em target real. | Demo+. |
| Human approval | IA nao decide sozinha o que e divertido/bonito/legalmente aceitavel. | Final-candidate+. |

### 5.3 Escopo escolhido pelo usuario, sem prender em um tipo de jogo

| Escopo | Promessa honesta | Conteudo esperado | Bloqueios |
| --- | --- | --- | --- |
| Prototype | Validar loop e sensacao rapido. | 1 loop, 1-3 cenas, assets draft/curated mistos, logs de custo. | Nao e final, pode ter placeholder. |
| Demo | Experiencia polida curta. | Arte coerente, audio, tutorial, performance minima, deploy/replay. | Requer curated/local optimization. |
| Vertical Slice | Um corte com qualidade proxima do produto final. | Bible robusta, 1 capitulo/mapa completo, QA, bot playtest, perf target. | Requer aprovacao humana e evidence completo. |
| Full Game | Plano de producao, milestones e entregas graduais. | Roadmap, milestones, backlog, episodio/capitulo, release gates. | Nunca deve ser vendido como 1-click sem humanos. |

### 5.4 Bible robusta: interna, profunda, sem poluir UX

A UX deve mostrar 5-7 decisoes simples; internamente a bible pode ser profunda. O usuario nao precisa ver uma parede de texto, mas as IAs precisam.

| Secao da Bible | Conteudo minimo | Quem usa |
| --- | --- | --- |
| Product promise | Fantasia do jogador, publico, plataforma, escopo. | Director, Designer, Marketing. |
| Pillars | 3-5 pilares que bloqueiam drift. | Todos os agentes. |
| Game loop | Loop de 30s, 5min, 30min. | Game Designer, Gameplay Engineer. |
| Mechanics spec | Input, camera, combate, habilidades, economia, progressao. | Gameplay Engineer, QA. |
| World/lore | Historia, lugares, faccoes, regras do mundo. | Writer, Cinematic Director. |
| Characters | Silhueta, personalidade, arco, habilidades, voz, rig. | Asset Pipeline, Audio Composer. |
| Level grammar | Biomas, landmarks, encounter design, spawn rules. | Level/World agents. |
| Art direction | Shape language, cor, material, lighting, refs permitidas. | Asset Pipeline, Render. |
| Audio direction | Temas, stems, SFX taxonomy, mix targets. | Audio Composer. |
| Cinematics | Shot language, pacing, camera, transitions, VO. | Cinematic Director. |
| UI/UX | HUD, onboarding, feedback, accessibility. | Designer, UX Researcher. |
| Technical budgets | Triangles, draw calls, VRAM, texture size, FPS target. | Performance Engineer. |
| Runtime target | Browser/Studio Local/Cloud per feature. | Quality Orchestrator. |
| Legal/provenance | Licencas, assets externos, modelos, music rights. | Legal Reviewer. |
| QA/playtest | Test matrix, bots, telemetry, pass/fail. | QA, Performance Engineer. |
| Release gates | Readiness, blockers, human approvals, rollback. | Release Manager. |

## 6. Tabela de lacunas por superficie

| Superficie | Qualidade atual | Lacuna para mercado | Ref mercado | Proxima melhoria |
| --- | --- | --- | --- | --- |
| Landing/public | Claims seguros e density gates. | Prova visual curta: demo real, receipts, before/after. | v0/Canva vendem resultado rapido com UI simples. | Hero com uma missao real e 3 evidencias, nao lista gigante. |
| Login/auth | Infra forte, i18n canonico. | Auth ranking claro: Passkey, Magic Link, OAuth, password fallback. | Vercel/Linear escondem complexidade. | Login compacto e trust-focused. |
| Dashboard | Compressao ja trabalhada. | Virar cockpit: next action, cost, active runs, evidence. | Linear foca no que precisa atencao. | Topbar + 3 cards max + operations drawer. |
| IDE | Monaco/AI/collab fortes. | Background agents e PR/deploy receipts. | Cursor background agents. | Agents sidebar com branch/PR/takeover. |
| Studio hub | 19 rotas e runtime spine. | Mostrar caminho Browser/Local/Cloud por tarefa. | Unreal/Unity mostram toolchain/cooking. | Runtime task planner com sidecar receipts. |
| Studio editors | Cobertura ampla. | Benchmarks reais e virtualizacao onde necessario. | Unreal 5.6 investe em UX/editor iteration. | Editor perf fixtures + profiler cards. |
| Film/video | Sequencer/audio existem. | Object mask/generative extend/video provider governado. | Adobe/Runway. | AI video gateway + labels/provenance. |
| Marketplace | Install review existe. | Public trust: licenca, rollback, permissions, maturity. | Fab/Canva app marketplace. | Install receipts e badge maturity. |
| Admin | 6 areas e legacy map. | Reduzir vazamento fisico de 46 rotas. | Linear/Vercel/AWS console. | Redirects/tabs canonicamente. |
| Evidence Center | Existe. | Cobrir toda acao gerativa e deploy. | Linear activity + v0 deploy logs. | Evidence refs obrigatorios por artifact. |
| Mobile/PWA | Base existe. | Aprovar/pausar/takeover agents no celular. | Cursor web/mobile agents. | Mobile agent approval inbox. |

## 7. Top 40 tarefas atomicas recomendadas

| ID | Tarefa | Arquivos/area | Aceite |
| --- | --- | --- | --- |
| V24-001 | Criar `AgentRunLedger` e `AgentRunArtifact`. | Prisma/lib/server/agents | Run tem status, custo, artifacts e evidenceRefs. |
| V24-002 | Expor run ledger em AgentsWindow. | `components/agents/**` | Usuario ve running/finished/error/takeover. |
| V24-003 | Expor metricas por role no Admin AI. | `app/admin/ai` | Cards/tabela por role, success, custo, P95. |
| V24-004 | Criar `MissionScopeSelector`. | Dashboard/landing/studio | Prototype/Demo/Vertical Slice/Full Game com custo/limite. |
| V24-005 | Bloquear asset final sem evidencia. | `lib/production/**` | `ai-draft` nunca vira final. |
| V24-006 | Criar sidecar job receipts. | Studio Local bridge | meshopt/gltfpack/ffmpeg/blender retornam receipt. |
| V24-007 | Reduzir `threeDirect` 45->40. | Offenders do bundle audit | `qa:bundle-boundaries` com folga. |
| V24-008 | Reduzir files >800 118->110. | Large file queue | `qa:large-file-ratchet`. |
| V24-009 | Split `lib/server/websocket-server.ts`. | transport/auth/rooms/presence | Arquivo principal <600 linhas. |
| V24-010 | Split `lib/particles/advanced-particle-system.ts`. | particles/runtime/render/authoring | Kernel principal <600 linhas. |
| V24-011 | Split `server/workers/build-queue-worker.ts`. | worker/queue/executor/retry | Worker principal <600 linhas. |
| V24-012 | Split `lib/ai-tools-registry.ts`. | registry/categories/permissions | Registry principal <600 linhas. |
| V24-013 | Split `lib/ai/behavior-tree-system.tsx`. | model/evaluator/editor adapter | Arquivo principal <600 linhas. |
| V24-014 | Admin physical consolidation wave 1. | `/admin/*` | 10 rotas legadas viram tabs/redirect. |
| V24-015 | Admin physical consolidation wave 2. | `/admin/*` | +15 rotas migradas. |
| V24-016 | Authenticated visual screenshot index. | scripts/playwright | HTML/MD com desktop/mobile por rota. |
| V24-017 | Evidence coverage gate. | scripts/check-* | Geracao sem evidenceRef falha. |
| V24-018 | Deploy receipt model. | deploy APIs | Cada deploy tem logs, URL, rollback, owner. |
| V24-019 | Preview health model. | IDE/Studio | Preview tem ready/error/stale state. |
| V24-020 | Runtime mode planner. | Browser/Local/Cloud | UI mostra por que uma lane esta held. |
| V24-021 | Pixel Stream session safety. | streaming/backend | cost cap, idle timeout, held when env missing. |
| V24-022 | AI video gateway held/available. | `/api/ai/video` | Sem provider = provider_unavailable, nao fake. |
| V24-023 | Runway/Adobe-style video labels. | Film Studio | Generated media sempre rotulado. |
| V24-024 | Playtest bot contract. | Game production spine | Bots geram logs e blockers, nao fake fun score. |
| V24-025 | Performance fixtures for editors. | Level/Scene/Film/Audio | 1k/10k object fixtures com budgets. |
| V24-026 | Virtualize high-risk lists. | WorldOutliner/ContentBrowser/Keyframes | FPS/DOM budget medido. |
| V24-027 | Storybook 32->60. | UI/agents/studio cards | Visual baseline de componentes criticos. |
| V24-028 | Tests 182->250. | routes/lib production | Foco em regressao de gates. |
| V24-029 | Root docs budget. | docs/scripts | `docs/master` max 50 active. |
| V24-030 | Dependency budget. | package scripts | unused/dev-only report e CVE budget. |
| V24-031 | Mobile agent approval inbox. | PWA/mobile UI | Pause/approve/takeover por celular. |
| V24-032 | Cost budget by mission scope. | billing/metering | Full Game exige budget explicito. |
| V24-033 | Agent permission diff. | Agent Cockpit | Usuario ve o que cada agente pode tocar. |
| V24-034 | Human responsibility banner. | Agents/deploy/apply | Agente delegado nao remove dono humano. |
| V24-035 | Curated asset sourcing receipts. | Marketplace/asset pipeline | Asset externo tem origem/licenca. |
| V24-036 | Asset style consistency score. | asset pipeline | Score e heuristica, nao decisao final. |
| V24-037 | Game bible deep schema. | production bible | 16 secoes internas, UI resumida. |
| V24-038 | Bible-to-backlog compiler. | mission planner | Bible gera epics/tasks/test gates. |
| V24-039 | Release readiness from registries. | status/trust | Status page derivada de registries. |
| V24-040 | PR/CI gate dashboard. | Admin Platform | Quais gates passaram em cada commit. |

## 8. O que nao fazer

| Nao fazer | Por que |
| --- | --- |
| Prometer "AAA sozinho" | Design, diversao, direcao artistica e legal ainda precisam humano. |
| Chamar browser puro de Unreal-grade | Browser e preview/review; Local/Cloud carregam trabalho pesado. |
| Transformar `ai-draft` em `final` | Risco visual, legal e de performance. |
| Carregar Three/Monaco em rotas publicas | Mata primeira impressao e SEO/perf. |
| Deletar rotas admin sem redirect | Quebra deep links operacionais. |
| Criar mais docs sem apagar/consolidar | Agentes/humanos se perdem em documentacao obsoleta. |
| Rodar workers pesados no browser | Deve ir para Studio Local/sidecar/cloud. |

## 9. Rodadas recomendadas

### Rodada A - Best-in-market operational spine (5 dias)

| Dia | Entrega | Resultado |
| --- | --- | --- |
| 1 | AgentRunLedger + evidence coverage | Toda acao agentica fica auditavel. |
| 2 | MissionScopeSelector + cost budgets | Usuario escolhe ambicao com custo/limite. |
| 3 | Asset final evidence gate | Qualidade nao vira fake. |
| 4 | Bundle ratchet 45->40 + large file 118->110 | Folga real de performance. |
| 5 | Authenticated screenshots index | Produto visivel auditavel. |

### Rodada B - Studio quality pipeline (5 dias)

| Dia | Entrega | Resultado |
| --- | --- | --- |
| 1 | Sidecar job receipts | Local runtime prova trabalho pesado. |
| 2 | Asset upgrade UI completa | Usuario entende draft->quality. |
| 3 | Editor benchmark fixtures | Performance deixa de ser opiniao. |
| 4 | Playtest bot contract | Jogos medidos por logs e blockers. |
| 5 | Runtime mode planner | Browser/Local/Cloud fica claro. |

### Rodada C - Market polish and launch evidence (5 dias)

| Dia | Entrega | Resultado |
| --- | --- | --- |
| 1 | Admin redirects wave 1 | Menos superficie legada visivel. |
| 2 | Marketplace receipts | Instalar/preview com confianca. |
| 3 | Mobile agent approvals | Paridade com Cursor mobile/workflow. |
| 4 | Docs budget + index | Menos confusao para IAs e humanos. |
| 5 | Status/readiness from registries | Claims sempre derivados de evidencia. |

## 10. Conclusao

Aethel ja saiu do basico: os gates mostram que varias dividas das auditorias antigas foram realmente fechadas. O que falta para "melhor do mercado" e menos glamour e mais espinha operacional:

1. Agentes precisam virar execucoes remotas rastreaveis com artifacts, PRs, replay, takeover e mobile approvals.
2. Assets e jogos precisam de qualidade por pipeline: curated sourcing, Studio Local optimization, perf trace, provenance e review humano.
3. Browser/Local/Cloud precisam ser uma decisao automatica e honesta, nao tres features soltas.
4. UX precisa comprimir texto e mostrar prova operacional: custo, readiness, evidence, next action.
5. Performance precisa folga real: bundle ratchets, splits e benchmarks.

Se as Rodadas A/B/C forem executadas, Aethel fica com uma posicao rara: nao tentar ser Unreal, Cursor, Linear, Runway e Canva ao mesmo tempo; mas orquestrar tudo isso com provas, custos e limites claros dentro de uma unica IDE criativa AI-native.
