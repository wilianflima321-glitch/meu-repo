> **DEPRECADO (2026-03-22):** este arquivo foi migrado para 50_MASTER_PLAN_ALINHAMENTO_ESTRUTURAL_2026-03-22.md. Use o arquivo numerado can�nico.


# 🗺️ Master Plan de Alinhamento Estrutural (Aethel Engine 2026)

**Data:** 26 de Fevereiro de 2026  
**Status:** EXECUTÁVEL - Guia de Reorganização e Conexão  
**Objetivo:** Conectar todas as pastas, ferramentas e sistemas do repositório em uma arquitetura coerente que suporte a visão de superação AAA.

---

## 1. Arquitetura de Pastas Unificada (The Aethel Monorepo)

Para eliminar a confusão e a fragmentação, o repositório será organizado como um monorepo lógico, onde cada parte tem uma responsabilidade clara e conectada.

| Pasta | Responsabilidade | Conexão Estratégica |
| :--- | :--- | :--- |
| `cloud-web-app/web` | **The Platform Shell** (Next.js 14). | O ponto de entrada único (Gateway, Nexus, Forge). |
| `shared/core` | **Aethel Core Logic**. | Lógica de negócios, tipos comuns e serviços de IA compartilhados. |
| `shared/ui` | **Aethel Design System**. | Componentes React AAA baseados no `AETHEL_DESIGN_MANIFESTO`. |
| `services/ai-oracle` | **AI Orchestration Layer**. | Onde os agentes (Arquiteto, Designer, etc.) residem e pensam. |
| `services/render-pipeline` | **Hybrid Visual Engine**. | Integração com WebGPU (local) e Pixel Streaming (nuvem). |
| `docs/master` | **The Source of Truth**. | Documentos canônicos que guiam o desenvolvimento e a IA. |
| `docs/archive` | **Historical Reference**. | Ideias legadas e logs de auditoria (apenas para consulta). |

## 2. Conectando as "Pontas Soltas" (Ações P0)

Para resolver as inconsistências identificadas na auditoria, as seguintes ações de alinhamento são obrigatórias:

### 2.1. Do Fake ao Real: Unreal Level Editor
- **Ação:** Mover `src/components/unreal` para `cloud-web-app/web/components/nexus/canvas/3d`.
- **Conexão:** Substituir o `UnrealLevelService.ts` por um `NexusSceneManager.ts` que use Three.js ou Babylon.js para renderização local real no `NexusCanvas.tsx`.
- **Status:** Transição de "UI Mock" para "Web-Native Visualizer".

### 2.2. Do Local ao Híbrido: Trading & IA
- **Ação:** Isolar o `src/common/trading/hft` em um pacote experimental `packages/experimental-trading`.
- **Conexão:** Conectar o `SupremeOrchestrator` apenas a serviços validados. Desabilitar por padrão qualquer sistema que exija infraestrutura não configurada (e.g., HFT real).
- **Status:** Foco total no Core de Criação (Jogos/Filmes/Apps).

### 2.3. Alinhamento da IA (Grounding)
- **Ação:** Alimentar o contexto de todas as IAs assistidas com o `BENCHMARK_SUPERACAO_IA_AAA.md` e o `AUDITORIA_CRITICA_P0.md`.
- **Conexão:** Garantir que a IA saiba as limitações reais (e.g., "Não tente usar o Unreal Engine nativo no browser, use o Aethel Visual Pipeline").

## 3. Estratégia de Viabilidade Econômica (Custo vs. Qualidade)

Para que o Aethel Engine seja sustentável e supere os concorrentes:

1.  **Iteração Local Gratuita:** O `Draft Mode` (WebGPU/WASM) deve ser a ferramenta padrão para o usuário, permitindo criar e testar lógica de jogo sem custos de nuvem.
2.  **Renderização AAA Sob Demanda:** O Pixel Streaming (Unreal/High-Fidelity) será um serviço premium, cobrado por tempo de uso ou por exportação final de filme/jogo.
3.  **IA Eficiente:** Uso de modelos menores e otimizados (e.g., Gemini 2.0 Flash) para tarefas de rotina, reservando modelos "pesados" (Claude 3.5 Sonnet) para arquitetura e refatoração complexa.

## 4. Próximos Passos de Execução (O "Alinhador")

1.  **Reorganização de Arquivos:** Mover as pastas de `src` para a nova estrutura `shared/` e `services/`.
2.  **Unificação da IDE:** Consolidar o `IDELayout.tsx` (The Forge) como a interface mestre que engloba o `NexusCanvas` e o `NexusChat`.
3.  **Habilitação do WebGPU:** Adicionar suporte básico a WebGPU no `NexusCanvas` para visualização 3D real de baixa latência.

---

**Assinado:** Manus AI (atuando como Arquiteto de Superação do Aethel Engine)



