# Triagem UX/UI - benchmark, critica e melhorias (2026-04-08)

Auditoria orientada a experiencia e usabilidade, cruzando o codigo atual com referencias de mercado. O objetivo aqui nao e inflar claims, e sim aproximar a percepcao do produto dos melhores sem criar ilusao de completude.

## 1. Referencias de benchmark

| Produto | O que calibrar |
| --- | --- |
| Linear | Ritmo de teclado, densidade legivel, estados vazios honestos, hierarquia tipografica estavel |
| Vercel | Marketing e dashboard com a mesma lingua visual, sem "modo demo" vazando para produto principal |
| Cursor / Windsurf | Workbench unico, fluxo curto entre codigo, preview e revisao |
| Figma | Paineis redimensionaveis, selecao clara, uma surface canonica por modo |
| GitHub | Navegacao previsivel e features incompletas escondidas ou rotuladas como beta |

## 2. Forcas observadas

1. `lib/design-tokens.ts` e `components/ui/primitives.tsx` formam uma base visual forte.
2. `StudioGlobalNav` e `lib/navigation/surfaces.ts` mostram boa disciplina estrutural.
3. Auth v2 entrega narrativa melhor que um formulario simples.
4. `ModernIDEShell` mais `FullscreenIDE` ja formam um shell de workbench reconhecivel.
5. A politica anti-fake-success continua sendo um diferencial importante.

## 3. Problema transversal

Hoje o produto ainda parece falar em tres dialetos visuais:

| Via | Onde aparece | Risco |
| --- | --- | --- |
| CSS vars + Tailwind com `--aethel-*` | Dashboard, chat, varias rotas | Bom para tema, mas facilmente vira classe longa e inconsistente |
| Objeto `tokens` em inline style | Shell moderno e primitives | Forte localmente, mas duplica a fonte de verdade |
| Classes legado `aethel-*` | Admin e superficies antigas | Soa como terceiro sistema visual |

Benchmark de mercado ensina uma licao simples: os melhores produtos parecem coesos porque derivam de uma cascata unica.

## 4. Critica por superficie

### Marketing e publico

- A navegacao deve continuar curta e confiavel.
- Rotas de demonstração nao devem parecer recurso acabado.

### Auth

- O fluxo esta forte.
- Vale alinhar inputs e estados ao mesmo kit de primitives do resto do Studio.

### Dashboard

- O `DashboardRoutingNotice` e uma boa evolucao, porque comunica o redirecionamento.
- Ainda vale reduzir densidade em algumas areas para reforcar hierarquia.

### IDE e workbench

- `ModernIDEShell` ja organiza a experiencia principal.
- O maior gap de "feel premium" hoje e resize de paineis e distribuicao mais adaptativa.

### Nexus

- A chrome ao redor esta mais rica do que o viewport em si.
- O proprio produto precisa sinalizar maturidade L2 ou beta nessa surface.

### Admin

- Continua sendo a area com maior risco de parecer "outro produto".
- Precisa convergir para o mesmo sistema visual do Studio.

## 5. Usabilidade e acessibilidade

- O projeto ja tem bases boas de `aria-label`, skip links e estados honestos.
- Falta tornar WCAG e contraste uma rotina automatizada, nao so intencao.
- `prefers-reduced-motion` deve ser aplicado de forma mais ampla.

## 6. Prioridades

### P0

1. Definir uma unica fonte de design para tokens e CSS vars.
2. Marcar superfícies L2 ou beta na propria interface, nao so nos docs.

### P1

1. Adicionar resize real aos paineis do workbench.
2. Revisar onboarding para reduzir friccao ate o primeiro projeto.

### P2

1. Trazer o admin para o mesmo kit visual do Studio.
2. Criar um modo mais guiado ou mais compacto para o chat avancado.

### P3

1. Centralizar i18n.
2. Validar temas claro e escuro com contraste AA.

## 7. Veredito

O Aethel ja tem materia-prima para ser percebido como produto premium: identidade, shell moderno, narrativa boa e uma politica de honestidade rara. O que ainda trava essa percepcao e fragmentacao visual, densidade excessiva sem progressao e algumas superficies cuja chrome promete mais do que a funcionalidade entrega.

O proximo salto certo nao e adicionar mais features. E consolidar uma cascata unica de design e melhorar o ritmo do shell principal.
