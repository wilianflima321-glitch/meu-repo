# 🗺️ AETHEL UX JOURNEY MAP 2026
> **Mapeando a Experiência Emocional e Funcional do Usuário**

Este mapa define como o usuário deve se *sentir* a cada etapa e quais barreiras de fricção estamos removendo com a nova interface.

---

## 🧭 FASE 1: DESCOBERTA & ONBOARDING
**Objetivo:** Levar o usuário do "Curioso" ao "Impressionado" em 60 segundos.

| Etapa | Ação do Usuário | Resposta da Interface (O Ideal) | Sentimento Alvo | Fricção Atual (Para Eliminar) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Landing** | Abre a Engine pela 1ª vez. | **Nenhum login forçado.** Um "Playground" instantâneo carrega em <2s. Vídeo de fundo sutil. | 😲 *Wow, abriu rápido.* | Tela de Login bloqueante. Tela branca de loading. |
| **2. Welcome** | Vê a dashboard inicial. | Card "O que você quer criar hoje?" com 3 opções visuais grandes (Game, App, Automation). | 🧭 *Sei por onde começar.* | Menu cheio de opções técnicas ("New File", "Open Project"). |
| **3. First Prompt** | Digita "Jogo de nave". | A IA gera um protótipo jogável em 30s na Zone 3 enquanto "pensa" na Zone 1. | ⚡ *Poder Imediato.* | Ter que configurar pastas, criar arquivos vazios manualmente. |

---

## 🛠️ FASE 2: CRIAÇÃO & FLUXO (The Zone)
**Objetivo:** Manter o usuário no estado de "Flow", sem interrupções.

| Etapa | Ação do Usuário | Resposta da Interface | Sentimento Alvo | Fricção Atual (Para Eliminar) |
| :--- | :--- | :--- | :--- | :--- |
| **4. Iteração** | Pede uma mudança ("Mude a cor"). | A mudança acontece visualmente sem reload completo da página (Hot Reload). | 🌊 *Fluidez.* | Refresh da página inteira. Perda de estado. |
| **5. Dúvida** | Trava na lógica. | A IA percebe a pausa ou erro e sugere: "Quer ajuda com a física?". | 🤝 *Amparo.* | Buscar no Google/StackOverflow em outra janela. |
| **6. Navegação** | Precisa achar um asset. | Abre a gaveta de assets (`Ctrl+J`) sem sair do contexto da cena. | 🧘 *Foco.* | Trocar de tela para "Asset Manager". |

---

## 🚀 FASE 3: PUBLICAÇÃO & SUCESSO
**Objetivo:** Transformar o projeto em produto real com um clique.

| Etapa | Ação do Usuário | Resposta da Interface | Sentimento Alvo | Fricção Atual (Para Eliminar) |
| :--- | :--- | :--- | :--- | :--- |
| **7. Build** | Clica em "Publicar". | Barra de progresso real. Link de preview instantâneo compartilhavel. | 🎉 *Conquista.* | Logs crípticos de terminal. Erros de CI/CD não explicados. |
| **8. Share** | Manda link pro amigo. | O link abre uma versão "Player" otimizada do projeto (sem a IDE). | 🌟 *Orgulho.* | Links quebrados ou que exigem login para ver. |

---

## 🧠 PRINCÍPIOS DE OURO DA UX AETHEL

1.  **Nunca Bloqueie:** Nunca coloque um modal modal (que bloqueia tudo) a menos que seja destrutivo (Deletar Projeto). Use *Toasts* ou *Non-blocking Popovers*.
2.  **Otimismo na UI:** Se o usuário clicou "Salvar", diga "Salvo!" instantaneamente e processe em background. Não mostre "Salvando..." por 3 segundos.
3.  **Undo Infinito:** O usuário deve ter confiança para quebrar coisas. "Ctrl+Z" deve funcionar para código, movimentação de objetos e até deleção de arquivos.
4.  **Vocabulário Humano:**
    *   ❌ Não use: "Initializing repository..."
    *   ✅ Use: "Preparando seu espaço criativo..."
    *   ❌ Não use: "Compilation Error Exception Null..."
    *   ✅ Use: "Ops, parece que a variável 'Player' não foi definida."

---

**Métrica de Sucesso:** Se o usuário precisar ler um manual para fazer o "Hello World", nós falhamos.
