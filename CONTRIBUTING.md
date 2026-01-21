# 🤝 Guia de Contribuição - Aethel Engine

Obrigado pelo interesse em contribuir com o Aethel Engine! Este documento explica como você pode participar do desenvolvimento da primeira plataforma cloud-native de desenvolvimento de jogos AAA.

---

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Features](#sugerindo-features)

---

## 📜 Código de Conduta

Este projeto segue o [Contributor Covenant](https://www.contributor-covenant.org/). Ao participar, você concorda em:

- Usar linguagem acolhedora e inclusiva
- Respeitar pontos de vista diferentes
- Aceitar críticas construtivas graciosamente
- Focar no que é melhor para a comunidade
- Mostrar empatia com outros membros

**Não toleramos:** Assédio, discriminação, trolling, ou comportamento tóxico.

---

## 🚀 Como Contribuir

### 1. Fork o Repositório
```bash
# Clone seu fork
git clone https://github.com/SEU-USUARIO/aethel-engine.git
cd aethel-engine

# Adicione o upstream
git remote add upstream https://github.com/aethel/aethel-engine.git
```

### 2. Crie uma Branch
```bash
# Para features
git checkout -b feature/nome-da-feature

# Para bugs
git checkout -b fix/descricao-do-bug

# Para docs
git checkout -b docs/melhoria-documentacao
```

### 3. Faça suas Mudanças
- Siga os [Padrões de Código](#padrões-de-código)
- Adicione testes quando apropriado
- Atualize a documentação se necessário

### 4. Commit com Conventional Commits
```bash
# Formato
<tipo>(<escopo>): <descrição>

# Exemplos
feat(editor): adiciona suporte a arrastar assets para cena
fix(physics): corrige colisão em bordas
docs(readme): atualiza instruções de instalação
test(e2e): adiciona teste para export de projeto
refactor(api): melhora performance de listagem
```

**Tipos válidos:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

### 5. Envie o PR
```bash
git push origin feature/nome-da-feature
```
Então abra um Pull Request no GitHub.

---

## 💻 Ambiente de Desenvolvimento

### Pré-requisitos
- **Node.js** 18+ (recomendado: 20 LTS)
- **npm** 9+
- **Docker** e **Docker Compose**
- **Git** 2.30+

### Setup Inicial
```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.template .env
# Edite .env com suas configurações

# Subir serviços (PostgreSQL, Redis)
docker-compose up -d postgres redis

# Rodar migrations
npm run db:migrate

# Iniciar em desenvolvimento
npm run dev
```

### Comandos Úteis
```bash
# Desenvolvimento
npm run dev              # Inicia frontend + backend
npm run dev:web          # Apenas frontend Next.js
npm run dev:server       # Apenas backend

# Testes
npm run test             # Testes unitários
npm run test:e2e         # Testes E2E (Playwright)
npm run test:coverage    # Cobertura de código

# Qualidade
npm run lint             # ESLint
npm run lint:fix         # ESLint com auto-fix
npm run typecheck        # Verificação TypeScript

# Build
npm run build            # Build de produção
npm run build:docker     # Build de imagens Docker
```

---

## 📐 Padrões de Código

### TypeScript
```typescript
// ✅ BOM: Tipos explícitos em APIs públicas
export function createProject(config: ProjectConfig): Promise<Project> { }

// ❌ RUIM: any
function process(data: any) { }

// ✅ BOM: Interfaces para objetos
interface UserSession {
  userId: string;
  token: string;
  expiresAt: Date;
}

// ✅ BOM: Enums para valores fixos
enum ProjectStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived'
}
```

### React/Next.js
```tsx
// ✅ BOM: Componentes funcionais com tipos
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button
      className={cn('btn', `btn-${variant}`)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ✅ BOM: Hooks customizados prefixados com "use"
export function useProject(projectId: string) {
  return useSWR(`/api/projects/${projectId}`, fetcher);
}
```

### CSS/Tailwind
```tsx
// ✅ BOM: Tailwind com utilitários semânticos
<div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-lg">

// ✅ BOM: cn() para condicionais
<button className={cn(
  "px-4 py-2 rounded",
  isActive && "bg-indigo-500",
  isDisabled && "opacity-50 cursor-not-allowed"
)}>

// ❌ RUIM: CSS inline
<div style={{ display: 'flex', padding: '16px' }}>
```

### Estrutura de Arquivos
```
cloud-web-app/web/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── (dashboard)/       # Rotas de dashboard
│   └── (auth)/            # Rotas de autenticação
├── components/            # Componentes React
│   ├── ui/               # Componentes base (Button, Input, etc)
│   ├── editor/           # Componentes do editor
│   └── [feature]/        # Componentes por feature
├── lib/                   # Lógica compartilhada
│   ├── api/              # Clientes de API
│   ├── hooks/            # React Hooks
│   └── utils/            # Utilitários
└── tests/                 # Testes
    ├── e2e/              # Testes E2E (Playwright)
    └── unit/             # Testes unitários (Vitest)
```

---

## 🔍 Processo de Pull Request

### Checklist Antes de Enviar
- [ ] Código segue os padrões do projeto
- [ ] Testes passam localmente (`npm run test`)
- [ ] Lint passa (`npm run lint`)
- [ ] TypeScript compila (`npm run typecheck`)
- [ ] Documentação atualizada (se aplicável)
- [ ] CHANGELOG.md atualizado (para mudanças significativas)

### Template de PR
```markdown
## Descrição
[Descreva o que foi feito e por quê]

## Tipo de Mudança
- [ ] Bug fix (non-breaking change)
- [ ] Nova feature (non-breaking change)
- [ ] Breaking change (mudança que afeta funcionalidade existente)
- [ ] Documentação

## Como Testar
1. [Passo a passo para testar]
2. ...

## Screenshots (se aplicável)
[Adicione screenshots ou GIFs]

## Checklist
- [ ] Código segue padrões do projeto
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
```

### Revisão
- PRs precisam de pelo menos 1 aprovação
- CI deve passar (lint, tests, build)
- Responda aos comentários de revisão
- Squash commits antes do merge (quando solicitado)

---

## 🐛 Reportando Bugs

### Use o Template de Issue
```markdown
## Descrição do Bug
[Descrição clara e concisa]

## Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

## Comportamento Esperado
[O que deveria acontecer]

## Comportamento Atual
[O que está acontecendo]

## Ambiente
- OS: [ex: Windows 11, macOS 14, Ubuntu 22.04]
- Browser: [ex: Chrome 120, Firefox 121]
- Node.js: [ex: 20.10.0]
- Versão Aethel: [ex: 2.0.0]

## Screenshots/Logs
[Adicione evidências]

## Contexto Adicional
[Qualquer informação relevante]
```

---

## 💡 Sugerindo Features

### Antes de Sugerir
1. Verifique se já não existe uma issue similar
2. Considere se alinha com a visão do projeto
3. Pense em como outros usuários se beneficiariam

### Template de Feature Request
```markdown
## Problema
[Qual problema você está tentando resolver?]

## Solução Proposta
[Descreva sua ideia]

## Alternativas Consideradas
[Outras soluções que você pensou]

## Contexto Adicional
[Mockups, exemplos de outros produtos, etc]
```

---

## 🏆 Reconhecimento

Contribuidores são reconhecidos no README.md e no CHANGELOG.md. Contribuições significativas podem levar a convites para o time core.

---

## ❓ Dúvidas?

- **Discord:** [Aethel Community](https://discord.gg/aethel)
- **Discussions:** [GitHub Discussions](https://github.com/aethel/aethel-engine/discussions)
- **Email:** contribute@aethel.io

---

**Obrigado por contribuir! Juntos estamos construindo o futuro do desenvolvimento de jogos.** 🎮✨
