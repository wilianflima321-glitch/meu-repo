# LIMITATIONS.md
## Limitações Técnicas, de Produto e de Negócio
**Data:** Janeiro 2026  
**Versão:** 1.0

---

## SUMÁRIO

Este documento cataloga TODAS as limitações conhecidas que afetam o desenvolvimento e operação da plataforma. Nenhuma limitação é especulativa - todas são baseadas em fatos técnicos e restrições reais.

---

## 1. LIMITAÇÕES TÉCNICAS DO BROWSER

### 1.1 WebGL/WebGPU

| Limitação | Impacto | Severidade | Mitigação |
|-----------|---------|------------|-----------|
| **WebGL 2.0 compute shaders** | Sem compute shaders nativos | ALTO | Usar WebGPU onde suportado |
| **WebGPU browser support** | Chrome/Edge ok, Firefox/Safari parcial | MÉDIO | Fallback para WebGL |
| **GPU memory limits** | ~2GB em browsers | MÉDIO | Asset streaming, LOD |
| **Multi-threading** | Web Workers limitados | ALTO | Offscreen canvas, WASM threads |
| **60fps ceiling** | Complexidade visual limitada | MÉDIO | Otimização agressiva |

### 1.2 Execução de Código

| Limitação | Impacto | Severidade | Mitigação |
|-----------|---------|------------|-----------|
| **Sandbox do browser** | Sem acesso a filesystem real | CRÍTICO | Server-side execution |
| **WASM performance** | 50-80% do nativo | MÉDIO | Aceitar para MVP |
| **Node.js no browser** | Não nativo | ALTO | Container backend |
| **Multi-language support** | Cada linguagem = complexidade | ALTO | Containers Docker |

### 1.3 Armazenamento Local

| Limitação | Impacto | Severidade | Mitigação |
|-----------|---------|------------|-----------|
| **LocalStorage 5MB** | Insuficiente para projetos | ALTO | IndexedDB + sync |
| **IndexedDB limits** | Varia por browser (50MB-2GB) | MÉDIO | Server como primary |
| **Cache API** | Apenas GET requests | BAIXO | Aceitar limitação |

---

## 2. LIMITAÇÕES DE INFRAESTRUTURA

### 2.1 Execução de Código em Container

| Limitação | Impacto | Severidade | Mitigação |
|-----------|---------|------------|-----------|
| **Cold start** | 2-5s para novo container | ALTO | Warm pools, Firecracker |
| **Custo por usuário** | $0.01-0.10 por hora ativo | CRÍTICO | Limits, tiers |
| **Concorrência** | Limite de containers simultâneos | ALTO | Queue, priority |
| **Networking** | Cada container = IP/port | MÉDIO | Reverse proxy |

### 2.2 Armazenamento

| Limitação | Impacto | Severidade | Mitigação |
|-----------|---------|------------|-----------|
| **S3 latency** | 50-200ms por request | MÉDIO | CDN, cache agressivo |
| **Egress costs** | $0.09/GB | ALTO | Compression, CDN |
| **File size limits** | 5GB por arquivo | BAIXO | Suficiente para maioria |

### 2.3 Escalabilidade

| Limitação | Impacto | Severidade | Mitigação |
|-----------|---------|------------|-----------|
| **WebSocket connections** | ~65k por servidor | MÉDIO | Sharding, Redis pubsub |
| **MongoDB connections** | Pool limits | MÉDIO | Connection pooling |
| **AI API rate limits** | Tokens/min limitados | ALTO | Queue, caching, fallback |

---

## 3. LIMITAÇÕES DE IA

### 3.1 Context Window

| Modelo | Context | Limitação Real | Mitigação |
|--------|---------|----------------|-----------|
| GPT-4o | 128k | Caro para usar full | RAG, chunking |
| Claude 3.5 | 200k | Latência alta para full | Selective context |
| Gemini 2.0 | 1M+ | Custo proibitivo | Use cases específicos |

### 3.2 Latência

| Operação | Latência Típica | Aceitável? | Mitigação |
|----------|----------------|------------|-----------|
| Autocomplete | 200-500ms | MARGINAL | Streaming, cache |
| Chat response | 1-3s | SIM | Streaming |
| Multi-file edit | 5-15s | MARGINAL | Progress indicator |
| Agent task | 30s-5min | PROBLEMA | Parallelism, feedback |

### 3.3 Custo

| Operação | Custo Estimado | Volume/Usuário | Custo/Usuário/Mês |
|----------|---------------|----------------|-------------------|
| Autocomplete | $0.001/request | 1000 | $1 |
| Chat | $0.01/message | 100 | $1 |
| Agent task | $0.10/task | 50 | $5 |
| **TOTAL** | - | - | **$7/usuário** |

### 3.4 Qualidade

| Limitação | Impacto | Severidade |
|-----------|---------|------------|
| Hallucinations | Código incorreto gerado | ALTO |
| Context loss | Esquece instruções longas | MÉDIO |
| Language bias | Melhor em inglês | MÉDIO |
| Framework bias | Prefere frameworks populares | BAIXO |

---

## 4. LIMITAÇÕES GRÁFICAS (3D/VIDEO)

### 4.1 Viewport 3D Web

