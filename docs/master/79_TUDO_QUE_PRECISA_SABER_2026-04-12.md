1. Thesis Canônica (verbatim do 00_INDEX.md – 25/03/2026)
Aethel não é: dashboard com tools, chat separado, clone de VS Code com AI grudado, produtos separados.
Aethel é:

Um único studio system
Um único workbench shell
Uma única AI operational layer
Um único preview engine
Um connected project model

Decisões críticas (Decision 1-5):

Workbench = centro de tudo.
Chat sempre colado no artefato.
Preview unificado (web + 3D viewport + media).
Absorver o melhor sem herdar fraquezas.
Projetos conectados com asset layer compartilhado.

2. Estado Real Hoje (76 + 77 de 11/04/2026)

Média: 4.7/10
Design/coerência: 5/10 (drift vivo – commit recente “harden admin surfaces”)
Preview: 4/10 (ainda panel, não viewport)
AI: 5/10 (monolítico)
Onboarding: 4/10
Collab: 3/10
Canvas: inexistente

Pontas soltas reais: 15 rotas aspiracionais expostas, physics_*.js soltos, duplicações em docs/master, Jupyter 55% do código.
3. Benchmark com os Melhores (2026) + O que Falta

Cursor 3: Inline AI + background agents + Cmd+K fluido
Replit Agent 4: Infinite canvas + parallel agents + artifacts library
Figma MCP: Bidirecional code ↔ canvas
Unreal UE5: Viewport primário + gizmos + outliner
Adobe Firefly: Real-time generative + text-to-texture
Manus / Genspark: Wide research + multi-output
Linear: Design coerência 10/10 + paleta limpa

Nosso gap: Temos base técnica, mas falta um único language visual + micro-interações premium + organização fluida.
4. Análise por Área + Ideias Novas + Micro-Interações + Organização
4.1 Workbench Shell
Temos: ModernIDEShell.tsx + activity rail + terminal.
Falta: Inline reasoning + Cmd+K.
Micro-interações: Hover rail → tooltip com shortcut (140ms); drag tabs com preview fantasma; double-click seam reseta split.
Botões escondidos: Cmd+P global palette; botão “Split Editor” só em hover no canto superior.
Paleta: Graphite + blue focus; purple só accent.
Organização: Sidebar colapsável com categorias (Code / Preview / Assets / AI).
O que fazer: Criar InlineAICompletion.tsx + refatorar ModernIDEShell.tsx (100% primitives).
4.2 AI Operational Layer
Temos: AIChatPanelPro.tsx monolítico.
Falta: Colado no artefato + parallel agents.
Micro-interações: Streaming incremental + “thinking…”; hover mensagem → “Apply to editor” fade-in.
Botões escondidos: “Parallel Research” atrás de 3 dots; “Voice Mode” aparece só com mic.
Paleta: Pills coloridas por mode (blue = active).
Organização: Decompor em ChatMessageList + ChatInput + ChatModeSwitcher.
Ideias novas: Cost tracking por conversa + RAG over codebase + @file/@symbol mentions.
O que fazer: Decompor AIChatPanelPro (P0 da 77).
4.3 Preview / 3D Viewport
Temos: CanonicalPreviewSurface.tsx (secundário).
Falta: Viewport primário.
Micro-interações: Hover objeto → gizmo escala/rotação; scrub timeline instantâneo.
Botões escondidos: Toolbar intent-based (aparece em seleção); “Generative Edit” no canto inferior.
Paleta: Neutral gray + blue live.
Organização: Outliner + properties panel.
Ideias novas: Text-to-texture real-time + device frames.
O que fazer: Transformar em viewport primário.
4.4 Aethel Canvas Mode (Killer Feature)
Temos: Só prompt no 16_MASTER_FIGMA_PROMPT.md.
Falta: Tudo.
Micro-interações: Drag card de código → preview fantasma; double-tap zoom inteligente.
Botões escondidos: “Insert Artifact” em hover do canvas.
Paleta: Grid sutil 4px + snap-to-grid.
Organização: Toggle mode dentro do workbench (não nova página).
Ideias novas: MCP-style bidirecional.
O que fazer: Criar components/canvas/AethelCanvasMode.tsx (Fase 1).
4.5 Onboarding + Studio/Dashboard
Temos: OnboardingWizard.tsx.
Falta: <60s com agent demo.
Micro-interações: Progress bar com tooltips; confetti sutil.
Botões escondidos: “Skip tour”.
Paleta: Welcoming graphite.
Organização: 3 passos (template → demo → workbench).
O que fazer: Guided tour + prompt-to-app.
4.6 Collab + Mobile + Admin
Temos: Quase nada.
Falta: Cursors reais + presence.
Micro-interações: Avatar pulse quando edita.
Ideias novas: Mobile deep-link que continua sessão exata; audit logs de agents.
4.7 Design System Geral (75 guide)
Regras: CSS vars única fonte; density dense no workbench; motion 140ms hover; single toast family.
O que fazer: Migrar ~40 arquivos (77 lista). Excluir todos aethel-* legacy.
5. Plano Mestre 10/10 (78_EXECUTION_MASTER_PLAN – pronto para commit)
Fase 0 (hoje–3 dias)

Criar este arquivo 79 + 78.
Rodar npm run qa:design-system-consistency.
Esconder 15 rotas aspiracionais.

Fase 1 (7 dias)

Unificação visual + Aethel Canvas Mode.
Inline AI + Cmd+K.

Fase 2 (10 dias)

Decompor AIChatPanelPro + colar no artefato.
Preview → viewport primário + generative.

Fase 3 (7 dias)

Onboarding Replit-style.
Collab Figma-level.
Mobile + billing.

Fase 4 (5 dias)

QA full + deploy L5.

Métricas 10/10: Média benchmark 9.5+; primeiro artefato <90s; design coerência 10/10.
O que EXCLUIR: Legacy aethel-* classes, rotas aspiracionais expostas, componentes duplicados.
