# V0 Prompt - Refinamento Incremental do Aethel Studio (2026-04-01)

## Objetivo
Refatore e melhore **apenas o que ja existe** no Aethel Studio. O foco e elevar a experiencia visual e operacional para um padrao L5 (Vercel/Linear/Cursor/Figma/Adobe), sem inventar funcionalidades novas nem alterar o backend.

## Regras inegociaveis
1) **Nao inventar backend**: use somente o que ja esta implementado. Se um estado for parcial, sinalize como parcial.
2) **Nao apagar fluxos**: refine, organize e harmonize. Nao remover features ou caminhos existentes.
3) **Design system canonico**: utilize tokens de `cloud-web-app/web/app/globals.css`. Evite `slate`, `zinc`, `gray` por padrao.
4) **PT-BR consistente**: toda microcopy e UI em PT-BR (incluindo tooltips, placeholders e empty states).
5) **Acessibilidade**: WCAG 2.2 AA (labels, foco visivel, aria-*, contraste, estados de erro claros).
6) **Honestidade operacional**: estados degradados devem ser rotulados (ex: preview inline, billing parcial).
7) **Performance percebida**: prefira estados skeleton, shimmer e transicoes leves com contexto (o que esta acontecendo e por que).

## Superficies prioritarias
- IDE/Studio (menus, status bar, file explorer, command palette, tabs)
- Preview runtime (toolbar, fallback, readiness, erros)
- Chat/AI (inputs, prompts rapidos, estados de geracao)
- Marketplace (assets, biblioteca, creator dashboard)
- Billing/Public (pricing, checkout, status, badges)
- Admin/Monitoring (claridade e sinalizacao)

## O que melhorar
- Consistencia de cor, tipografia, espacos e estados
- Microinteracoes (hover, focus, loading, success, error)
- Eliminacao de copy ambigua (ex: "Ready", "Loading")
- Padrao unico de badges, alerts e banners
- Acoes sempre com proximo passo claro

## Benchmark (sem copiar layout)
- Linear/Vercel: clareza, densidade visual e hierarquia
- Cursor: chat integrado e estados honestos
- Figma/Adobe: controle, precisao e linguagem profissional

## Entregaveis
1) **Patch de codigo** com melhorias incrementais, sem reescrever o produto.
2) Lista de arquivos alterados + resumo do que mudou em cada um.
3) Indicacao explicita de qualquer area onde nao foi possivel melhorar sem mexer no backend.

## Estilo visual desejado
- Dark premium, com glassmorphism sutil
- Contraste alto e leitura facil
- Nada infantil ou genérico; tudo precisa parecer ferramenta pro

---

Agora execute a refatoracao incremental seguindo os criterios acima.
