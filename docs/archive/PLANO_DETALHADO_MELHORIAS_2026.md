# PLANO DETALHADO DE MUDANÇAS E MELHORIAS TÉCNICAS (2026)

Este documento detalha **item por item** as ações necessárias para elevar a Aethel Engine ao nível de competidores como Unreal e VS Code, baseado na auditoria profunda do código.

---

## 🏗️ 1. O NÚCLEO DA ENGINE (Cloud Web App)

### 1.1. Física e Simulação (AAA)
**Status:** Atualizado para Rapier (Física Real).
**Melhorias Necessárias:**
*   [ ] **Refatorar Componentes Antigos:** Buscar em todo o projeto (`grep`) por importações de `@react-three/cannon` restantes e substituir por `@react-three/rapier`.
*   [ ] **Debug Visual:** Adicionar um toggle na UI do Editor para `<Debug />` do Rapier (mostrar wireframes dos coliders).
*   [ ] **Performance:** Configurar o `step` da física para rodar em WebWorker separado (off-main-thread) para não travar a renderização gráfica em cenas complexas.

### 1.2. Áudio e Voz (Studio Quality)
**Status:** Editor de Nós excelente; Voz desconectada.
**Melhorias Necessárias:**
*   [ ] **Conexão TTS:** Criar um adaptador em `lib/ai-audio-engine.ts` que aceite uma API Key da ElevenLabs ou OpenAI para gerar voz real quando o usuário tiver créditos suficientes.
*   [ ] **Analisador Espectral:** O componente `WaveformRenderer` existe, mas precisa ser conectado ao `AudioContext.analyser` do nó de saída final para animar em tempo real durante o playback.

### 1.3. Pipeline de Assets (3D)
**Status:** Upload manual.
**Melhorias Necessárias:**
*   [ ] **Conversor Automático:** Criar uma *Edge Function* (ou container Docker temporário) que recebe `.fbx` e devolve `.gltf` otimizado (usando `glTF-Transform` ou Blender CLI).
*   [ ] **LOD Automático:** Implementar lógica para gerar 3 versões do modelo (High, Mid, Low) no upload e servir a correta baseada na distância da câmera.

---

## 💻 2. A IDE (Cloud IDE Desktop)

### 2.1. Identidade e Marca
**Status:** Fork funcional do Theia.
**Melhorias Necessárias:**
*   [ ] **Rebranding Global:** Substituir logos e strings "Theia" por "Aethel Studios" em `package.json`, `theia.json` e assets de imagem.
*   [ ] **Splash Screen:** Criar uma tela de carregamento nativa (Electron) com o logo Aethel enquanto o backend carrega.

### 2.2. Inteligência Nativa (O "Pulo do Gato")
**Status:** Suporte MCP, mas Agentes desconectados da "Consciência".
**Melhorias Necessárias:**
*   [ ] **Injeção de Cérebro:** Modificar o arquivo `TaskHandler` do IDE para importar o `SelfReflectionEngine` antes de executar comandos de terminal sugeridos pela IA.
*   [ ] **Contexto Local:** Garantir que o indexador local (RAG) ignore pastas como `node_modules` e `.git` para não estourar a memória RAM do usuário.

---

## 🧠 3. INTELIGÊNCIA ARTIFICIAL (O Cérebro)

### 3.1. Auto-Reflexão (Self-Correction)
**Status:** Arquivo criado (`lib/ai/self-reflection-engine.ts`), mas não conectado.
**Melhorias Necessárias:**
*   [ ] **Integration Point:** No arquivo `lib/ai-agent-system.ts`, dentro do método `thinkAndAct`, adicionar a chamada: `await selfReflection.reflectOnAction(proposedAction)`.
    *   *Se reprovado:* A IA deve receber o feedback e tentar de novo *sem* mostrar o erro ao usuário.
*   [ ] **Regras do Mundo:** Criar um arquivo JSON `world-rules.json` padrão (ex: "Gravidade existe", "Magia não existe") que o Editor possa modificar.

### 3.2. Memória Profunda (Deep Context)
**Status:** Arquivo criado, banco de dados pendente.
**Melhorias Necessárias:**
*   [ ] **Vector Store Lite:** Implementar uma versão local usando `HNSWLib` (in-memory) ou `SQLite-vss` para rodar no app Desktop sem precisar de servidor Pinecone caro.
*   [ ] **Snapshotting:** Criar rotina que salva o "Estado Mental" da IA junto com o commit do Git.

