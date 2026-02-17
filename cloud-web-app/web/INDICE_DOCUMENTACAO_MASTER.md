# 📚 ÍNDICE MASTER DE DOCUMENTAÇÃO - AETHEL ENGINE
**Data:** 21 de Janeiro de 2026  
**Versão:** 0.3.0  
**Propósito:** Consolidar toda documentação e estrutura do Aethel Engine

---

## DOCUMENTO CANONICO (ATUAL)

### audit dicas do emergent usar/00_FONTE_CANONICA.md
Localizacao: `audit dicas do emergent usar/00_FONTE_CANONICA.md`
Status: CANONICO
Ultima atualizacao: 2026-02-04

Este arquivo (e o audit folder) e a unica fonte de verdade para estado atual.
Use tambem: `audit dicas do emergent usar/00_REALITY_MATRIX_2026-02-04.md`

---

## 🗂️ ESTRUTURA COMPLETA DO PROJETO

```
c:\Users\omega\Desktop\aethel engine\
└── meu-repo\
    ├── cloud-web-app\
    │   └── web\                          ← 🎯 PROJETO PRINCIPAL
    │       ├── app/                       ← Next.js App Router (50+ rotas)
    │       ├── components/                ← React Components (100+ componentes)
    │       ├── lib/                       ← Bibliotecas core (150+ arquivos)
    │       ├── hooks/                     ← React Hooks customizados
    │       ├── contexts/                  ← React Contexts
    │       ├── workers/                   ← Web Workers (Nanite, Physics)
    │       ├── tests/                     ← Testes Vitest (232 passando)
    │       ├── prisma/                    ← Schema do banco de dados
    │       ├── public/                    ← Assets estáticos
    │       ├── styles/                    ← CSS/Tailwind
    │       ├── server/                    ← Server-side code
    │       ├── scripts/                   ← Scripts de utilidade
    │       └── docs/                      ← Documentação local
    │
    ├── infra/                             ← Kubernetes/Docker configs
    ├── client/                            ← Desktop client (Tauri)
    ├── shared/                            ← Código compartilhado
    └── docs/                              ← Documentação geral
```

---

## 📱 PÁGINAS DA APLICAÇÃO (app/)

### Páginas Públicas (AAA Design)
| Rota | Arquivo | Status | Descrição |
|------|---------|--------|-----------|
| `/` | `app/(landing)/page.tsx` | ✅ AAA | Landing page com hero, features, pricing preview |
| `/login` | `app/(auth)/login/page.tsx` | ✅ AAA | Login com OAuth (GitHub, Google, Discord) |
| `/register` | `app/(auth)/register/page.tsx` | ✅ AAA | Registro split-screen com seletor de plano |
| `/pricing` | `app/pricing/page.tsx` | ✅ AAA | Tabela de preços Hobby/Pro/Enterprise |
| `/contact-sales` | `app/contact-sales/page.tsx` | ✅ AAA | Formulário para enterprise |
| `/status` | `app/status/page.tsx` | ✅ AAA | Status do sistema em tempo real |
| `/404` | `app/not-found.tsx` | ✅ AAA | Página de erro 404 |

### Páginas Autenticadas (Funcionais)
| Rota | Arquivo | Status | Descrição |
|------|---------|--------|-----------|
| `/dashboard` | `app/dashboard/page.tsx` | ✅ Funcional | Dashboard principal (3500+ linhas) |
| `/profile` | `app/profile/page.tsx` | ✅ Funcional | Perfil do usuário com 2FA |
| `/settings` | `app/settings/page.tsx` | ✅ AAA | Configurações com tabs |
| `/download` | `app/download/page.tsx` | ✅ AAA | Download desktop com auto-detect |
| `/billing` | `app/billing/page.tsx` | ✅ Funcional | Gerenciamento de assinatura |
| `/admin` | `app/admin/page.tsx` | ⚠️ Básico | Painel administrativo |

### Editores Especializados
| Rota | Arquivo | Status | Descrição |
|------|---------|--------|-----------|
| `/ide` | `app/ide/page.tsx` | ✅ Funcional | IDE completa com Monaco |
| `/blueprint-editor` | `app/blueprint-editor/page.tsx` | ✅ Funcional | Editor visual scripting |
| `/animation-blueprint` | `app/animation-blueprint/page.tsx` | ✅ Funcional | Editor de animação |
| `/level-editor` | `app/level-editor/page.tsx` | ✅ Funcional | Editor de níveis 3D |
| `/landscape-editor` | `app/landscape-editor/page.tsx` | ✅ Funcional | Editor de terreno |
| `/niagara-editor` | `app/niagara-editor/page.tsx` | ✅ Funcional | Editor de partículas |
| `/debugger` | `app/debugger/page.tsx` | ✅ Funcional | Debugger integrado |
| `/terminal` | `app/terminal/page.tsx` | ✅ Funcional | Terminal PTY |

