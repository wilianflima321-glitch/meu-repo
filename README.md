# 🚀 Aethel Engine - Game Development Platform

> IMPORTANT: This README is historical. Canonical source of truth:
> `audit dicas do emergent usar/00_FONTE_CANONICA.md`
> Validation log: `audit dicas do emergent usar/00_REALITY_MATRIX_2026-02-04.md`


**Status**: UNVERIFIED (see Reality Matrix)  
**Version**: 0.3.0  
**Date**: 21 de Janeiro de 2026  
**Lines of Code**: 70,000+  
**Tests**: UNVERIFIED (see Reality Matrix)

Uma plataforma cloud-native completa para desenvolvimento de jogos, apps e filmes. Construída com Next.js 14, React 18, TypeScript, Three.js, Rapier WASM e IA multi-provider.

> Documento Canonico: `audit dicas do emergent usar/00_FONTE_CANONICA.md`
> Reality Matrix: `audit dicas do emergent usar/00_REALITY_MATRIX_2026-02-04.md`

---

## ⚡ INÍCIO RÁPIDO

```bash
# 1. Clonar repositório
git clone https://github.com/wilianflima321-glitch/meu-repo.git
cd meu-repo/cloud-web-app/web

# 2. Instalar dependências
npm install

# 3. Iniciar servidor de desenvolvimento
npm run dev

# 4. Abrir no navegador
# http://localhost:3000
```

---

## 🎯 FEATURES PRINCIPAIS

### ✅ IDE/Editor
- Monaco Editor com syntax highlighting
- Terminal PTY real (node-pty)
- Git integration (operações reais)
- Multi-tab editing
- Command Palette

### ✅ AI/Copilot Multi-Provider
- OpenAI GPT-4o/o3
- Anthropic Claude 3/4
- Google Gemini
- Groq (Llama/Mixtral)
- Ghost text autocomplete
- Agent system com task execution

### ✅ Colaboração Real-Time
- Yjs CRDT para sync
- WebSocket + WebRTC
- Cursor awareness
- Rollback netcode para games

### ✅ Motor de Física
- Rapier WASM (motor real)
- Cloth simulation (Verlet)
- Fluid simulation (SPH)
- Basic destruction

### ✅ Billing & Auth
- Stripe SDK completo
- JWT + OAuth (GitHub, Google, Discord)
- Session management

---

## 🏗️ ARQUITETURA

```
cloud-web-app/
└── web/                      ← PROJETO PRINCIPAL
    ├── app/                   ← Next.js App Router
    │   ├── (auth)/            ← Login, Register AAA
    │   ├── (landing)/         ← Landing page AAA
    │   ├── dashboard/         ← Dashboard principal
    │   ├── pricing/           ← Pricing AAA
    │   └── api/               ← API Routes
    ├── components/            ← React Components (85+)
    ├── lib/                   ← Core libraries (120+)
    ├── hooks/                 ← React Hooks
    ├── contexts/              ← React Contexts
    └── tests/                 ← Vitest tests
```

---

## 📊 COMANDOS

```bash
cd cloud-web-app/web

# Verificar TypeScript
npx tsc --noEmit

# Executar testes
npx vitest run

# Verificar ESLint
npm run lint

# Dev server
npm run dev

# Build (requer 3GB+ livre)
npm run build
```

---

## 🎨 DESIGN SYSTEM AAA

O projeto inclui um design system profissional com classes `.aethel-*`:

- **Layouts:** `.aethel-dashboard`, `.aethel-sidebar`, `.aethel-header`
- **Cards:** `.aethel-card`, `.aethel-card-hover`
- **Buttons:** `.aethel-button-primary/secondary/ghost/danger`
- **Inputs, Badges, Modals, Tooltips, etc.**

### Páginas AAA Prontas
| Página | Status |
|--------|--------|
| Landing | ✅ AAA |
| Login | ✅ AAA |
| Register | ✅ AAA |
| Pricing | ✅ AAA |
| 404 | ✅ AAA |
| Status | ✅ AAA |
| Contact Sales | ✅ AAA |

---

## 🔐 VARIÁVEIS DE AMBIENTE

Copie `.env.example` para `.env.local` e configure:

