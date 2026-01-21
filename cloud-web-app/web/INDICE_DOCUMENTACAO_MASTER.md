# 📚 ÍNDICE MASTER DE DOCUMENTAÇÃO
**Data:** 21 de Janeiro de 2026  
**Propósito:** Consolidar e organizar toda documentação do Aethel Engine

---

## 🎯 DOCUMENTO ÚNICO DE REFERÊNCIA

### ⭐ FONTE_DA_VERDADE.md
**Localização:** `cloud-web-app/web/FONTE_DA_VERDADE.md`  
**Status:** ✅ ATUALIZADO (v0.3.0)  
**Última atualização:** 21/01/2026

Este é o **ÚNICO** documento que deve ser consultado para estado atual do projeto. Todos os outros documentos MD são históricos ou obsoletos.

---

## 📁 DOCUMENTAÇÃO ATIVA (MANTER)

| Arquivo | Localização | Propósito | Status |
|---------|-------------|-----------|--------|
| **FONTE_DA_VERDADE.md** | `web/` | Estado atual definitivo | ✅ Atual |
| **README.md** | `meu-repo/` | Guia de início rápido | ⚠️ Atualizar |
| **CONTRIBUTING.md** | `meu-repo/` | Guia para contribuidores | ✅ OK |
| **SECURITY.md** | `meu-repo/` | Política de segurança | ✅ OK |
| **CHANGELOG.md** | `meu-repo/` | Histórico de versões | ⚠️ Atualizar |

---

## 🗂️ DOCUMENTAÇÃO HISTÓRICA (ARQUIVAR)

Os seguintes documentos são **HISTÓRICOS** e não refletem o estado atual:

### Relatórios de Status (Obsoletos)
- ❌ `AETHEL_STATUS_DEFINITIVO_2026-01-20.md` - Superseded by FONTE_DA_VERDADE
- ❌ `STATUS_FINAL_REAL_2026-01-07.md` - Desatualizado
- ❌ `ABSOLUTE_FINAL_REPORT.md` - Dezembro 2025, obsoleto
- ❌ `FINAL_STATUS_REPORT.md` - Obsoleto
- ❌ `ESTADO_FINAL_COMPLETO.md` - Obsoleto

### Auditorias (Histórico)
- 📜 `AUDITORIA_TECNICA_FINAL_V2.md` - Histórico
- 📜 `AUDIT_COMPLETO.md` - Histórico
- 📜 `AUDIT_REPORT_2026_FINAL.md` - Histórico
- 📜 `AUDITORIA_PROFISSIONAL_COMPLETA_2026-01-13.md` - Histórico

### Planos de Ação (Executados)
- 📜 `PLANO_ACAO_COMPLETO_DEFINITIVO.md` - Executado
- 📜 `PLANO_EXECUCAO_FINAL_TECNICO.md` - Executado
- 📜 `ACTION_PLAN_NEXT_STEPS_2026-01-14.md` - Executado

### Análises (Arquivadas)
- 📜 `ANALISE_GAP_*.md` - Gaps corrigidos
- 📜 `ANALISE_CRITICA_*.md` - Histórico
- 📜 `ALINHAMENTO_*.md` - Histórico

---

## 📊 ESTADO ATUAL DO PROJETO (Resumo)

### Métricas de Qualidade
| Métrica | Valor | Status |
|---------|-------|--------|
| TypeScript | 0 erros | ✅ |
| ESLint | 0 erros | ✅ |
| Testes Vitest | 232 passando | ✅ |
| Versão | 0.3.0 | ✅ |

### O Que Funciona
✅ IDE/Editor com Monaco  
✅ AI/Copilot multi-provider  
✅ Colaboração real-time (Yjs)  
✅ Física (Rapier WASM)  
✅ Billing (Stripe)  
✅ Auth (JWT + OAuth)  
✅ Onboarding  

### O Que Não Funciona (Mock)
❌ Build Desktop (Electron não instalado)  
❌ Build Mobile (Capacitor não instalado)  
❌ Shader Graph (placeholder)  
❌ Ray Tracing (BVH não integrado)  
❌ Marketplace backend (retorna [])

### Páginas AAA Prontas
✅ Landing, Login, Register, Pricing  
✅ 404, Status, Contact Sales  
⚠️ Dashboard, Profile, Settings (funcionais)

---

## 🗑️ RECOMENDAÇÃO: ARQUIVOS PARA DELETAR

Os seguintes arquivos podem ser movidos para uma pasta `_archive/` ou deletados:

```
# Relatórios duplicados/obsoletos (100+ arquivos)
*_FINAL*.md
*_COMPLETO*.md  
*_2025-*.md (maioria)
*_2026-01-0*.md (maioria, exceto mais recentes)

# Planos executados
PLANO_*.md (maioria)
ACTION_PLAN_*.md

# Análises antigas
ANALISE_*.md (maioria)
AUDITORIA_*.md (maioria)
```

**Manter apenas:**
- FONTE_DA_VERDADE.md (web/)
- README.md (raiz)
- CONTRIBUTING.md
- SECURITY.md
- CHANGELOG.md
- ARQUITETURA.md (se atualizado)

---

## 🔄 PRÓXIMOS PASSOS

1. **Atualizar README.md** - Alinhar com FONTE_DA_VERDADE
2. **Atualizar CHANGELOG.md** - Adicionar v0.3.0
3. **Criar pasta _archive/** - Mover docs obsoletos
4. **Simplificar estrutura** - Apenas docs essenciais na raiz

---

*Documento criado por GitHub Copilot (Claude Opus 4.5)*  
*21 de Janeiro de 2026*