### APIs (app/api/)
| Rota | Métodos | Status | Descrição |
|------|---------|--------|-----------|
| `/api/auth/*` | ALL | ✅ | Autenticação JWT + OAuth |
| `/api/projects/*` | CRUD | ✅ | Gerenciamento de projetos |
| `/api/ai/*` | POST | ✅ | AI multi-provider |
| `/api/billing/*` | ALL | ✅ | Stripe integration |
| `/api/jobs/*` | CRUD | ✅ | Fila de jobs async |
| `/api/onboarding/*` | GET/PUT | ✅ | Onboarding do usuário |
| `/api/marketplace/*` | GET | ⚠️ Mock | Retorna [] (sem backend) |
| `/api/build/*` | POST | ⚠️ Mock | Builds são simulados |

---

## 🧩 COMPONENTES PRINCIPAIS (components/)

### Layout & Navigation
| Componente | Arquivo | Linhas | Descrição |
|------------|---------|--------|-----------|
| AethelDashboard | `AethelDashboard.tsx` | ~3500 | Dashboard principal completo |
| AethelIDE | `app/ide/page.tsx` + `components/ide/IDELayout.tsx` | canônico | IDE layout com painéis |
| AethelHeaderPro | `AethelHeaderPro.tsx` | ~300 | Header com navegação |
| AdminPanel | `AdminPanel.tsx` | ~800 | Painel de administração |

### Editor
| Componente | Pasta | Descrição |
|------------|-------|-----------|
| MonacoEditorPro | `editor/` | Monaco editor customizado |
| CommandPalette | `components/ide/CommandPalette.tsx` | Paleta de comandos (Ctrl+Shift+P) |
| SearchReplace | `SearchReplace.tsx` | Busca e substituição |
| SnippetManager | `snippets/` | Gerenciador de snippets |

### AI
| Componente | Pasta | Descrição |
|------------|-------|-----------|
| AICommandCenter | `ai/` | Central de comandos AI |
| SquadChat | `ai/` | Chat com equipe de agentes |
| AIThinkingPanel | `ai/` | Visualização do raciocínio |
| DirectorNotePanel | `ai/` | Notas do diretor |

### 3D/Engine
| Componente | Pasta | Descrição |
|------------|-------|-----------|
| LivePreview | `LivePreview.tsx` | Preview 3D em tempo real |
| VRPreview | `VRPreview.tsx` | Preview VR/AR |
| TerrainEditor | `terrain/` | Editor de terreno |
| ParticleEditor | `visual-scripting/` | Editor de partículas |

### Colaboração
| Componente | Pasta | Descrição |
|------------|-------|-----------|
| Collaboration | `collaboration/` | Cursor awareness |
| TimeMachineSlider | `collaboration/` | Histórico de versões |
| MergeConflictResolver | `MergeConflictResolver.tsx` | Resolução de conflitos |

### Billing
| Componente | Pasta | Descrição |
|------------|-------|-----------|
| BillingTab | `dashboard/tabs/` | Aba de faturamento |
| PricingCards | `billing/` | Cards de preços |
| CheckoutForm | `billing/` | Formulário Stripe |

---

## 📚 BIBLIOTECAS CORE (lib/)

### Engine Core (~15 arquivos)
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `aethel-engine.ts` | ~500 | Engine principal |
| `game-engine-core.ts` | ~800 | Game loop e sistemas |
| `game-loop.ts` | ~300 | Loop de atualização |
| `ecs-dots-system.ts` | ~600 | Entity Component System |
| `gameplay-ability-system.ts` | ~950 | Sistema de abilities (GAS) |

### Física (~10 arquivos)
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `physics-engine-real.ts` | ~500 | Rapier WASM ativo ✅ |
| `cloth-simulation.ts` | ~300 | Simulação de tecido |
| `fluid-simulation-system.ts` | ~400 | Simulação de fluidos SPH |
| `destruction-system.ts` | ~350 | Sistema de destruição |

### Rendering (~12 arquivos)
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `aaa-render-system.ts` | ~800 | Pipeline de render AAA |
| `ray-tracing.ts` | ~600 | Ray tracing (BVH não integrado) ⚠️ |
| `nanite-virtualized-geometry.ts` | ~1000 | LOD virtualizado |
| `pbr-shader-pipeline.ts` | ~400 | Shaders PBR |
| `volumetric-clouds.ts` | ~350 | Nuvens volumétricas |
| `water-ocean-system.ts` | ~400 | Sistema de água/oceano |
| `post-process-volume.ts` | ~300 | Pós-processamento |

