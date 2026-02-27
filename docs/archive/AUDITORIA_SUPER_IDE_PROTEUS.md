# AUDITORIA "PROTEUS": ARQUITETURA DE SUPER IDE POLIMÓRFICA (AAA)
**Data:** 09 de Janeiro de 2026
**Objetivo:** Transformar o Aethel em uma "Super IDE" que se adapta a qualquer gênero (2D, 3D, Filme, App) sem alterar sua interface visual, eliminando o débito técnico de engines monolíticas.
**Auditor:** GitHub Copilot (Chief Architect)

---

## 📑 ÍNDICE

1.  **[O Problema: A Armadilha do Monólito](#o-problema)**
2.  **[A Solução: Arquitetura Polimórfica (Proteus)](#a-solucao)**
3.  **[Doc 1: O "Kernel" da IDE (Agnosticismo Total)](#doc-1-kernel)**
4.  **[Doc 2: O Sistema de "Cartuchos" (Game Cartridges)](#doc-2-cartuchos)**
5.  **[Doc 3: A UI Adaptativa (Data-Driven UI)](#doc-3-ui-adaptativa)**
6.  **[Doc 4: O Compilador Universal (Transpiler)](#doc-4-compilador)**
7.  **[Plano de Migração: De Monólito para Proteus](#plano-migracao)**

---

## <a name="o-problema"></a> 1. O Problema: A Armadilha do Monólito

**Diagnóstico Atual:**
O arquivo `aethel-engine.ts` importa estaticamente `PhysicsWorld`, `NavigationMesh`, `TerrainEngine`.
Isso significa que se você quiser criar um jogo de cartas 2D (Card Game), você está carregando o peso morto de um sistema de Terreno 3D e Física Rígida que não vai usar.

**A Limitação AAA:**
AAA não significa apenas gráficos bonitos. Significa **Especialização**. Um jogo como *GTA* precisa de um sistema de streaming de cidade. Um jogo como *Civilization* precisa de IA de turno. Uma engine única que tenta fazer tudo (Generalista) acaba fazendo tudo de forma "média".

---

## <a name="a-solucao"></a> 2. A Solução: Arquitetura Polimórfica (Proteus)

Propomos reescrever o "Core" do Aethel para ser um **Orquestrador de Contexto**, não uma Engine de Jogo.

*   **Aethel IDE:** É apenas uma "Casca" (Shell) visual que renderiza dados.
*   **O Jogo:** Define o que os dados significam.

---

## <a name="doc-1-kernel"></a> Doc 1: O "Kernel" da IDE (Agnosticismo Total)

A IDE não deve saber o que é um "Player" ou um "Inimigo". Ela deve saber apenas o que é uma **Entidade** com **Componentes**.

**Novo Modelo de Dados (Universal Schema):**
Em vez de classes hardcoded, usamos um JSON Schema dinâmico:

```typescript
// O 'Kernel' só entende isso:
interface Entity {
  id: string;
  components: GenericComponent[];
}

interface GenericComponent {
  type: string; // ex: "PhysicsBody" ou "CardStats"
  data: Record<string, any>; // O Kernel não valida isso, o Cartucho valida.
}
```

**Benefício:** A mesma IDE edita um FPS (onde Componente = `RigidBody`) e uma Visual Novel (onde Componente = `DialogueNode`) sem mudar uma linha de código do editor.

---

## <a name="doc-2-cartuchos"></a> Doc 2: O Sistema de "Cartuchos" (Game Cartridges)

Para gerar jogos diferentes internamente, criamos o conceito de **Cartuchos de Engine**.

*   **Cartucho "Aethel 3D" (Padrão):**
    *   *Backend:* Three.js + Rapier.
    *   *Uso:* Jogos de ação, RPGs 3D.
*   **Cartucho "Aethel 2D":**
    *   *Backend:* Pixi.js (ou Canvas 2D) + Matter.js.
    *   *Uso:* Platformers, Jogos de Puzzle.
*   **Cartucho "Aethel Narrative":**
    *   *Backend:* HTML/CSS puro + State Machine.
    *   *Uso:* Visual Novels, Jogos incrementais.

**Como funciona na IDE:**
Quando o usuário cria um projeto, ele escolhe o Cartucho. O Aethel carrega o módulo WASM/JS correspondente.
O `Viewport` da IDE pergunta ao Cartucho: *"Como eu renderizo isso?"*
*   O Cartucho 3D responde: *"Desenhe este modelo GLB."*
*   O Cartucho 2D responde: *"Desenhe este Sprite."*

---

## <a name="doc-3-ui-adaptativa"></a> Doc 3: A UI Adaptativa (Data-Driven UI)

Para evitar reescrever painéis para cada tipo de jogo, a UI deve ser gerada automaticamente a partir da definição do componente.

**Protocolo de Definição de UI (UIDL):**
O Cartucho envia para a IDE:
```json
{
  "component": "CarEngine",
  "properties": [
    { "name": "Horsepower", "type": "slider", "min": 100, "max": 1000 },
    { "name": "Sound", "type": "asset_picker", "filter": "audio" }
  ]
}
```
A IDE desenha o painel de propriedades automaticamente.

**Superpoder AAA:** Isso permite criar ferramentas customizadas extremamente complexas (ex: um editor de estradas procedurais) apenas definindo o Schema, sem programar UI React.

---

## <a name="doc-4-compilador"></a> Doc 4: O Compilador Universal (Transpiler)

A grande mágica para evitar limitações. O botão "Build" não é estático.

**O Pipeline do Camaleão:**
1.  **Entrada:** Aethel Scene Graph (JSON genérico).
2.  **Processador:** O Cartucho ativo traduz o JSON para o código-alvo.
    *   Se for um jogo Web: Gera React/Three.js.
    *   Se for um jogo High-Perf: Pode gerar C++ / WebAssembly (futuro).
    *   Se for um App Mobile: Gera React Native.

Isso permite que o Aethel seja usado para criar **Apps utilitários** ou **Filmes** (renderizando com Blender no backend) sem mudar a ferramenta.

---

## <a name="plano-migracao"></a> Plano de Migração: De Monólito para Proteus

Para chegar nessa "Super IDE" sem quebrar o que já existe:

### Fase 1: Abstração do Viewport (Mês 1)
Refatorar o componente `Viewport` para não importar `Three.js` diretamente, mas usar uma interface `IRendererProvider`.
*   *Teste:* Criar um "Renderer 2D" simples que só desenha quadrados, e alternar entre 3D/2D em tempo real.

### Fase 2: Componentes Dinâmicos (Mês 2)
Substituir o painel de propriedades hardcoded por um "Schema Inspector" que lê definições JSON.
*   *Teste:* Criar um componente customizado "WeaponStats" via JSON e ver ele aparecer na UI sem recompilar a IDE.

### Fase 3: Cartuchos WASM (Mês 3+)
Isolar a lógica de física e loop de jogo em módulos separados.
*   *Meta:* Poder descarregar o motor de física inteiro da memória quando estiver editando um jogo de cartas (que não usa física), liberando RAM para IA.

---

## Conclusão
Esta arquitetura **Proteus** transforma o Aethel de "Mais uma Game Engine Web" para um **"Sistema Operacional de Criação"**.

Ao desacoplar a **Visualização** (IDE) da **Execução** (Cartucho), eliminamos o teto de qualidade. Se amanhã sair uma nova tecnologia de renderização (ex: WebGPU 2.0), basta criar um novo Cartucho, e a IDE continua a mesma, mas os jogos gerados se tornam "Next-Gen" instantaneamente.
