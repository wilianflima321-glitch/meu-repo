# RELATÓRIO DE AUDITORIA ESTRATÉGICA CONSOLIDADO: AETHEL ENGINE

**Data:** 07 de Janeiro de 2026
**Auditor:** GitHub Copilot (Arquiteto Sênior)
**Escopo:** Ecossistema Completo (Engine + IDE + SaaS + AI Agents)
**Status:** **Functional Beta** (Com gaps críticos de integração Frontend-Backend)

---

## Doc 1 — Visão Executiva e Mapa do Sistema

### 1.1 O Veredito de Realidade
O Aethel Engine é um **ecossistema real e funcional**, não um mock. A análise profunda revelou que o código crítico existe (`ContentBrowser.tsx`, `ai-agent-system.ts`, `rapier-wasm`), mas sofre de "isolamento de componentes".
*   **Engine Core:** Potente (WASM Physics, PostProcessing).
*   **IDE:** Classe Mundial (Monaco Pro, XTerminal, Debugger).
*   **AI System:** Muito Avançado (`ai-tools-registry.ts` define Function Calling real para agentes).
*   **O "Elo Perdido":** A fiação (wiring). O `ContentBrowser` existe visualmente, mas não busca dados do servidor. O Agente de IA existe, mas não sabe quais assets estão disponíveis no projeto.

### 1.2 Mapa de Maturidade Atualizado
| Pilar | Componente | Status | Nota (0-10) | Ação Imediata |
| :--- | :--- | :--- | :--- | :--- |
| **Computação** | `rapier-wasm` + `GameLoop` | **Sólido** | 9/10 | Nenhuma |
| **Visual** | `Three.js` + `postprocessing` | **Bom** | 7/10 | Implementar Nanite-lite |
| **Codificação** | `MonacoEditorPro` + `LSP` | **Excelente** | 10/10 | Nenhuma |
| **Infra** | `XTerminal` + `dap-client` | **Excelente** | 10/10 | Docker Build |
| **Assets UI** | `ContentBrowser.tsx` | **Desconectado** | 3/10 | **Ligar à API** |
| **AI Agents** | `lib/ai-agent-system.ts` | **Alta Potência** | 8/10 | **Dar ferramentas de Asset** |

---

## Doc 2 — Arquitetura de Plataforma Web e PWA

### 2.1 PWA e Offline-First
*   **Progresso Confirmado:** O hook `useServiceWorker.tsx` foi corrigido e é funcional.
*   **Gap Crítico:** Não existem arquivos `manifest.json` ou `manifest.ts` na raiz do App Router (`app/`).
    *   *Solução Técnica:* Criar `app/manifest.ts` exportando objeto `MetadataRoute.Manifest`.
    *   *Conteúdo:* Definir `start_url: /editor`, `display: standalone` e ícones.

### 2.2 Containerização do Workspace
*   **Status:** O backend de terminal (`node-pty`) exige acesso a shell real.
*   **Risco:** O deploy atual na Vercel (Serverless) quebrará a funcionalidade de Terminal e LSP.
*   **Requisito de Deploy:** O "Cloud Web App" deve ser deployado em containers persistentes (Railway/Render/K8s) onde `/app` é rw.

---

## Doc 3 — Editor/IDE Web (DX)

### 3.1 A Joia da Coroa: Ferramentas de Código
A auditoria confirmou que as ferramentas de desenvolvimento são o ponto mais forte do projeto.
*   **Debugger:** O `AdvancedDebug.tsx` é uma implementação fiel do VS Code UI.
*   **Terminal:** O `XTerminal.tsx` conecta via WebSocket a um shell real.
*   **Diferencial:** Nenhuma outra engine web (Unity Web, Godot Web) possui uma IDE desse nível embutida.

---

## Doc 4 — Pipeline de Assets e Conteúdo (O Gargalo)

### 4.1 Diagnóstico do Content Browser
*   **Achado:** O arquivo `components/assets/ContentBrowser.tsx` **EXISTE** (966 linhas de código de alta qualidade, com suporte a Drag & Drop e ícones), corrigindo a percepção anterior de inexistência.
*   **Problema:** Ele espera receber uma prop `assets={...}` que atualmente vem vazia ou mockada. Não há um "Service" no frontend que chame o backend (`/api/assets/list`) para popular essa grade.
*   **Solução:** Criar o hook `useAssetQuery` (SWR/ReactQuery) que bate no backend e alimenta o componente.

