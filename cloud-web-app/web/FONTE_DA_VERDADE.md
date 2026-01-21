# 📋 AETHEL ENGINE - FONTE DA VERDADE
**Última atualização:** 21 de Janeiro de 2026, 23:00 UTC-3  
**Versão:** 0.3.0  
**Branch:** main

> ⚠️ **ATENÇÃO:** Este é o ÚNICO documento de referência para o estado atual do projeto.  
> Todos os outros arquivos `.md` são históricos. Ver [INDICE_DOCUMENTACAO_MASTER.md](INDICE_DOCUMENTACAO_MASTER.md)

---

## 🎯 PROPÓSITO DESTE DOCUMENTO

Este documento serve como referência central para qualquer IA ou desenvolvedor que continue o trabalho neste projeto. Contém o estado atual, decisões arquiteturais, gaps conhecidos e próximos passos.

---

## 📊 STATUS ATUAL

### Métricas de Qualidade
| Métrica | Valor | Status |
|---------|-------|--------|
| TypeScript | 0 erros | ✅ |
| ESLint | 0 erros (warnings ok) | ✅ |
| Testes Vitest | 232 passando | ✅ |
| Build | Funciona (requer 3GB+ disco) | ⚠️ |

### Estrutura do Projeto
```
c:\Users\omega\Desktop\aethel engine\
└── meu-repo\
    └── cloud-web-app\
        └── web\                    ← PROJETO PRINCIPAL
            ├── app/                 ← Next.js App Router
            ├── components/          ← React Components
            ├── lib/                 ← Bibliotecas core
            ├── hooks/               ← React Hooks
            ├── contexts/            ← React Contexts
            ├── tests/               ← Testes (Vitest)
            └── prisma/              ← Schema do banco
```

---

## 🏗️ ARQUITETURA

### Stack Principal
- **Framework:** Next.js 14+ (App Router)
- **Linguagem:** TypeScript (strict mode)
- **UI:** React 18, Tailwind CSS
- **3D:** Three.js, React Three Fiber
- **Física:** Rapier WASM
- **Colaboração:** Yjs, y-websocket, WebRTC
- **Editor:** Monaco Editor
- **Banco:** Prisma + PostgreSQL
- **Auth:** JWT + OAuth (GitHub, Google, Discord)
- **Billing:** Stripe SDK
- **AI:** OpenAI, Anthropic, Google, Groq

