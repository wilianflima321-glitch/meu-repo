# ANÁLISE DE IMPACTO UX: AETHEL "PROTEUS"
**Data:** 13 de Janeiro de 2026
**Assunto:** Impacto da Arquitetura Polimórfica na Experiência do Usuário (UX)
**Para:** Liderança Técnica / Produto

---

## 1. Veredito Resumido
**A mudança NÃO será agressiva visualmente.** Pelo contrário, ela tornará a interface **mais limpa e intuitiva**.

A ideia da arquitetura "Proteus" não é mudar a "cara" do software, mas sim esconder ferramentas irrelevantes.
*   **Hoje:** O usuário vê botões de "Física" e "Luz" mesmo se estiver criando um jogo de cartas 2D (poluição visual).
*   **Com Proteus:** O usuário só vê o que é útil para o projeto dele.

**A identidade visual (Visual Identity) e o Layout Base (Docking, Menus, Explorer) permanecem 100% idênticos ao planejado.**

---

## 2. Como fica a Interface na Prática?

Imagine o **VS Code**.
*   Quando você abre um arquivo `.py` (Python), o VS Code muda agressivamente? **Não.**
*   Ele continua sendo o VS Code, mas o botão de "Run" roda Python, e o IntelliSense sugere comandos Python.
*   Se você abre um arquivo `.html`, o botão "Run" abre o browser.

**O Aethel Proteus funcionará exatamente assim:**

### Layout Base (Imutável - A Identidade do Aethel)
Estas áreas **NUNCA** mudam, garantindo que o usuário sempre se sinta "em casa":
1.  **Barra Lateral Esquerda:** Project Explorer, Search, Source Control (Git).
2.  **Barra Inferior:** Console, Logs, Terminal, AI Assistant.
3.  **Barra de Topo:** Menu (File, Edit), User Profile, Play/Build Buttons.
4.  **Painéis Flutuantes:** Sistema de Docking (arrastar janelas).

### Layout Contextual (O "Miolo" Inteligente)
Apenas a área central (Viewport) e a lateral direita (Propriedades) se adaptam:

| Tipo de Projeto | O que aparece no Centro (Viewport)? | O que aparece na Direita (Properties)? |
| :--- | :--- | :--- |
| **FPS / RPG (3D)** | Cena 3D (Three.js) com Gizmos de Transformação | Materiais PBR, Física, Colisão |
| **Plataforma 2D** | Canvas 2D (Pixi.js) com Grid | Sprite Sheet, Animação 2D |
| **Visual Novel** | Fluxograma de Nós (ReactFlow) | Editor de Texto Rico, Retratos |
| **UI Design** | Canvas WYSIWYG (Drag & Drop) | Cores, Bordas, Fontes (CSS Visual) |

---

## 3. Preservação dos Planos Originais

Tudo o que planejamos até agora **continua valendo** e se encaixa melhor nessa estrutura:

1.  **Marketplace:** Continua igual. A única diferença é que se você está num projeto 2D, o Marketplace filtra automaticamente assets 3D para não te confundir.
2.  **AI Director:** Continua sendo o painel lateral inteligente. Ele agora sabe em qual "modo" você está (ex: se está no modo 2D, ele não sugere "acender a luz", sugere "aumentar contraste do sprite").
3.  **CineLink / Audio Editor:** Funcionam como "Abas Especiais". Assim como no VS Code você abre uma aba de configurações, no Aethel você abre a aba "Audio Editor".

---

## 4. O Ganho de UX (Experiência do Usuário)

Essa arquitetura resolve um dos maiores problemas da Unreal Engine e Unity: **A Complexidade Esmagadora**.

*   **Na Unreal:** Você abre o editor e tem 500 botões. 90% você não usa no seu jogo simples. Isso assusta iniciantes.
*   **No Aethel Proteus:** O iniciante abre um template "Card Game" e vê apenas 5 botões relevantes. A curva de aprendizado cai drasticamente.
*   **Para o Pro (AAA):** Ele ativa o "Modo Avançado" e tem acesso a todos os renderizadores e ferramentas profundas.

## 5. Conclusão

Estamos construindo **EXATAMENTE** a Super IDE que planejamos.
A arquitetura Proteus é apenas a **engenharia invisível** que permite que essa IDE seja leve, rápida e não trave o navegador, carregando apenas o necessário.

**Interface:** Permanece familiar, profissional e consistente.
**Experiência:** Fica mais focada, rápida e menos confusa.
