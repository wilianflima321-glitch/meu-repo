# MOJIBAKE_SCAN.md
Generated: 2026-04-28T08:34:41.959Z

- Files scanned: 1412
- Findings: 41

## Findings
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:4 -> **VersÃ£o:** 1.0
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:5 -> **Autor:** AnÃ¡lise Automatizada
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:25 -> | **Command Palette (Ctrl+Shift+P)** | [components/ide/CommandPalette.tsx](../components/ide/CommandPalette.tsx) | ImplementaÃ§Ã£o canÃ´nica, comandos categorizados, keybindings |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:41 -> | **Keybindings editor** | [KeyboardShortcutsEditor.tsx](../components/KeyboardShortcutsEditor.tsx) | CustomizaÃ§Ã£o de atalhos |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:50 -> | **Breadcrumbs navigation** | ðŸŸ¡ Parcial | [Breadcrumbs.tsx](../components/Breadcrumbs.tsx) bÃ¡sico (47 linhas), falta symbol outline |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:51 -> | **Git gutter decorations** | ðŸŸ¡ Parcial | MonacoEditorPro tem `GitChange[]` type, falta renderizaÃ§Ã£o inline |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:52 -> | **Debug panel** | ðŸŸ¡ Parcial | [DebugPanel.tsx](../components/ide/DebugPanel.tsx) (813 linhas) tem UI, falta integraÃ§Ã£o DAP completa |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:57 -> | Feature | Prioridade | EsforÃ§o | Notas |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:59 -> | **Breakpoint conditions** | IMPORTANTE | MÃ©dio | Suporte no DAP, falta UI para editar condiÃ§Ãµes |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:60 -> | **Watch expressions** | IMPORTANTE | MÃ©dio | DebugPanel tem estrutura, falta implementaÃ§Ã£o real |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:89 -> | **Hot reload** | ðŸŸ¡ Parcial | [hot-reload-server.ts](../lib/hot-reload/hot-reload-server.ts) existe, falta integraÃ§Ã£o blueprint |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:93 -> **Nenhuma feature core estÃ¡ faltando!** ðŸŽ‰
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:99 -> ### ðŸ”´ CRÃTICO (Sem isso nÃ£o parece profissional)
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:101 -> | # | Feature | Categoria | EsforÃ§o | Impacto |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:107 -> **Justificativa:** SÃ£o elementos visuais que usuÃ¡rios de VS Code esperam ver imediatamente. A ausÃªncia deles faz a IDE parecer "incompleta".
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:111 -> | # | Feature | Categoria | EsforÃ§o | Impacto |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:113 -> | 4 | **Debug Breakpoint Conditions** | VS Code | 3-4 dias | MÃ©dio |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:114 -> | 5 | **Watch Expressions** | VS Code | 2-3 dias | MÃ©dio |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:115 -> | 6 | **Call Stack Click Navigation** | VS Code | 1 dia | MÃ©dio |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:116 -> | 7 | **Peek Definition Popup** | VS Code | 2-3 dias | MÃ©dio |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:117 -> | 8 | **Source Control Timeline** | VS Code | 3-4 dias | MÃ©dio |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:118 -> | 9 | **Asset Import Pipeline Visual** | Unreal | 4-5 dias | MÃ©dio |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:120 -> **Justificativa:** Funcionalidades que diferenciam uma IDE profissional de um editor bÃ¡sico. Desenvolvedores sÃ©rios precisam dessas ferramentas.
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:124 -> | # | Feature | Categoria | EsforÃ§o | Impacto |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:127 -> | 11 | **Problem Matchers AvanÃ§ados** | VS Code | 2-3 dias | Baixo |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:133 -> ## 4ï¸âƒ£ ANÃLISE DE COMPONENTES EXISTENTES
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:141 -> âœ… FileExplorerPro.tsx    - Explorer avanÃ§ado
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:142 -> âœ… GitPanelPro.tsx        - Git avanÃ§ado
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:149 -> âœ… CodeEditor.tsx         - Editor bÃ¡sico
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:151 -> âœ… InlineEditModal.tsx    - EdiÃ§Ã£o inline
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:190 -> | Sistema | Linhas de CÃ³digo | Qualidade |
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:212 -> **Total de linhas core:** ~16,000+ linhas de cÃ³digo funcional
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:218 -> ### Semana 1: Features CrÃ­ticas
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:229 -> - Adicionar modal para editar condiÃ§Ãµes
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:245 -> A **Aethel IDE** estÃ¡ em um estado **muito avanÃ§ado** com ~84% das features principais implementadas.
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:250 -> - âœ… CÃ³digo de alta qualidade (arquivos de 1000+ linhas bem estruturados)
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:251 -> - âœ… Monaco Editor com customizaÃ§Ãµes avanÃ§adas
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:255 -> - âš ï¸ Breadcrumbs e Git Gutter sÃ£o gaps visuais importantes
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:256 -> - âš ï¸ Algumas integraÃ§Ãµes LSP/DAP incompletas
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:260 -> - **Prioridade:** Features CRÃTICAS primeiro
- docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md:264 -> *Documento gerado automaticamente via anÃ¡lise de cÃ³digo*