### Comandos Principais
```bash
cd "c:\Users\omega\Desktop\aethel engine\meu-repo\cloud-web-app\web"

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

## ✅ O QUE FUNCIONA (REAL, NÃO MOCK)

### IDE/Editor
- ✅ Monaco Editor com syntax highlighting
- ✅ Terminal PTY real (node-pty)
- ✅ Git integration (operações reais)
- ✅ File system API
- ✅ Multi-tab editing
- ✅ Command Palette

### AI/Copilot
- ✅ OpenAI GPT-4o/o3 integration
- ✅ Anthropic Claude 3/4 integration
- ✅ Google Gemini integration
- ✅ Groq (Llama/Mixtral) integration
- ✅ Ghost text autocomplete
- ✅ Agent system com task execution

### Colaboração
- ✅ Yjs CRDT para sync real-time
- ✅ WebSocket (y-websocket)
- ✅ WebRTC para P2P
- ✅ Cursor awareness
- ✅ Rollback netcode para games

### Física
- ✅ Rapier WASM (motor de física real)
- ✅ Cloth simulation (Verlet, CPU)
- ✅ Fluid simulation (SPH, CPU)
- ✅ Basic destruction

### Billing
- ✅ Stripe SDK completo
- ✅ Checkout sessions
- ✅ Webhooks
- ✅ Customer portal
- ✅ Subscription management

### Build Web
- ✅ esbuild bundler real
- ✅ Asset pipeline
- ✅ Code splitting

### Onboarding
- ✅ OnboardingProvider integrado
- ✅ WelcomeModal renderizado
- ✅ OnboardingChecklist renderizado
- ✅ API /api/onboarding funcional

### Auth
- ✅ JWT authentication
- ✅ OAuth: GitHub, Google, Discord
- ✅ Session management
- ✅ Email verification flow

---

## ❌ O QUE NÃO FUNCIONA (MOCK/PLACEHOLDER)

### Build Desktop/Mobile
- ❌ **Sem Electron instalado** - builds desktop retornam sucesso fake
- ❌ **Sem Capacitor instalado** - builds mobile retornam sucesso fake
- 📁 Arquivo: `lib/build/build-pipeline.ts`
- 🔧 Solução: Instalar electron, electron-builder, @capacitor/core

### Shader Graph
- ❌ **Retorna MAGENTA** - placeholder não implementado
- 📁 Arquivo: `lib/materials/aaa-material-system.ts`
- 🔧 Solução: Implementar compilador GLSL real

### Ray Tracing
- ❌ **BVH construído mas não usado** - shader usa geometria hardcoded
- 📁 Arquivo: `lib/rendering/ray-tracing.ts`
- 🔧 Solução: Serializar BVH para texture, atualizar shader

### Nanite
- ❌ **VisibilityBuffer é stub** - não renderiza meshlets
- 📁 Arquivo: `lib/rendering/nanite/visibility-buffer.ts`
- 🔧 Solução: Implementar software rasterization

### Marketplace
- ❌ **Backend retorna []** - sem assets reais
- 📁 Arquivo: `app/api/marketplace/route.ts`
- 🔧 Solução: Configurar S3/R2, implementar upload/download

### 3D Generation
- ⚠️ **Fallback procedural** - não usa APIs de 3D generation pagas
- 📁 Arquivo: `lib/ai/3d-generation/`
- 🔧 Solução: Integrar OpenAI Shap-E ou similar

---

## 📁 ARQUIVOS MODIFICADOS RECENTEMENTE

### Sessão 21/01/2026 - Design AAA Upgrade
1. `app/(auth)/register/page.tsx` - CRIADO - Novo registro AAA com OAuth, split-screen
2. `app/pricing/page.tsx` - REESCRITO - Pricing AAA com tabela comparativa
3. `app/globals.css` - EXPANDIDO - Sistema de design `.aethel-*` (+400 linhas)
4. `app/not-found.tsx` - CRIADO - Página 404 profissional
5. `app/contact-sales/page.tsx` - CRIADO - Formulário enterprise sales
6. `app/status/page.tsx` - CRIADO - Página de status do sistema
7. `app/(landing)/page.tsx` - REESCRITO - Landing page AAA studio-grade
8. `app/(auth)/login/page.tsx` - REESCRITO - Login AAA com Dev Mode

### Sessão 21/01/2026 - Manhã
1. `app/api/projects/[id]/commits/route.ts` - CRIADO (movido de [projectId])
2. `app/api/projects/[projectId]/` - REMOVIDO (conflito de rotas)
3. `lib/rate-limiting.ts` - Removido useQuota hook
4. `lib/hooks/use-quota.ts` - CRIADO (hook client-side)
5. `tsconfig.json` - Adicionado excludes para tests

---

## 🎨 DESIGN SYSTEM AAA

### Classes CSS Globais
O arquivo `app/globals.css` contém um sistema de design profissional:

```css
/* Layouts */
.aethel-dashboard    /* Dashboard container */
.aethel-sidebar      /* Sidebar navigation */
.aethel-header       /* Header com glassmorphism */
.aethel-content-area /* Área de conteúdo principal */

/* Cards */
.aethel-card              /* Card base */
.aethel-card-hover        /* Card com hover effect */
.aethel-card-interactive  /* Card clicável */

/* Buttons */
.aethel-button-primary   /* Botão principal violet */
.aethel-button-secondary /* Botão secundário */
.aethel-button-ghost     /* Botão transparente */
.aethel-button-danger    /* Botão destrutivo */

/* Badges */
.aethel-badge-primary/success/warning/error

/* Inputs */
.aethel-input     /* Input padrão */
.aethel-input-lg  /* Input grande */

/* Componentes */
.aethel-tabs       /* Navegação por tabs */
.aethel-table      /* Tabela de dados */
.aethel-modal      /* Modal overlay */
.aethel-dropdown   /* Dropdown menu */
.aethel-toast      /* Notificação toast */
.aethel-tooltip    /* Tooltip */
.aethel-progress   /* Barra de progresso */

