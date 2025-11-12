# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🔧 Fixed
- Corrigidos imports incorretos em `aethel_router.py`
- Corrigido `AethelLauncher.ps1` para apontar para diretórios corretos
- Adicionado `conftest.py` para corrigir testes quebrados

### 📝 Added
- Adicionado README.md principal
- Adicionado CONTRIBUTING.md
- Adicionado LICENSE (Apache 2.0)
- Adicionado CHANGELOG.md
- Adicionado análise completa do projeto (`ANALISE_COMPLETA_PROJETO_2025.md`)

### 📝 CI / Infra
- 2025-11-01: Melhorias de confiabilidade do CI: adicionada mock CI (`tools/ci/ci-mock.js`) e hardening das esperas/health checks para reduzir flakiness do Playwright.
- 2025-11-01: Adicionado verificador determinístico e helpers de física em `tools/llm-mock` com testes unitários para cobrir casos de borda.
- 2025-11-01: Documentação de reprodução local do CI adicionada em `docs/CI_LOCAL.md` e scripts de diagnóstico em `tools/ci/`.

## [0.2.0] - 2025-01-15

### ✨ Added
- **MemoryEngine**: Sistema de memória avançado com SQLite + embeddings
- **Multi-Agent System**: 5 agentes especializados (Code, Content, QA, Infra, Critic)
- **Desktop IDE**: AethelIDE.exe compilado (183.54 MB)
- **Web Portal**: Next.js 14.2.5 com 10+ rotas
- **VSCode Extension**: 12 comandos únicos implementados
- **Unreal Plugin**: 90+ arquivos C++ fonte
- **Visual Scripting**: Godot forks integrados
- **Photogrammetry**: AliceVision fork

### 🔧 Fixed
- Correções críticas no backend (imports, async/sync)
- Correções na extensão VSCode (template literals, tipos)
- Locking SQLite no Windows

### 📝 Documentation
- Master Plan V2 completo
- Technical Plan MVP
- Status Final (100% pronto para execução)
- Interface Unified Map
- Master Roadmap 2025 (18 meses)
- 5 Propostas Técnicas detalhadas
- Approved Packages Checklist (58 pacotes)

## [0.1.0] - 2024-12-01

### ✨ Added
- **Backend Core**: FastAPI com SQLAlchemy
- **Frontend Core**: Next.js com Tailwind CSS
- **Theia Fork**: 78 packages com AI integrations
- **Basic Authentication**: JWT + bcrypt
- **Basic Billing**: Stripe integration skeleton
- **AI Providers**: OpenAI, Anthropic, Google, Ollama, HuggingFace

### 📝 Documentation
- Documentação inicial
- Setup guides
- Architecture overview

## [0.0.1] - 2024-10-01

### ✨ Added
- Estrutura inicial do projeto
- Configuração de repositório
- Planejamento estratégico

---

## Tipos de Mudanças

- `✨ Added` - Novas funcionalidades
- `🔧 Fixed` - Correções de bugs
- `🔄 Changed` - Mudanças em funcionalidades existentes
- `🗑️ Deprecated` - Funcionalidades que serão removidas
- `❌ Removed` - Funcionalidades removidas
- `🔒 Security` - Correções de segurança
- `📝 Documentation` - Mudanças na documentação
- `⚡ Performance` - Melhorias de performance

---

[Unreleased]: https://github.com/aethel-ide/aethel/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/aethel-ide/aethel/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/aethel-ide/aethel/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/aethel-ide/aethel/releases/tag/v0.0.1