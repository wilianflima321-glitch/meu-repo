# DUPLICATIONS_AND_CONFLICTS.md
## Análise de Duplicidades e Conflitos
**Data:** Janeiro 2026  
**Versão:** 1.0

---

## SUMÁRIO

Este documento identifica potenciais duplicidades, conflitos e inconsistências que devem ser evitadas ou resolvidas durante o desenvolvimento da plataforma.

---

## 1. DUPLICIDADES ARQUITETURAIS A EVITAR

### 1.1 Sistema de Arquivos

| Problema Potencial | Descrição | Decisão |
|-------------------|-----------|---------|
| File storage dual | S3 + MongoDB para arquivos | **UNIFICAR**: S3 para conteúdo, MongoDB apenas metadata |
| Sync mechanism | Múltiplos sistemas de sync | **UNIFICAR**: Yjs como fonte única de verdade |
| Cache layers | Browser + Server cache duplicado | **DEFINIR**: Estratégia clara de cache |

### 1.2 Sistema de Autenticação

| Problema Potencial | Descrição | Decisão |
|-------------------|-----------|---------|
| JWT + Session | Dois sistemas de auth | **REMOVER**: Usar apenas JWT |
| OAuth providers | Cada feature com próprio OAuth | **UNIFICAR**: Auth service centralizado |

### 1.3 Sistema de Preview

| Problema Potencial | Descrição | Decisão |
|-------------------|-----------|---------|
| iframe vs WebView | Múltiplas formas de preview | **UNIFICAR**: iframe sandboxed |
| Hot reload mechanisms | Vários sistemas de reload | **UNIFICAR**: Single HMR system |

---

## 2. CONFLITOS CONCEITUAIS A RESOLVER

### 2.1 Editor vs IDE

| Conceito | Interpretação A | Interpretação B | Decisão |
|----------|-----------------|-----------------|---------|
| Workbench | Apenas editor de código | IDE completa | **IDE COMPLETA** |
| Preview | Tab separada | Integrado no layout | **INTEGRADO** |
| Terminal | Popup/modal | Panel fixo | **PANEL FIXO** |

### 2.2 AI Integration

| Conceito | Abordagem A | Abordagem B | Decisão |
|----------|-------------|-------------|---------|
| AI Chat | Widget lateral | Integrado no editor | **AMBOS** (contextual) |
| Autocomplete | Serviço externo | Modelo local | **EXTERNO** (escalabilidade) |
| Agent | Single agent | Multi-agent | **MULTI-AGENT** |

### 2.3 Viewport 3D

| Conceito | Abordagem A | Abordagem B | Decisão |
|----------|-------------|-------------|---------|
| Renderer | Three.js | Babylon.js | **THREE.JS** (comunidade maior) |
| Integration | Separado do editor | Tab no editor | **TAB NO EDITOR** |

---

## 3. FLUXOS CONFLITANTES A UNIFICAR

### 3.1 Fluxo de Criação de Projeto

```
CONFLITO IDENTIFICADO:
- Fluxo A: Dashboard → New Project → Template → Workbench
- Fluxo B: Workbench → File → New Project → Template

DECISÃO: Ambos válidos, mas WORKBENCH como entrada principal
- Dashboard para gestão de múltiplos projetos
- Workbench para criação rápida (Ctrl+N)
```

### 3.2 Fluxo de Deploy

```
CONFLITO IDENTIFICADO:
- Fluxo A: Build local → Upload → Deploy
- Fluxo B: Git push → CI/CD → Deploy
- Fluxo C: One-click deploy (Replit-style)

DECISÃO: ONE-CLICK como padrão, Git opcional
- P0: One-click deploy
- P1: Git integration
- P2: Custom CI/CD
```

### 3.3 Fluxo de Colaboração

```
CONFLITO IDENTIFICADO:
- Fluxo A: Share link → View only → Request edit
- Fluxo B: Invite → Role assignment → Access

DECISÃO: SHARE LINK como padrão, roles para teams
- Public: Share link com permissões
- Private: Invite com roles (Owner, Editor, Viewer)
```

