# Auditoria end-to-end - Aethel Engine (2026-04-07)

Documento canonico de diagnostico, benchmark e plano de acao. Consolida leitura de produto, codigo e documentacao, alinhando `AETHEL_INTERFACE_BLUEPRINTS/*` com `docs/master/*`.

## 1. Visao geral

Plataforma web em monorepo Next.js com Studio (`/dashboard`) e Workbench (`/ide`): edicao, preview multi-estrategia, viewport 3D, chat de IA, colaboracao e billing. A ambicao segue alta, mas o estado operacional continua desigual: apps perto de L3, jogos e filmes em L2, L4 bloqueado sem evidencia real.

## 2. Diagnostico critico

### 2.1 Pecas soltas

| Area | Risco | Acao |
| --- | --- | --- |
| Rotas aspiracionais em `app/` | Usuario encontra shells vazios ou pouco confiaveis | Colocar atras de gate, redirecionar com aviso ou remover |
| Chat de IA sem aplicacao real no editor | Paridade baixa frente a Cursor e Windsurf | Prioridade P0 para ponte chat -> Monaco |
| `components/` e `lib/` muito fragmentados | Stubs, duplicacao de ideia e manutencao dificil | Podar, mover para `_deprecated/` e reorganizar por dominios |
| Supersedencia documental confusa | Leitura errada do canonico | Manter `DEPRECATED_INDEX.md` e preservar a serie historica `41/41a/41b` sem novas colisoes |

### 2.2 Duplicacoes conhecidas

- Notificacoes: `NotificationCenter` fica como deprecated; fluxo ativo segue no dashboard e em `NotificationSystem` quando integrado.
- `components/editor/` e `components/editors/`: sao dominios distintos; o primeiro cobre Monaco e codigo, o segundo cobre editores de jogo e VFX.
- Nexus: `/nexus` usa `NexusCanvasV2` diretamente; `NexusCanvas.tsx` e apenas um re-export de compatibilidade.

### 2.3 Estado verificado no repositorio

- `FullscreenIDE` usa apenas `ModernIDEShell`; `IDELayout.tsx` permanece so como legado identificado.
- `next.config.js` deixou de ignorar erros de TypeScript no build; o gate correto volta a ser `tsc --noEmit`.
- `lib/ai/ai-apply-bridge.ts` e `EditorApplyBridgeContext.tsx` fecham o MVP de chat -> editor, com persistencia via `writeFile`.
- `MonacoChatDiffPanel.tsx` fornece diff Monaco lado a lado, com revisao antes de aplicar.
- `lib/ai/ai-agent-mode.ts` define o contrato minimo do modo agente e `TaskOpsPanel.tsx` mostra rascunho local quando a API real nao responde, sem fingir execucao.
- `lib/routes/workbench-convergence.ts` e `middleware.ts` ja escondem labs em producao por padrao e convergem rotas duplicadas para o `/ide`.
- `/editor-hub` foi reduzido para redirecionamento direto ao `/ide`, removendo uma duplicacao de entrada sem valor proprio.
- `components/ide/index.ts` deixou de reexportar `IDELayout`, reduzindo o risco de reintroduzir o shell legado por imports indiretos.
- `DashboardRoutingNotice.tsx` comunica o motivo do redirecionamento em vez de fazer redirect mudo.
- `AethelHeaderPro.tsx` deixa de depender de usuario hardcoded, contador fake e busca simulada; usa `auth/profile`, `notifications` e envia a busca para o workbench.
- `ModernIDEShell.tsx` agora tem resize real nas costuras principais (sidebar, preview e copiloto), usa os tamanhos do estado e deixou de exibir handle "fake".
- `FullscreenIDE.tsx` persiste o layout do shell em `localStorage` e liga o bottom dock a acoes reais (buscar arquivos, abrir Git, console, diagnosticos e modos da previa).
- Arquivos `.bak` em `cloud-web-app/web` foram removidos nesta rodada.

## 3. Benchmark resumido

| Pilar | Estado atual | Proximo salto util |
| --- | --- | --- |
| Editor | Ja existe ponte com Monaco e diff basico | Split editor, diff parcial e find/replace rico |
| Chat IA | Painel forte, apply bridge real e contrato de agent mode | Orquestracao real, memoria persistente e aprovacoes mais finas |
| Preview | Arquitetura multi-estrategia existe | HMR confiavel e logs integrados |
| Viewport 3D | Ainda prototipo em comparacao a Unreal ou Unity | Selecao, gizmos, hierarquia e importacao GLTF |
| Canvas 2D | Ainda nao existe como superficie independente | Criar modo proprio sem misturar com o 3D |

## 4. Prioridades

### P0

1. Consolidar a ponte chat -> editor e manter persistencia em disco.
2. Fechar a convergencia de rotas aspiracionais e duplicadas.
3. Limpar arquivos mortos e wrappers que so geram confusao.
4. Remover o shell legado quando nao houver consumidores.

### P1

1. Paleta de comandos mais ampla.
2. Split editor e diff viewer no fluxo principal do IDE.
3. Find/replace, symbol outline e completacao inline com IA.
4. Onboarding validado contra o blueprint e o alvo de menos de 90 segundos.

### P2

1. Viewport 3D minimo funcional.
2. HMR real no preview.
3. Deploy com um clique.
4. Modo agente com ferramentas reais.
5. Resize de paineis no shell.

### P3 e P4

Persistencia de memoria, `.aethelrules`, billing real, WCAG AA, PT-BR completo, mobile companion, canvas 2D, multiagente visual, pesquisa e verticais de jogos e filmes.

## 5. Documentacao

- `DEPRECATED_INDEX.md` agora lista supersedencias e superficies retiradas.
- `72_UX_UI_BENCHMARK_TRIAGE_2026-04-08.md` faz a triagem visual e de experiencia.
- A serie historica `41`, `41a` e `41b` foi normalizada e segue explicada em `DEPRECATED_INDEX.md`.

## 6. Veredito

As forcas do Aethel continuam claras: blueprints fortes, sistema de tokens consistente, chat rico, politica anti-fake-success e arquitetura flexivel de preview. O gargalo continua sendo transformacao de ambicao em fluxo confiavel: menos superficies aspiracionais expostas e mais pilares com utilidade comprovada.

Direcao recomendada: levar cada pilar importante a cerca de 70% de utilidade real antes de expandir para novas verticais.

## 7. Expectativa realista

Nao existe salto unico para "superar Cursor, Unreal, Adobe e Replit" em um ciclo. O caminho real e iterativo:

| Area | Estado | Proximo passo |
| --- | --- | --- |
| Chat -> editor | MVP funcional com persistencia | Aplicacao parcial e melhor governanca de diff |
| Rotas | Convergencia no middleware e aviso no dashboard | Medir uso e remover rotas mortas restantes |
| IDE | Shell moderno canonico | Resize, split editor e mais comandos |
| Preview / 3D / Deploy | Especificados e parcialmente preparados | Avancar um vertical de cada vez |

Variavel de gate: `NEXT_PUBLIC_SHOW_ASPIRATIONAL_ROUTES=true` mostra labs em producao; `false` tambem os oculta em desenvolvimento.
