# 75_DESIGN_SYSTEM_UNIFICATION_GUIDE_2026-04-10
Date: 2026-04-10
Status: ACTIVE
Purpose: consolidar a linguagem visual do Aethel sem quebrar superfícies existentes nem introduzir um quarto dialeto de UI.

## Problema real
Hoje ainda coexistem três maneiras de estilizar o produto:
1. CSS variables `--aethel-*` consumidas direto em classes utilitárias.
2. Objetos `tokens` usados inline em partes do shell moderno.
3. Classes legado `aethel-*` espalhadas em superfícies antigas.

Isso não significa que tudo deva ser deletado de uma vez. Significa que o caminho canônico precisa ficar explícito e as migrações precisam ser graduais.

## Decisão canônica
A cascata oficial é:

```text
CSS Variables (globals.css)
  -> Tailwind utilities / semantic classes
  -> primitives e componentes canônicos
```

## Regras
- Novas superfícies não devem introduzir classes `aethel-*` novas.
- Novos componentes não devem depender de `tokens.colors.*` inline se a mesma semântica já existe em CSS vars.
- Refactors em componentes antigos podem manter `aethel-*` temporariamente, desde que o arquivo esteja marcado como legado ou deprecated quando aplicável.
- Acessibilidade é parte do design system: reduced motion, focus ring e high contrast devem continuar funcionando juntos.

## Componentes canônicos hoje
- `@/components/ui/Button`
- `@/components/ui/Input`
- `@/components/ui/Modal`
- `@/components/ui/primitives`
- `@/components/ui/premium`
- `@/components/preview/CanonicalPreviewSurface`

## Componentes legados que pedem convergência
- `components/Button.tsx`
- `components/Breadcrumbs.tsx`
- `components/GitPanel.tsx`
- `components/LivePreview.tsx`
- `components/OutputPanel.tsx`
- `components/QuickOpen.tsx`
- `components/ide/PreviewPanel.tsx`

## Espaçamento
Use grade de 4px como base, com preferência por:
- `p-2`, `p-3`, `p-4`, `p-6`, `p-8`
- `gap-2`, `gap-3`, `gap-4`, `gap-6`
- `rounded-lg`, `rounded-xl`, `rounded-2xl`

## Tipografia
- Headings: `font-semibold` com `tracking-tight`
- Body: `text-sm` ou `text-base` conforme densidade da superfície
- Meta text: `text-xs` com contraste suficiente
- Código: `font-mono`

## Checklist de migração
- Remover inline styles quando a mesma intenção visual já existir em CSS vars.
- Preferir classes Tailwind semânticas e estáveis nas novas superfícies.
- Corrigir contraste antes de adicionar brilho, glass ou motion.
- Tratar o Admin como parte do mesmo produto, não como um painel paralelo.
- Auditar spacing de headers, toolbars e empty states em breakpoints médios.

## Meta prática
O objetivo não é deixar tudo "bonito" em abstrato. O objetivo é fazer o produto parecer um só produto em:
- landing
- dashboard
- workbench
- preview
- admin
