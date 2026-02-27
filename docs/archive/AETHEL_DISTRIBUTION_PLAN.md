# PLANO DE DISTRIBUIÇÃO E VIABILIDADE ECONÔMICA: AETHEL ENGINE

## 1. Viabilidade Econômica (O Modelo "Local-First")
A viabilidade econômica do Aethel se baseia na eliminação do custo de servidor centralizado para computação pesada.

*   **Custo Zero de Render:** O Blender roda na GPU do usuário.
*   **Custo Zero de Hospedagem:** O preview roda em `localhost:3000`.
*   **Custo Zero de Colaboração:** A sincronização é P2P (WebRTC). O servidor Aethel (4000) apenas faz o "signaling" (leve como texto).
*   **Custo de IA (Opcional):** O usuário traz sua própria chave (BYOK - Bring Your Own Key) ou usa Ollama localmente.

**Veredito:** O modelo é **altamente viável**. O custo marginal por novo usuário é próximo de zero.

## 2. Estratégia "Downloadable IDE" (Como empacotar tudo)
Para tornar o Aethel um software instalável "clique-e-rode", precisamos unificar os 3 componentes (Desktop, Web, Server) em um único binário.

### A. Estrutura do Instalador (Electron Builder)
O `cloud-ide-desktop` será o "Parent Process".
1.  **Ao Iniciar (main.cjs):**
    *   Inicia o `Unified Gateway` (Fork do processo Node.js na porta 4000).
    *   Inicia o Servidor de Arquivos Estáticos (Servindo o export do Next.js).
    *   Abre a janela do Electron carregando `Theia` e injetando a UI Web.

### B. O Que Precisa Ser Feito (Gap Técnico)

#### 1. Consolidação do Build (Prioridade Alta)
*   **Ação:** Configurar o Next.js no `cloud-web-app` para `output: 'export'` (HTML estático) ou `standalone`.
*   **Motivo:** Evitar que o usuário precise ter Node.js instalado. O Electron deve embutir o Node necessário.
*   **Code Change:** Editar `cloud-ide-desktop/desktop-app/src/main.cjs` para spawnar o servidor `server/dist/unified-gateway.js`.

#### 2. Pipeline de Exportação de Jogo (O "Game Packager")
O usuário precisa de um botão "Build Game" que faça o seguinte:
*   Pega o JSON do projeto (Level, Assets).
*   Pega um "Runtime Template" (uma versão minúscula do Aethel sem editores).
*   Empacota tudo num `.exe`.
*   **Status Atual:** INEXISTENTE. Precisa ser criado.

#### 3. Polimento e Otimização
*   **Unified Console:** Atualmente os logs da Web ficam no DevTools do Chrome. Precisam ir para o Terminal do Theia.
*   **Offline Mode:** O `cloud-web-app` tenta conectar no Clerk/Auth0? Devemos ter um "Offline Dev Mode" que ignora auth externo.

## 3. Roteiro de Melhorias (Polimento)

| Área | Melhoria Necessária | Complexidade |
| :--- | :--- | :--- |
| **Instalação** | Criar instalador único (.msi/.exe) que instala Blender e FFMPEG se não existirem. | Média |
| **Performance** | Mover lógica de física (Rapier) para WebWorkers para não travar a UI. | Alta |
| **UI/UX** | Unificar temas com tokens CSS compartilhados (para que o Theia e o Next.js pareçam o mesmo app). | Baixa |
| **Linux** | Testar e validar o build em Ubuntu/Arch (atualmente focado em Windows). | Média |

## 4. Conclusão
O projeto é viável e distribuível. A arquitetura "Hybrid Electron" permite que entreguemos uma experiência Web moderna dentro de um container Desktop robusto, sem custos recorrentes de nuvem.
