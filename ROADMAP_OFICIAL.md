# 🗺️ AETHEL ENGINE - ROADMAP OFICIAL
**Versão:** 2.0.0  
**Atualizado:** 20 de Janeiro de 2026

---

## 🎯 VISÃO

> **"A primeira plataforma cloud-native de desenvolvimento de jogos que combina a facilidade do Replit com o poder do Unreal Engine e a inteligência do Cursor/Manus."**

---

## 📅 TIMELINE GERAL

```
       Q1 2026            Q2 2026           Q3 2026           Q4 2026
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │   BETA      │   │ PRODUÇÃO    │   │ EXPANSÃO    │   │  ESCALA     │
    │             │   │             │   │             │   │             │
    │• Corrigir   │   │• Launch     │   │• Marketplace│   │• Enterprise │
    │  P0 issues  │   │  público    │   │  de assets  │   │• Mobile SDK │
    │• Testes E2E │   │• Pixel      │   │• Team collab│   │• Console    │
    │• Deploy     │   │  Streaming  │   │• Templates  │   │  export     │
    │  staging    │   │• WASM       │   │  prontos    │   │             │
    └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

---

## 🔴 FASE ATUAL: BETA FINAL (Q1 2026)

### Sprint 1: Semana 1-2 (AGORA) ⏳
**Objetivo:** Remover bloqueadores de produção

| Task | Prioridade | Status | Owner |
|------|-----------|--------|-------|
| Reativar ESLint | P0 | ⏳ | DevOps |
| Remover credenciais hardcoded | P0 | ⏳ | Security |
| Testar deploy staging | P0 | ⏳ | DevOps |
| Validar Jobs API | P1 | ⏳ | Backend |
| Testar export pipeline | P1 | ⏳ | Backend |

### Sprint 2: Semana 3-4
**Objetivo:** Estabilidade e performance

| Task | Prioridade | Status | Owner |
|------|-----------|--------|-------|
| Migrar física para Rapier WASM | P1 | 📅 | Engine |
| Expandir testes E2E (40% → 70%) | P1 | 📅 | QA |
| Worker image no CI/CD | P1 | 📅 | DevOps |
| Documentar APIs (OpenAPI) | P2 | 📅 | Docs |

### Sprint 3: Semana 5-6
**Objetivo:** Polish e feedback

| Task | Prioridade | Status | Owner |
|------|-----------|--------|-------|
| Closed beta com 50 users | P1 | 📅 | Product |
| Nanite Worker offload | P2 | 📅 | Engine |
| Melhorar onboarding UX | P2 | 📅 | Frontend |
| Coletar feedback beta | P1 | 📅 | Product |

---

## 🟡 FASE 2: PRODUÇÃO (Q2 2026)

### Milestone: Launch Público

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **Pixel Streaming** | Renderização AAA remota em containers | P1 |
| **WASM Physics** | Rapier.js compilado para WASM | P1 |
| **Export Multi-plataforma** | Windows/Mac/Linux/Web builds reais | P1 |
| **Billing Produção** | Stripe integração completa | P1 |
| **CDN Global** | Assets via CloudFlare/Fastly | P2 |
| **Auto-scaling** | K8s HPA configurado | P2 |

---

## 🟢 FASE 3: EXPANSÃO (Q3 2026)

### Milestone: Marketplace & Colaboração

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **Asset Marketplace** | Compra/venda de assets 3D, scripts | P1 |
| **Templates Starter** | Jogos exemplo (FPS, RPG, Puzzle) | P1 |
| **Team Workspaces** | Colaboração em tempo real | P1 |
| **Plugin System** | Extensibilidade por terceiros | P2 |
| **Mobile Preview** | Preview em dispositivos reais | P2 |

---

## 🔵 FASE 4: ESCALA (Q4 2026)

### Milestone: Enterprise & Mobile

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **Enterprise Tier** | SSO, audit logs, SLA | P1 |
| **Mobile SDK** | iOS/Android native export | P1 |
| **Console Export** | PlayStation/Xbox/Switch | P2 |
| **Edge Computing** | Latência ultra-baixa global | P2 |
| **AI Advanced** | Fine-tuned models para game dev | P2 |

---

## 📊 MÉTRICAS DE SUCESSO

### Beta (Q1 2026)
- [ ] 0 bugs P0 em produção
- [ ] 95% uptime no staging
- [ ] 50+ beta testers ativos
- [ ] NPS > 40

### Produção (Q2 2026)
- [ ] 500+ usuários registrados
- [ ] 100+ projetos criados
- [ ] $10k MRR
- [ ] 99.5% uptime

### Expansão (Q3 2026)
- [ ] 5,000+ usuários
- [ ] 100+ assets no marketplace
- [ ] $50k MRR
- [ ] 10+ templates prontos

### Escala (Q4 2026)
- [ ] 50,000+ usuários
- [ ] 5+ clientes enterprise
- [ ] $200k MRR
- [ ] Presença em 3 continentes

---

## 🏗️ ARQUITETURA ALVO

```
                          ┌────────────────────────────┐
                          │      CDN (CloudFlare)      │
                          └────────────┬───────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
    ┌─────────▼─────────┐   ┌─────────▼─────────┐   ┌─────────▼─────────┐
    │  Frontend (Vercel) │   │  API Gateway      │   │  Pixel Streaming  │
    │  Next.js 14        │   │  (Kong/Nginx)     │   │  (Containers)     │
    └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
              │                        │                        │
              │            ┌───────────┴───────────┐            │
              │            │     Kubernetes        │            │
              │            ├───────────────────────┤            │
              │            │ • WebSocket Pods      │            │
              │            │ • Worker Pods         │◄───────────┘
              │            │ • AI Agent Pods       │
              │            └───────────┬───────────┘
              │                        │
    ┌─────────┴────────────────────────┴────────────────────────┐
    │                      Data Layer                           │
    ├───────────────┬───────────────┬───────────────────────────┤
    │  PostgreSQL   │    Redis      │       S3/MinIO            │
    │  (Metadata)   │  (Queue/Cache)│     (Assets)              │
    └───────────────┴───────────────┴───────────────────────────┘
