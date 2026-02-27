# RELATÓRIO DE UPGRADE: EDITOR 3D (2026-01-07)

## 🛠️ O QUE FOI FEITO
Respondendo ao comando "já possuímos muitas coisas", identificamos e upgradeamos o `SceneEditor.tsx` existente em vez de recriá-lo.

### 1. INTEGRAÇÃO FÍSICA REAL (Rapier WASM)
Criamos um componente ponte `components/scene-editor/GameSimulation.tsx`.
*   **Como funciona:** Quando você aperta "Play", este componente é montado. Ele inicializa o motor de física WASM, cria corpos rígidos para cada objeto da cena que tenha a propriedade `rigidbody`, e sincroniza a posição a cada frame (`useFrame`).
*   **Sem Mocks:** Usa a mesma `lib/physics-engine-real.ts` que o `GameLoop` principal.

### 2. UI DO EDITOR EXPANDIDA
Editamos `components/scene-editor/SceneEditor.tsx` para incluir um painel de **PHYSICS**.
*   **Checkbox:** Permite adicionar/remover componente `Rigidbody` em qualquer objeto.
*   **Propriedades:** Controle de Massa e Tipo (Dynamic, Static, Kinematic).
*   **Play Mode:** O botão "Play" agora realmente inicia a simulação. Objetos dinâmicos cairão e colidirão com objetos estáticos (ex: chão).

## 🚀 COMO TESTAR
1.  Abra o editor `/ide`.
2.  Crie um Cubo ("Mesh" -> "Box").
3.  Selecione o cubo e marque "Physics" no painel à direita.
4.  Defina como "Dynamic".
5.  Crie outro cubo embaixo, marque "Physics" e defina como "Static" (Chão).
6.  Aperte **Play**.
7.  O cubo deve cair e colidir fisicamente com o chão.

## 🏁 STATUS
O Editor Visual agora é funcional para prototipagem de física.
**Próximo Passo:** Integrar o "Asset Browser" (que já existe no código mas precisa ser conectado) para arrastar e soltar modelos 3D na cena.