```env
# Auth
JWT_SECRET=xxx
NEXTAUTH_SECRET=xxx

# OAuth
GITHUB_CLIENT_ID=xxx
GOOGLE_CLIENT_ID=xxx
DISCORD_CLIENT_ID=xxx

# Database
DATABASE_URL=postgresql://...

# AI
OPENAI_API_KEY=xxx
ANTHROPIC_API_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=xxx
```

---

## 📚 DOCUMENTAÇÃO

- **Estado Canonico:** [FONTE_DA_VERDADE.md](audit dicas do emergent usar/00_FONTE_CANONICA.md)
- **Índice Docs:** [INDICE_DOCUMENTACAO_MASTER.md](cloud-web-app/web/INDICE_DOCUMENTACAO_MASTER.md)
- **Contribuição:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Segurança:** [SECURITY.md](SECURITY.md)

---

## ⚠️ LIMITAÇÕES CONHECIDAS

| Feature | Status | Solução |
|---------|--------|---------|
| Build Desktop | ❌ Mock | Instalar Electron |
| Build Mobile | ❌ Mock | Instalar Capacitor |
| Shader Graph | ❌ Placeholder | Implementar GLSL |
| Marketplace | ❌ Retorna [] | Configurar S3/R2 |

---

## 🏷️ TECNOLOGIAS

- **Framework:** Next.js 14.2.35
- **UI:** React 18, Tailwind CSS
- **3D:** Three.js, React Three Fiber
- **Física:** Rapier WASM
- **Colaboração:** Yjs, WebSocket, WebRTC
- **Editor:** Monaco Editor
- **Auth:** JWT, OAuth
- **Billing:** Stripe SDK
- **AI:** OpenAI, Anthropic, Google, Groq

---

## 📌 Relatórios e Auditorias
- Relatório de Continuação — Auditoria Multi‑Agente: [audit%20dicas%20do%20emergent%20usar/Relatorio_de_Continuacao_Auditoria_Multi-Agente.md](audit%20dicas%20do%20emergent%20usar/Relatorio_de_Continuacao_Auditoria_Multi-Agente.md)


## 📝 LICENSE

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

*Atualizado em 21 de Janeiro de 2026 por GitHub Copilot (Claude Opus 4.5)*
- ✅ Roteamento para múltiplos providers LLM (dependente de configuração de chaves)
- ✅ Política real-or-fail (sem “resposta fake” quando não configurado)
- ✅ Superfícies de status/saúde para diagnosticar readiness

### vs. Gitpod
- ✅ Integrações de IA/missões integradas ao fluxo do IDE
- ⚠️ Recursos “planejados” permanecem explicitamente não implementados quando aplicável

### Funcionalidades Únicas
- ✅ Streaming de eventos por WebSocket (inclui `mission.*` para integração)
- ✅ Mission planner/execução por orquestrador (com readiness real)
- ⚠️ Módulos avançados retornam `NOT_IMPLEMENTED` se não houver implementação real

---

## 📞 SUPORTE

- **Documentação**: Veja os .md no diretório raiz
- **Issues**: Abra uma issue no GitHub
- **Guia de Uso**: `GUIA_USO_COMPLETO.md`
- **Troubleshooting**: `examples/browser-ide-app/README.md`
- **Merge Issues**: See `MERGE_UNRELATED_HISTORIES.md` for git merge solutions

---

## 📜 LICENÇA

Apache 2.0

---

## 🎉 STATUS

**Status: real-or-fail (sem mocks)**

- ✅ Backend e integrações expõem estado real (`/api/health`, `/api/status`, WS `mission.*`)
- ✅ Quando algo não está pronto/configurado, falha explicitamente (`501 NOT_IMPLEMENTED`, `503 LLM_NOT_CONFIGURED`)
- ⚠️ Execução de agentes depende de configuração de LLM (envs como `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `DEEPSEEK_API_KEY`)
- ⚠️ Alguns módulos/“agentes” ainda são `NOT_IMPLEMENTED` por design (para não simular capacidade)

**Como validar rapidamente**: `npm run -s test:quick-ai`

---

## 🚀 COMEÇAR AGORA

```bash
npm start
```

Abra `http://localhost:3000` e explore a IDE completa!