| Limitação | Benchmark Desktop | Web Atual | Gap |
|-----------|------------------|-----------|-----|
| **Triangles** | 10M+ (Unreal) | 1-2M (Three.js) | 5-10x |
| **Draw calls** | 10k+ | 1-2k | 5-10x |
| **Texture memory** | 8GB+ | 1-2GB | 4-8x |
| **Shaders** | Ilimitado | WebGL2 subset | Significativo |
| **Physics** | 10k+ bodies | 1k bodies | 10x |

### 4.2 Edição de Vídeo Web

| Limitação | Benchmark Desktop | Web Atual | Gap |
|-----------|------------------|-----------|-----|
| **Resolução** | 8K+ | 4K (com dificuldade) | 2x |
| **Codec support** | Todos | H.264/VP9/AV1 | Limitado |
| **Effects** | GPU accelerated | CPU bound | Significativo |
| **Timeline tracks** | 100+ | 10-20 | 5-10x |
| **Export** | Full quality | Re-encoding server | Necessário |

### 4.3 Audio Processing

| Limitação | Impacto | Mitigação |
|-----------|---------|-----------|
| Web Audio API limits | Latência, buffer | Server processing |
| MIDI support | Básico | Web MIDI API |
| Plugin formats (VST) | Não suportado | Custom web plugins |

---

## 5. LIMITAÇÕES DE COLABORAÇÃO

### 5.1 Real-time Sync

| Limitação | Impacto | Severidade | Mitigação |
|-----------|---------|------------|-----------|
| **Conflitos** | Edits simultâneos | MÉDIO | CRDTs (Yjs) |
| **Latência** | 50-200ms | ACEITÁVEL | - |
| **Offline** | Sync quebra | ALTO | Local-first arch |
| **Scale** | >10 editores | ALTO | Sharding |

### 5.2 Version Control

| Limitação | Impacto | Severidade | Mitigação |
|-----------|---------|------------|-----------|
| **Git in browser** | Performance | ALTO | isomorphic-git + server |
| **Large files** | Git LFS não trivial | MÉDIO | Custom handling |
| **Binary diffs** | Não eficiente | MÉDIO | Snapshot-based |

---

## 6. LIMITAÇÕES DE PRODUTO/UX

### 6.1 Onboarding

| Limitação | Impacto |
|-----------|---------|
| Curva de aprendizado de IDE | Intimidante para iniciantes |
| Muitas features | Overwhelm |
| Customização excessiva | Paralisia de escolha |

### 6.2 Mobile

| Limitação | Impacto | Decisão |
|-----------|---------|---------|
| Touch não ideal para código | UX degradada | Desktop-first, mobile view-only |
| Tela pequena | Layout quebra | Responsive mas limitado |
| Performance | Devices fracos | Mínimo viável |

---

## 7. LIMITAÇÕES DE NEGÓCIO

### 7.1 Custos Operacionais

| Item | Custo/Usuário/Mês | Escalável? |
|------|------------------|------------|
| Compute (containers) | $2-10 | Com limits |
| AI API | $5-20 | Com tiers |
| Storage | $0.50-2 | Sim |
| Bandwidth | $0.50-2 | Sim |
| **TOTAL** | **$8-34** | Marginal |

### 7.2 Pricing vs Concorrência

| Plataforma | Plano Gratuito | Plano Pago |
|------------|----------------|------------|
| Replit | Limitado | $25/mês |
| Cursor | Trial | $20/mês |
| GitHub Copilot | Não | $10-19/mês |
| **Nossa meta** | Sim (limitado) | $15-25/mês |

### 7.3 Time to Market

| Limitação | Impacto |
|-----------|---------|
| Equipe pequena | Features limitadas |
| Concorrentes established | Catch-up constante |
| Recursos finitos | Priorização crítica |

---

## 8. MATRIZ DE RISCO

| Limitação | Probabilidade | Impacto | Risco | Ação |
|-----------|--------------|---------|-------|------|
| AI costs explodem | ALTA | CRÍTICO | **CRÍTICO** | Limites agressivos |
| WebGPU não adotado | MÉDIA | MÉDIO | **MÉDIO** | Fallback WebGL |
| Concorrente supera | ALTA | ALTO | **ALTO** | Inovar em AI+UX |
| Performance insatisfatória | MÉDIA | ALTO | **ALTO** | Otimização contínua |
| Segurança breach | BAIXA | CRÍTICO | **MÉDIO** | Security-first |

---

## 9. LIMITAÇÕES ACEITAS (NÃO MITIGAR)

| Limitação | Razão para Aceitar |
|-----------|-------------------|
| Não rodar Unreal Engine no browser | Fisicamente impossível, fora do escopo |
| Não editar vídeo 8K | Demanda ínfima, custo proibitivo |
| Não suportar todos os idiomas | Priorizar EN, PT, ES inicialmente |
| Não ter plugins day 1 | MVP first |
| Mobile editing completo | Desktop-first strategy |

---

## PRÓXIMOS DOCUMENTOS

- `COMPETITIVE_GAP.md` - Como superar essas limitações vs concorrentes
- `WORKBENCH_SPEC.md` - Especificação técnica considerando limitações


---

## DELTA NOTE (2026-02-13)

No change to hard technical constraints documented in this file.
The 2026-02-13 implementation pass focuses on:
- UI density and interaction quality
- API authority de-duplication
- explicit deprecation contracts

Desktop-level Unreal/Premiere parity limitations remain unchanged.