---

## 4. INCONSISTÊNCIAS DE UX A CORRIGIR

### 4.1 Nomenclatura

| Termo Atual | Variações | Termo Padronizado |
|-------------|-----------|-------------------|
| Project/Repo/Workspace | Múltiplos | **Project** |
| File/Document/Asset | Múltiplos | **File** (código), **Asset** (mídia) |
| Preview/Live View/Output | Múltiplos | **Preview** |
| Build/Compile/Bundle | Múltiplos | **Build** |
| Deploy/Publish/Ship | Múltiplos | **Deploy** |

### 4.2 Atalhos de Teclado

| Ação | VS Code | Nossa Plataforma | Decisão |
|------|---------|------------------|---------|
| Command Palette | Ctrl+Shift+P | ? | **Ctrl+Shift+P** |
| Quick Open | Ctrl+P | ? | **Ctrl+P** |
| Save | Ctrl+S | ? | **Ctrl+S** (auto-save default) |
| AI Action | - | ? | **Ctrl+K** |
| Run/Preview | F5 | ? | **F5** |
| Terminal | Ctrl+` | ? | **Ctrl+`** |

### 4.3 Posicionamento de Painéis

| Painel | Posição A | Posição B | Decisão |
|--------|-----------|-----------|---------|
| Explorer | Esquerda | Direita | **ESQUERDA** |
| AI Panel | Direita | Inferior | **DIREITA** |
| Terminal | Inferior | Flutuante | **INFERIOR** |
| Preview | Direita | Tab | **TAB** (flexível) |
| Properties | Direita | Flutuante | **DIREITA** |

---

## 5. DECISÕES DE UNIFICAÇÃO PENDENTES

### 5.1 Sistema de Plugins

| Opção | Prós | Contras | Recomendação |
|-------|------|---------|--------------|
| VS Code extensions | Ecossistema enorme | Complexidade, licença | **NÃO AGORA** (P3) |
| Sistema próprio | Controle total | Dev time | **P2** |
| Sem plugins | Simplicidade | Limitação | **P0** (MVP sem plugins) |

### 5.2 Sistema de Templates

| Opção | Descrição | Recomendação |
|-------|-----------|--------------|
| Built-in | Templates mantidos por nós | **P0** (essencial) |
| Community | Usuários criam templates | **P2** |
| Import | Importar de GitHub/Replit | **P1** |

### 5.3 Sistema de AI Models

| Opção | Descrição | Recomendação |
|-------|-----------|--------------|
| Single provider (OpenAI) | Simplicidade | **P0** (MVP) |
| Multi-provider | Flexibilidade | **P1** |
| Self-hosted | Controle, custo | **P3** |

---

## 6. MATRIZ DE DECISÕES EXECUTIVAS

| Item | Ação | Justificativa | Prioridade |
|------|------|---------------|------------|
| Auth dual | REMOVER session, manter JWT | Simplificar | P0 |
| File storage | UNIFICAR S3+Mongo | Performance | P0 |
| Preview system | UNIFICAR iframe | Consistência | P0 |
| Terminology | PADRONIZAR | UX clarity | P0 |
| Keyboard shortcuts | ALINHAR com VS Code | Familiaridade | P0 |
| Plugin system | ADIAR | Foco no core | P3 |
| Multi-provider AI | PLANEJAR | Flexibilidade futura | P1 |

---

## 7. CHECKLIST DE CONSISTÊNCIA

Antes de cada release, verificar:

- [ ] Nomenclatura consistente em toda UI
- [ ] Atalhos funcionando como documentado
- [ ] Fluxos testados end-to-end
- [ ] AI integrada em todos os contextos relevantes
- [ ] Preview funcionando para todos os tipos de projeto
- [ ] Mensagens de erro padronizadas
- [ ] Loading states consistentes
- [ ] Empty states informativos

---

## PRÓXIMOS DOCUMENTOS

- `3_LIMITATIONS.md` - Limitações técnicas detalhadas
- `4_COMPETITIVE_GAP.md` - Análise competitiva completa
