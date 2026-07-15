# 69_V0_PROMPT_STUDIO_UX_2026-04-01

Use o prompt abaixo no v0 para gerar UI/UX de alta fidelidade com foco em experiencia profissional e consistencia Aethel.

---

## Prompt v0 (copie e cole)

Crie uma tela completa do "Aethel Studio Workbench" com foco em UX premium de ferramenta profissional (referencias: Vercel, Linear, Cursor, Figma, Unreal Engine). A interface deve ser dark, glassmorphism controlado e altamente legivel, com estados honestos (nada de sucesso falso). Linguagem PT-BR.

**Requisitos de UX e acessibilidade**
- Use foco visivel, estados de erro/empty/loading claros e com copy objetiva.
- Componentes com minimo de 44px de alvo quando clicaveis principais.
- Nunca esconda estados degradados (ex.: preview em fallback deve ficar explicito).

**Layout**
1. Top bar com:
   - status de runtime (ativo/degradado/indisponivel),
   - perfil do usuario,
   - botao de paleta de comandos.
2. Side rail esquerda com: Projetos, Workbench, Nexus, Billing.
3. File explorer compacto com busca e estado de sincronizacao.
4. Editor central (monaco-like) com tabs, breadcrumbs e mini status.
5. Preview panel a direita (ou central) com:
   - CTA para iniciar runtime,
   - estado fallback inline,
   - indicadores de sync.
6. Chat lateral com:
   - chips de contexto (@codebase, @doc, @preview),
   - resposta com blocos de acao (copiar, aplicar, abrir),
   - feedback de confianca e custos.
7. Barra inferior com status (UTF-8, Git branch, sync).

**Tokens (use exatamente como CSS variables)**
- Fundo: `--aethel-bg` e `--aethel-surface-primary`
- Superficies: `--aethel-surface-secondary`, `--aethel-surface-tertiary`, `--aethel-surface-quaternary`
- Texto: `--aethel-text-primary`, `--aethel-text-secondary`, `--aethel-text-tertiary`, `--aethel-text-quaternary`
- Primario: `--aethel-primary`
- Info: `--aethel-info`
- Sucesso: `--aethel-success`
- Warning: `--aethel-warning`
- Erro: `--aethel-error`
- Bordas: `--aethel-border-primary`, `--aethel-border-secondary`, `--aethel-border-subtle`

**Copy PT-BR (exemplos)**
- Preview: "Preview pronto para iniciar", "Modo inline ativo (fallback)", "Nao foi possivel conectar ao runtime"
- Chat: "Pergunte a IA sobre o seu codigo...", "Copiar trecho", "Aplicar diff"
- Git: "Workspace limpo", "Adicionar ao stage", "Commits recentes"

**Micro-interacoes**
- Hover sutil em cards e tabs.
- Staggered reveal em listas.
- Indicador de carregamento minimalista e elegante.

**Entregas**
- Mostre a tela completa.
- Inclua estados alternativos (loading/empty/error) pelo menos para Preview e Git.

---

## Observacoes
- Evite paleta default de Tailwind (slate/zinc/blue/emerald/red). Use apenas os tokens Aethel.
- Estetica premium, sem excesso de glow. Apenas realces suaves.
- Sem emojis.