### 4.2 Arquitetura de Upload e Processamento
Para que Usuários e IAs usem assets, precisamos de um contrato rígido:
1.  **Storage:** Assets ficam em `/public/uploads/{project_id}/`.
2.  **Metadata:** Todo upload gera um sidecar JSON `.meta` contendo:
    *   Tipo (Mesh, Texture, Audio)
    *   Tags (extraídas via IA Vision ou manuais)
    *   Preview (thumbnail gerada automaticamente)

---

## Doc 5 — Integração de IA e Agentes (Asset Awareness)

### 5.1 O Problema da Cegueira da IA
O arquivo `lib/ai-tools-registry.ts` mostra ferramentas incríveis (`generate_image`, `edit_code`), mas falta a ferramenta de **Consciência Espacial e de Recursos**.
*   *Cenário:* O usuário pede *"Decore essa sala com móveis scifi"*.
*   *Falha Atual:* A IA não sabe quais móveis existem no projeto. Ela tentará gerar novos (caro/lento) ou falhará.

### 5.2 Nova Ferramenta Necessária: `query_assets`
Devemos adicionar ao `ai-tools-registry.ts`:
```typescript
{
  name: 'query_assets',
  description: 'Search for existing assets in the project library based on semantic tags or name.',
  parameters: [{ name: 'query', type: 'string', description: 'e.g., "scifi crate", "stone wall"' }],
  execute: async ({ query }) => {
    // Busca no DB Prisma ou Vector Store os assets compatíveis
    return [{ id: 'asset-123', path: '/uploads/crate_01.glb', type: 'mesh' }];
  }
}
```

### 5.3 O Agente "Librarian"
Uma IA autônoma que roda em background (Cron Job) analisando novos uploads:
1.  Detecta novo arquivo `cadeira.glb`.
2.  Gera thumbnail.
3.  Usa Vision API para taggear: `["chair", "furniture", "wood", "medieval"]`.
4.  Salva no DB para permitir busca semântica pelo usuário e por outros agentes.

---

## Doc 6 — Infra e CI/CD

### 6.1 Correção da Pipeline
*   **Arquivo:** `.github/workflows/ci.yml`.
*   **Ação:** Remover qualquer `|| true` remanescente. O build deve falhar se o TS falhar.
*   **Containerização:** Adicionar step de build e push do Docker do `execution-environment`.

---

## Doc 10 — Plano de Ação Tático (Priorizado)

### **Fase 1: Conectividade de Assets (Semana 1 - "The Wire up")**
Esta fase transforma o código existente em produto utilizável.
1.  **API de Listagem:** Criar endpoint `GET /api/projects/:id/assets` que lista arquivos do blob storage + metadados do Prisma.
2.  **Integração UI:** Modificar `EditorLayout.tsx` para buscar esses assets e injetar no `ContentBrowser` via prop `assets`.
3.  **Upload Real:** O botão "Upload" do `ContentBrowser` deve disparar um `POST /api/upload` que salva o arquivo e cria o registro no DB.

### **Fase 2: Playable & Compiled (Semana 2)**
1.  **Transpiler:** Integrar `esbuild-wasm` no browser.
2.  **Pipeline:** `Monaco` -> `OnChange` -> `esbuild` -> `Blob URL` -> `Dynamic Import` -> `GameLoop`.
3.  **Resultado:** O usuário edita um script de inimigo e ele muda de comportamento em < 500ms.

### **Fase 3: Inteligência de Ativos (Semana 3)**
1.  **Tool `query_assets`:** Implementar a busca de assets para a IA.
2.  **Tool `place_asset`:** O Agente deve poder chamar `place_object(asset_id, position)`.
3.  **Teste de Fogo:** Pedir ao Chatbot: *"Crie uma floresta aqui"*.
    *   A IA deve:
        1.  Chamar `query_assets("tree")`.
        2.  Receber lista de IDs.
        3.  Iterar e chamar `place_asset` com posições aleatórias.

### **Fase 4: Produto PWA (Semana 4)**
1.  **Manifest:** Criar o arquivo de metadados.
2.  **Offline:** Configurar cache de assets pesados (GLB/Textures) no Cache API do browser.

---
**Conclusão Final:**
O Aethel Engine tem **todas as peças do quebra-cabeça** na mesa (Physics, AI, Editor, Assets UI). O trabalho agora não é "criar", é "montar".
Concentre-se em **API Glue Code** (colar a API no Frontend) e **AI Tools Integration** (dar à IA acesso à API).
Passo 1: Faça o `ContentBrowser` mostrar os arquivos reais do servidor.
Passo 2: Dê a ferramenta de busca desses arquivos para a IA.
Passo 3: Profit.