---

## ☁️ 4. INFRAESTRUTURA E CUSTOS

### 4.1. Modelo Híbrido (Viabilidade)
**Status:** Configuração atual é genérica.
**Melhorias Necessárias:**
*   [ ] **Docker Split:** Separar o `docker-compose.yml` em dois perfis:
    *   `profile: cloud` (API, Banco, Auth, Web).
    *   `profile: desktop` (Engine Local, Compiladores, LSP).
*   [ ] **Sync:** Implementar protocolo de sincronização eficiente (apenas deltas/diffs) para que o usuário trabalhe offline no Desktop e sincronize quando online.

### 4.2. Controle de Custos (Metering)
**Status:** UI (`CreditDisplay`) criada. Backend (`metering.ts`) existe.
**Melhorias Necessárias:**
*   [ ] **API Hook:** Inserir chamada `metering.trackUsage(userId, 'token_count', cost)` em todos os endpoints de IA (`/api/ai/chat`, `/api/ai/generate`).
*   [ ] **Bloqueio Rígido:** Se `credits <= 0`, o backend deve rejeitar requisições com erro 402 (Payment Required), e o Frontend deve abrir o modal `PremiumLock`.

---

## 🎨 5. INTERFACE E USABILIDADE

### 5.1. Admin Real (Ops)
**Status:** Limpo de fakes.
**Melhorias Necessárias:**
*   [ ] **Dashboard Real:** Criar painel em `admin/dashboard` que mostre: Qtd Usuários Online, Qtd Créditos Consumidos (Total), Erros de Aplicação (Logs).
*   [ ] **User Management:** Tabela real para banir usuários ou dar créditos manuais ("Grant Credits").

## � 6. INOVAÇÕES PROFISSIONAIS DE NÍVEL "ULTRA" (Diferenciais de Mercado)

### 6.1. Collaboration Engine (Real-time)
A pasta `aethel_theia_fork/packages/collaboration` existe mas parece vazia/incompleta.
*   [ ] **Implementar Y.js:** Integrar Y.js no editor Monaco (IDE) para permitir que dois usuários editem o mesmo arquivo ao mesmo tempo (como no Figma/Google Docs).
*   [ ] **Spectator Mode:** Permitir que um "Sênior" veja a tela de um "Júnior" sem editar, apenas guiando (cursor fantasma).

### 6.2. Native Performance Profiling (Desktop App)
O app Electron (`desktop-app/src/main.cjs`) é a chave para superar o navegador.
*   [ ] **GPU Pass-through:** Configurar o Electron para dar acesso direto à GPU (WebGPU) sem throttling do Chrome padrão.
*   [ ] **Profiler Nativo:** Criar um painel que mostre não só FPS, mas uso de RAM real do processo Node.js e temperaturas da CPU/GPU (crítico para devs de jogos).

### 6.3. Loja de Assets & Plugins (Marketplace)
Encontramos `packages/vsx-registry`. Isso é um servidor de marketplace privado.
*   [ ] **Plugin Signing:** Implementar assinatura digital para garantir que plugins da comunidade não roubem código.
*   [ ] **Asset Economy:** Criar um esquema JSON para "Asset Packs" (Model+Audio+Script) que possam ser vendidos por usuários com divisão de receita (70/30) via Stripe Connect.

### 6.4. Inteligência Personalizada (Fine-Tuning)
As pastas `ai-llamafile` e `ai-ollama` indicam suporte local.
*   [ ] **"Learn My Style":** Criar um agente que lê todo o repositório (`.git`) e cria um arquivo `.aethel/style-guide.md` automático, forçando a IA a seguir as convenções do usuário (tabs vs spaces, naming conventions).

## 📋 RESUMO DA PRIORIZAÇÃO

1.  **Imediato (Dia 1):** Conectar `SelfReflection` no Agente e substituir `Cannon` por `Rapier` globalmente.
2.  **Curto Prazo (Semana 1):** Rebranding IDE e Sistema de Créditos Real.
3.  **Médio Prazo (Mês 1):** Collaboration (Yjs) e Marketplace.

Este plano transforma o código atual em um **Produto Comercial Viável e Escalável**.