### AI (~15 arquivos)
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `ai-service.ts` | ~600 | Serviço multi-provider |
| `ai-agent-system.ts` | ~800 | Sistema de agentes |
| `ai-3d-generation-system.ts` | ~400 | Geração 3D procedural |
| `ai-audio-engine.ts` | ~350 | Áudio via IA |
| `ai-content-generation.ts` | ~500 | Geração de conteúdo |

### Networking (~8 arquivos)
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `networking-multiplayer.ts` | ~1300 | Multiplayer completo |
| `yjs-collaboration.ts` | ~400 | Yjs CRDT |
| `pixel-streaming.ts` | ~950 | WebRTC streaming |

### Build (~5 arquivos)
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `build/build-pipeline.ts` | ~600 | Pipeline (mock desktop/mobile) ⚠️ |
| `asset-pipeline.ts` | ~400 | Pipeline de assets |
| `asset-import-pipeline.ts` | ~350 | Import de assets |

### Auth & Billing (~6 arquivos)
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `auth.ts` | ~300 | Auth client-side |
| `auth-server.ts` | ~400 | Auth server-side |
| `stripe.ts` | ~500 | Stripe integration |
| `credit-wallet.ts` | ~300 | Sistema de créditos |

### i18n (~3 arquivos)
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `translations.ts` | ~1700 | Traduções PT-BR/EN |
| `i18n.ts` | ~50 | Config i18n |
| `localization-system.ts` | ~200 | Sistema de localização |

---

## 🔧 WEB WORKERS (workers/)

| Worker | Arquivo | Descrição |
|--------|---------|-----------|
| Nanite Worker | `nanite-worker.ts` | Geometria off-thread (~670 linhas) |
| Physics Worker | `physics-worker.ts` | Física off-thread (~600 linhas) |

---

## ✅ O QUE FUNCIONA (REAL)

### Core
- ✅ Monaco Editor com IntelliSense
- ✅ Terminal PTY real (node-pty)
- ✅ Git operations reais
- ✅ File system API
- ✅ WebSocket collaboration (Yjs)

### AI Multi-Provider
- ✅ OpenAI GPT-4o/o3
- ✅ Anthropic Claude 3/4
- ✅ Google Gemini
- ✅ Groq (Llama/Mixtral)
- ✅ Ghost text autocomplete

### Física
- ✅ Rapier WASM ativo
- ✅ Cloth simulation (Verlet)
- ✅ Fluid simulation (SPH)
- ✅ Basic destruction

### Billing
- ✅ Stripe SDK completo
- ✅ Checkout sessions
- ✅ Webhooks funcionais
- ✅ Customer portal

### Auth
- ✅ JWT authentication
- ✅ OAuth: GitHub, Google, Discord
- ✅ 2FA support
- ✅ Session management

### Onboarding
- ✅ WelcomeModal
- ✅ OnboardingChecklist
- ✅ API funcional

---

## ❌ O QUE NÃO FUNCIONA (MOCK/PLACEHOLDER)

| Feature | Problema | Arquivo | Solução |
|---------|----------|---------|---------|
| **Build Desktop** | Sem Electron | `lib/build/build-pipeline.ts` | Instalar electron + electron-builder |
| **Build Mobile** | Sem Capacitor | `lib/build/build-pipeline.ts` | Instalar @capacitor/core |
| **Shader Graph** | Retorna MAGENTA | `lib/materials/aaa-material-system.ts` | Implementar compilador GLSL |
| **Ray Tracing** | BVH não usado | `lib/ray-tracing.ts` | Serializar BVH para shader |
| **Nanite Render** | VisibilityBuffer stub | `lib/nanite/visibility-buffer.ts` | Implementar software rasterization |
| **Marketplace** | Retorna [] | `app/api/marketplace/route.ts` | Configurar S3 + backend |
| **3D Generation** | Fallback procedural | `lib/ai/3d-generation/` | Integrar API (Shap-E) |

---

## 🚀 O QUE FALTA FAZER (PRIORIZADO)

### 🔴 Prioridade CRÍTICA (Bloqueia produção)
| Item | Esforço | Impacto | Notas |
|------|---------|---------|-------|
| Build Desktop (Electron) | 2-3 dias | Alto | Instalar packages + configurar |
| Build Mobile (Capacitor) | 2-3 dias | Alto | Instalar packages + configurar |
| Liberar espaço disco | 30 min | Crítico | Build requer 3GB+ |