```

---

## 🎨 FEATURES POR VERSÃO

### v2.0.0 (Beta) - ATUAL
- ✅ IDE Cloud completa
- ✅ Monaco Editor integrado
- ✅ IA Multi-provider
- ✅ Multiplayer básico
- ✅ Export Web

### v2.1.0 (Produção)
- 🔄 Pixel Streaming
- 🔄 WASM Physics
- 🔄 Export Desktop
- 🔄 Billing Stripe

### v2.2.0 (Marketplace)
- 📅 Asset Store
- 📅 Templates
- 📅 Team Collab
- 📅 Plugin API

### v3.0.0 (Enterprise)
- 📅 SSO/SAML
- 📅 Mobile Export
- 📅 Console Export
- 📅 White-label

---

## 📋 BACKLOG PRIORIZADO

### P0 - Bloqueadores (Esta Semana)
1. Reativar ESLint
2. Remover credenciais hardcoded
3. Deploy staging funcional

### P1 - Alta Prioridade (Este Mês)
4. Migrar física para WASM
5. Export real multi-plataforma
6. Testes E2E 70%
7. Worker no CI/CD

### P2 - Média Prioridade (Este Trimestre)
8. Pixel Streaming
9. Nanite offload
10. OpenAPI docs
11. Onboarding melhorado

### P3 - Baixa Prioridade (Futuro)
12. Marketplace
13. Templates
14. Enterprise features

---

## 🔗 LINKS ÚTEIS

- [Status Definitivo](./AETHEL_STATUS_DEFINITIVO_2026-01-20.md)
- [Consolidação Docs](./CONSOLIDACAO_DOCUMENTACAO.md)
- [Tutorial Hello World](../docs/HELLO_WORLD_TUTORIAL.md)
- [README Principal](../README.md)

---

*Roadmap oficial - Atualizado em 20/01/2026*
*Próxima revisão: 15/02/2026*