/* Animações */
fadeInUp, shimmer, pulse-glow
```

### Padrão Visual AAA
- Background: `bg-black` ou `bg-slate-900`
- Gradientes: `violet-500 → fuchsia-600`
- Glassmorphism: `bg-black/80 backdrop-blur-xl border-white/5`
- Orbs animados: `blur-[150px]` com cores suaves
- Text: `text-white` com `text-slate-400` para secundário

---

## 🔧 CONFIGURAÇÕES IMPORTANTES

### tsconfig.json - Excludes
```json
{
  "exclude": [
    "node_modules",
    "lib/build/build-pipeline.ts",
    "tests/e2e/**/*",
    "__tests__/**/*"
  ]
}
```

### Vitest vs Jest
- **USE VITEST**, não Jest
- Comando: `npx vitest run`
- O arquivo `jest.config.js` foi removido (conflito)
- Configuração em `vitest.config.ts`

### Espaço em Disco
- Build requer ~3GB livres
- Se falhar com ENOSPC, limpar `.next/` e `node_modules/.cache/`

---

## 🚀 PRÓXIMOS PASSOS PRIORITÁRIOS

### Prioridade 1 - Crítico
1. **Liberar espaço em disco** para builds
2. **Testar flow completo** de registro → dashboard → projeto

### Prioridade 2 - Funcionalidade
1. **Implementar Electron** para desktop builds
2. **Implementar Capacitor** para mobile builds
3. **Corrigir Shader Graph** - substituir placeholder por GLSL real

### Prioridade 3 - Qualidade
1. **Integrar BVH no ray tracing**
2. **Implementar marketplace backend** com S3
3. **Adicionar mais testes E2E**

---

## 📂 ARQUIVOS-CHAVE PARA REFERÊNCIA

| Propósito | Arquivo |
|-----------|---------|
| API Client | `lib/api.ts` |
| Auth Server | `lib/auth-server.ts` |
| Auth Client | `lib/auth.ts` |
| Physics | `lib/physics/physics-engine-real.ts` |
| Collaboration | `lib/collaboration/collaboration-manager.ts` |
| AI Service | `lib/ai/ai-service.ts` |
| Build Pipeline | `lib/build/build-pipeline.ts` |
| Billing | `lib/billing/stripe-client.ts` |
| Monaco Editor | `components/editor/MonacoEditorPro.tsx` |
| Main Dashboard | `components/AethelDashboard.tsx` |
| Onboarding | `components/Onboarding.tsx` |

---

## 🔐 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# Auth
JWT_SECRET=xxx
NEXTAUTH_SECRET=xxx

# OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx

# Database
DATABASE_URL=postgresql://...

# AI
OPENAI_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
GOOGLE_AI_API_KEY=xxx
GROQ_API_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=xxx

# Storage (para marketplace)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET=xxx
```

---

## 📝 NOTAS PARA CONTINUIDADE

1. **Não use Jest** - o projeto usa Vitest
2. **Cuidado com imports de monaco-editor** - precisa de dynamic import no Next.js
3. **Hooks React devem estar em arquivos 'use client'** - não misturar com server
4. **Rotas dinâmicas devem usar mesmo nome** - [id] ou [projectId], não ambos
5. **Build desktop/mobile são mock** - código existe mas não funciona
6. **Yjs requer servidor websocket** para colaboração real

---

## 🏷️ TAGS E VERSÕES

- **Versão Atual:** 0.3.0
- **Node.js:** 18+
- **npm:** 9+
- **Next.js:** 14.2.35
- **React:** 18
- **TypeScript:** 5.x

---

## 🎯 PÁGINAS AAA PRONTAS

| Página | Arquivo | Status |
|--------|---------|--------|
| Landing | `app/(landing)/page.tsx` | ✅ AAA |
| Login | `app/(auth)/login/page.tsx` | ✅ AAA |
| Register | `app/(auth)/register/page.tsx` | ✅ AAA |
| Pricing | `app/pricing/page.tsx` | ✅ AAA |
| 404 | `app/not-found.tsx` | ✅ AAA |
| Status | `app/status/page.tsx` | ✅ AAA |
| Contact Sales | `app/contact-sales/page.tsx` | ✅ AAA |
| Settings | `app/settings/page.tsx` | ✅ AAA |
| Download | `app/download/page.tsx` | ✅ AAA |
| Dashboard | `components/AethelDashboard.tsx` | ⚠️ Funcional |
| Profile | `app/profile/page.tsx` | ⚠️ Funcional |

---

*Documento atualizado por GitHub Copilot (Claude Opus 4.5)*  
*21 de Janeiro de 2026*