### 🟠 Prioridade ALTA (Funcionalidade core)
| Item | Esforço | Impacto | Notas |
|------|---------|---------|-------|
| Shader Graph real | 1 semana | Médio | Compilador GLSL |
| Ray Tracing BVH | 3-5 dias | Médio | Integrar BVH no shader |
| Marketplace backend | 1 semana | Alto | S3 + upload/download |
| Testes E2E | 3-5 dias | Alto | Cobertura de fluxos críticos |

### 🟡 Prioridade MÉDIA (Melhoria)
| Item | Esforço | Impacto | Notas |
|------|---------|---------|-------|
| Dashboard UI AAA | 2-3 dias | Médio | Melhorar visual |
| Profile UI AAA | 1-2 dias | Médio | Alinhar com design system |
| Nanite real | 2 semanas | Baixo | Complexo, pode esperar |
| 3D Generation API | 3-5 dias | Médio | Integrar Shap-E |

### 🟢 Prioridade BAIXA (Nice to have)
| Item | Esforço | Impacto | Notas |
|------|---------|---------|-------|
| VR Preview melhorado | 1 semana | Baixo | Poucos usuários |
| Multi-language expansion | 3-5 dias | Baixo | Já tem PT-BR/EN |
| Analytics dashboard | 2-3 dias | Baixo | Métricas internas |

---

## 📊 MÉTRICAS ATUAIS

| Métrica | Valor | Status |
|---------|-------|--------|
| TypeScript Errors | 0 | ✅ |
| ESLint Errors | 0 | ✅ |
| Testes Passando | 232 | ✅ |
| Componentes React | 100+ | ✅ |
| Arquivos em lib/ | 150+ | ✅ |
| Rotas de API | 44+ | ✅ |
| Páginas | 50+ | ✅ |
| Linhas de código | ~50.000+ | ✅ |

---

## 🔐 VARIÁVEIS DE AMBIENTE

```env
# Auth
JWT_SECRET=
NEXTAUTH_SECRET=

# OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Database
DATABASE_URL=postgresql://...

# AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
GROQ_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Storage (para marketplace)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=
```

---

## 📁 DOCUMENTAÇÃO HISTÓRICA (ARQUIVAR)

Os seguintes 200+ arquivos MD são **HISTÓRICOS** e não refletem estado atual:

### Podem ser deletados/arquivados:
- `*_FINAL*.md` - Relatórios finais antigos
- `*_COMPLETO*.md` - Análises completas antigas
- `*_2025-*.md` - Docs de 2025
- `PLANO_*.md` - Planos já executados
- `ANALISE_*.md` - Análises antigas
- `AUDITORIA_*.md` - Auditorias antigas
- `ALINHAMENTO_*.md` - Alinhamentos resolvidos

### Manter:
- ✅ `FONTE_DA_VERDADE.md` (único documento de referência)
- ✅ `INDICE_DOCUMENTACAO_MASTER.md` (este arquivo)
- ✅ `README.md` (raiz)
- ✅ `CONTRIBUTING.md`
- ✅ `SECURITY.md`
- ✅ `CHANGELOG.md`
- ✅ `ARQUITETURA.md`

---

## 🛠️ COMANDOS ÚTEIS

```bash
# Navegar para o projeto
cd "c:\Users\omega\Desktop\aethel engine\meu-repo\cloud-web-app\web"

# Verificar TypeScript
npx tsc --noEmit

# Rodar testes
npx vitest run

# ESLint
npm run lint

# Dev server
npm run dev

# Build (requer 3GB+ disco)
npm run build

# Limpar cache
rm -rf .next node_modules/.cache
```

---

## 📝 NOTAS PARA CONTINUIDADE

1. **Use VITEST, não Jest** - jest.config.js foi removido
2. **Monaco Editor** - precisa dynamic import no Next.js
3. **Hooks 'use client'** - não misturar com server components
4. **Rotas dinâmicas** - usar nome consistente ([id] vs [projectId])
5. **Build desktop/mobile são mock** - código existe mas não funciona
6. **Yjs requer servidor** - websocket para colaboração real
7. **Espaço em disco** - build precisa de 3GB+

---

## 🏷️ STACK TÉCNICA

| Categoria | Tecnologia | Versão |
|-----------|------------|--------|
| Runtime | Node.js | 18+ |
| Framework | Next.js | 14.2.35 |
| UI | React | 18 |
| Linguagem | TypeScript | 5.x |
| CSS | Tailwind CSS | 3.x |
| 3D | Three.js | Latest |
| Física | Rapier | WASM |
| Editor | Monaco | Latest |
| Collab | Yjs | Latest |
| Database | Prisma + PostgreSQL | - |
| Pagamento | Stripe | Latest |

---

*Documento mantido por GitHub Copilot (Claude Opus 4.5)*  
*Última atualização: 21 de Janeiro de 2026*
