# Fluxo Criativo IA "Perfeição" na IDE

_Este guia descreve como orquestrar a criação de filmes, jogos, apps e sites dentro da nossa IDE com máxima qualidade, alinhando agentes, ferramentas e automações._

## Objetivos centrais
- **Consistência multimídia:** mesma narrativa/estilo entre roteiro, assets 2D/3D, código e copy.
- **Zero retrabalho:** cada fase valida automaticamente (lint, testes, QA visual, avaliação humana assistida).
- **Governança & versionamento:** toda ação rastreável (telemetria `request.*` + billing + snapshots visuais/áudio).
- **Entrega multi-plataforma:** pipelines que exportam para web, mobile, desktop, engines (Unreal, Godot) e players de vídeo.

## Requisitos por domínio
| Domínio | Saídas principais | Testes automáticos | Ferramentas IA recomendadas |
| --- | --- | --- | --- |
| Filmes | Roteiro, storyboard, animatics, áudio, grade HDR | Verificação de tempo total, checagem de censura/moderação, sync áudio-vídeo | LLM roteiro (Claude/GPT), Stable Diffusion/SDXL para frames, ElevenLabs/Coqui para voz, ffmpeg pipeline |
| Jogos | Documento de game design (GDD), níveis, scripts, assets 3D | Testes de gameplay automatizados (Godot/Unreal headless), validação física, lint de scripts | MCP Playwright + Godot CLI, Blender via USD export, Physics verifier (`physics.js`) |
| Apps | API spec, frontend, backend, infra IaC | Jest/vitest, Playwright, contract tests, IaC lint | AI agent orquestrador + scaffolding (Yeoman), OpenAPI + codegen |
| Sites | Layout responsivo, CMS seeding, SEO assets | Lighthouse, axe, Playwright visual diff | Webflow export adapters, `tools/ide/ui-audit` |

## Fases do workflow
1. **Discovery & Briefing sincronizado**
   - Input: requisitos do cliente, referências visuais/sonoras.
   - Agentes: "ResearchAgent" (busca docs, extrai insights) + "ScopeAgent" (gera user stories e checklist P0/P1).
   - Output: `docs/briefings/<project>.md` + backlog no Theia tasks panel.
2. **Narrativa & Design Systems**
   - LLMs criam roteiro/GDD/wireframes seguindo bibliotecas de prompts em `packages/ai-ide/.../prompt-fragments`.
   - Ferramenta `ModelAliasesConfigurationWidget` mapeia modelos específicos (ex.: `film-story>claude-opus`).
3. **Protótipo executável**
   - Para apps/sites: geradores de boilerplate (Next.js/Expo) usando `AIToolsConfigurationWidget`.
   - Para jogos: scripts Godot/Unreal acionados via MCP server listado em `AIMCPConfigurationWidget`.
   - Para filmes: geração de storyboard (png) e animatic (mp4) rendidos por pipeline Blender/ffmpeg.
4. **Asset & código refinado**
   - Agente "Creator" itera sobre cenas/telas/níveis chamando ferramentas especializadas (ex.: `tools/physics.js` para validação).
   - `BillingAdminWidget` acompanha custo/token.
5. **Integração & simulação**
   - CI dispara `npm run test:ai-ide`, TypeScript checks, Playwright, smoke Godot (`build/godot-cpp.sln`) e verificadores personalizados (`verifier.js`).
   - Visual regression via `tools/ide/visual-regression` + `docs/ai-ui-map.md`.
6. **Qualidade & moderação**
   - Moderation pipeline (planejado em `docs/ai-agent-architecture.md`) filtra conteúdo ofensivo antes de publicar.
   - Testes axe/Lighthouse (`tools/ide/ui-audit`) para web, e2e VR para jogos, revisão humana com resumo gerado por `diagnostics/` scripts.
7. **Entrega & aprendizado**
   - Export para plataformas (App Stores, Web deploy, Film render farm) com scripts versionados em `tools/`.
   - Telemetria e billing registrados, insights arquivados em `docs/retros/<project>.md`.

## Stack recomendada (baixar/alinhações)
- **Modelos/Providers:** OpenAI GPT-4.1, Claude Opus/Sonnet, SDXL/AnimateDiff, LumaLabs (vídeo 3D), Runway Gen-3.
- **Ferramentas locais:**
  - `tools/llm-mock` (dev offline), `physics.js` + `physics_adv.test.js` para validação de simulações.
  - Blender + plugins USD, Godot 4 CLI, Unreal Automation Tool (UAT), ffmpeg, Audacity para pós de áudio.
- **Recursos adicionais:**
  - Bancos de referências (PureRef boards), bibliotecas de SFX/Musics sem royalties.
  - Plugins Theia customizados: binding para Notion/Jira, painel de controle de assets.

## Automação & agentes
- **Orchestrator** (vide `docs/ai-agent-architecture.md`): decide prompts, escolhe providers e distribui tasks.
- **Tool Agents:** wrappers MCP (Playwright, Godot, Blender) com limites de tempo/CPU.
- **Reviewer Agent:** lê diffs e resultados de testes, sugere correções.
- **Release Agent:** coleta artefatos, atualiza changelog, dispara workflows (`ci.yml`, `ci-playwright.yml`, pipelines de render/build`).

## Garantias de qualidade
- Cada etapa gera artefatos verificáveis (test results, screenshots, trechos de áudio).
- `npm run diagnostics:playwright` + `diagnostics/PLAYWRIGHT_SUMMARY.txt` anexados em PRs.
- Checklists de moderação (texto, imagem, áudio) executados antes de liberar assets públicos.
- Observabilidade centralizada: eventos `request.start/progress/end`, `billing.event` e `tool.run` alimentam dashboards.

## Próximos passos
1. Implementar o pipeline de moderação + streaming descrito em `docs/ai-agent-architecture.md` para suportar feedback em tempo real durante as fases 2 a 5.
2. Automatizar exportações:
   - Scripts para render (ffmpeg/blender) em `tools/render/`.
   - Workflow GitHub Actions para empacotar builds de jogos/apps.
3. Criar templates de projeto (film/game/app/site) com tasks predefinidas e ganchos de validação.
4. Documentar playbooks específicos (ex.: "Como gerar um trailer" / "Como publicar app mobile") dentro de `docs/playbooks/`.

Com esse fluxo, cada produto criativo nasce dentro da IDE com rastreabilidade, verificações automáticas e a flexibilidade necessária para iterar rapidamente sem perder qualidade.
