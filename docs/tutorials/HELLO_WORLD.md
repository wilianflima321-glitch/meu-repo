# Tutorial: Hello World no Aethel Engine

> **Tempo estimado:** 15-20 minutos  
> **Nível:** Iniciante  
> **O que você vai criar:** Um cubo 3D animado com partículas e iluminação

---

## 📚 Índice

1. [Pré-requisitos](#-pré-requisitos)
2. [Criando seu Projeto](#-criando-seu-projeto)
3. [Adicionando um Cubo 3D](#-adicionando-um-cubo-3d)
4. [Aplicando Materiais](#-aplicando-materiais)
5. [Animação com IA](#-animação-com-ia)
6. [Adicionando Partículas](#-adicionando-partículas)
7. [Exportando](#-exportando)
8. [Próximos Passos](#-próximos-passos)

---

## 🔧 Pré-requisitos

Antes de começar, certifique-se de que você tem:

### Software Necessário

| Software | Versão Mínima | Download |
|----------|---------------|----------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org) |
| **Blender** | 4.0+ | [blender.org](https://blender.org) |
| **Git** | Qualquer | [git-scm.com](https://git-scm.com) |

### Opcional (Recomendado)

- **Ollama** (para IA local): [ollama.ai](https://ollama.ai)
- **VS Code** (para edição): [code.visualstudio.com](https://code.visualstudio.com)

### Verificando Instalações

Abra um terminal e execute:

```bash
# Node.js
node --version  # Deve mostrar v18.x.x ou superior

# Blender (caminho pode variar)
blender --version  # Deve mostrar 4.x

# Git
git --version
```

---

## 🚀 Criando seu Projeto

### 1. Clone o Repositório (se ainda não fez)

```bash
git clone https://github.com/seu-usuario/aethel-engine.git
cd aethel-engine
```

### 2. Instale as Dependências

```bash
# Instale tudo
npm install

# Ou use o script de setup
npm run setup
```

### 3. Inicie o Servidor

```bash
# Em um terminal
npm run server

# Em outro terminal
npm run dev
```

### 4. Acesse a Interface

Abra seu navegador em: **http://localhost:3000**

Você verá a tela inicial do Aethel Engine:

```
┌──────────────────────────────────────────────────────────┐
│  🎮 AETHEL ENGINE                    [New] [Open] [?]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│    ┌──────────────────────────────────────┐              │
│    │                                      │              │
│    │        Welcome to Aethel!            │              │
│    │                                      │              │
│    │   Create your first project:         │              │
│    │                                      │              │
│    │   [  New 3D Game Project  ]          │              │
│    │   [  New 2D Game Project  ]          │              │
│    │   [  Open Existing        ]          │              │
│    │                                      │              │
│    └──────────────────────────────────────┘              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🧊 Adicionando um Cubo 3D

### Método 1: Interface Visual

1. Clique em **"New 3D Game Project"**
2. Dê um nome: `HelloWorld`
3. Na barra lateral esquerda, clique em **"+"** → **"3D Object"** → **"Cube"**

### Método 2: Usando o Chat com IA

Digite no chat de IA:

```
Crie um cubo 3D vermelho no centro da cena
```

A IA vai gerar o código e adicionar automaticamente:

```typescript
// Código gerado pela IA
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ 
  color: 0xff0000,
  metalness: 0.3,
  roughness: 0.4
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
```

### Resultado

Você verá um cubo vermelho no viewport 3D:

```
       ____________
      /           /|
     /           / |
    /___________/  |
    |           |  |
    |    🔴     |  /
    |           | /
    |___________|/
```

---

## 🎨 Aplicando Materiais

### Acessando o Editor de Materiais

1. Selecione o cubo clicando nele
2. No painel direito, clique em **"Materials"**
3. Você verá as opções:

```
┌─────────────────────────────┐
│ 📦 Cube - Material          │
├─────────────────────────────┤
│ Type: [ Standard ▼]         │
│                             │
│ Color: [■■■■■■■] #FF0000    │
│ Metalness: [========] 0.5   │
│ Roughness: [====----] 0.3   │
│                             │
│ Maps:                       │
│ ├─ Diffuse: [None]          │
│ ├─ Normal:  [None]          │
│ └─ Emissive:[None]          │
│                             │
│ [Apply] [AI Suggest]        │
└─────────────────────────────┘
```

### Usando IA para Materiais

Digite no chat:

```
Aplique um material de metal cromado com reflexos ao cubo
```

A IA ajustará automaticamente os parâmetros:

```typescript
material.metalness = 0.95;
material.roughness = 0.05;
material.envMapIntensity = 1.5;
```

---

## ⚡ Animação com IA

Aqui está onde o Aethel brilha! Vamos criar uma animação apenas descrevendo-a.

### Passo 1: Descreva a Animação

Digite no chat:

```
Faça o cubo girar lentamente no eixo Y e flutuar suavemente para cima e para baixo
```

### Passo 2: Código Gerado

A IA vai gerar:

```typescript
// Animação gerada pela IA
const animate = () => {
  // Rotação no eixo Y
  cube.rotation.y += 0.01;
  
  // Flutuação suave usando seno
  cube.position.y = Math.sin(Date.now() * 0.001) * 0.5;
  
  requestAnimationFrame(animate);
};
animate();
```

### Passo 3: Prévia

Clique em **"▶ Play"** para ver a animação em tempo real!

---

## ✨ Adicionando Partículas

### Pedindo para a IA

Digite:

```
Adicione partículas brilhantes orbitando ao redor do cubo
```

### Sistema Gerado

```typescript
// Sistema de partículas gerado
const particles = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.1,
    transparent: true,
    opacity: 0.8
  })
);

// 100 partículas em órbita
const positions = new Float32Array(100 * 3);
for (let i = 0; i < 100; i++) {
  const angle = (i / 100) * Math.PI * 2;
  const radius = 3 + Math.random();
  positions[i * 3] = Math.cos(angle) * radius;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
  positions[i * 3 + 2] = Math.sin(angle) * radius;
}
particles.geometry.setAttribute('position', 
  new THREE.BufferAttribute(positions, 3)
);
scene.add(particles);
```

### Resultado Visual

```
              ✦   
          ✦       ✦
        ✦   ┌───┐   ✦
       ✦    │ 🔴│    ✦
        ✦   └───┘   ✦
          ✦       ✦
              ✦
```

---

## 📤 Exportando

### Opções de Exportação

1. Clique em **File** → **Export**
2. Escolha o formato:

| Formato | Uso |
|---------|-----|
| **GLTF/GLB** | Web, Three.js, Unity |
| **FBX** | Unreal Engine, Maya |
| **OBJ** | Universal, básico |
| **MP4** | Vídeo renderizado |
| **PNG Sequence** | After Effects |

### Exportando para Web

```bash
# Exportar como GLTF otimizado
File → Export → GLTF Binary (.glb)
```

### Exportando Vídeo (Renderizado)

1. **File** → **Render** → **Video**
2. Configurações:
   - Resolução: 1920x1080
   - FPS: 60
   - Duração: 5 segundos
   - Codec: H.264

3. Clique em **"Render"**

O Aethel vai usar o Blender local para renderizar em alta qualidade!

---

## 🎯 Próximos Passos

Parabéns! Você criou sua primeira cena no Aethel Engine! 🎉

### Tutoriais Recomendados

1. **[Criando um Personagem 3D](./PERSONAGEM_3D.md)** - Modelagem e rigging com IA
2. **[Sistema de Iluminação](./ILUMINACAO.md)** - HDRi, sombras, GI
3. **[Física e Colisões](./FISICA.md)** - Integração com Rapier
4. **[Deploy para Web](./DEPLOY_WEB.md)** - Publicando seu jogo

### Atalhos Úteis

| Atalho | Ação |
|--------|------|
| `Ctrl+Z` | Desfazer |
| `Ctrl+S` | Salvar |
| `Space` | Play/Pause |
| `F` | Focar no objeto |
| `G` | Mover objeto |
| `R` | Rotacionar |
| `S` | Escalar |
| `Ctrl+Enter` | Enviar prompt para IA |

### Comunidade

- **Discord:** [discord.gg/aethel](https://discord.gg/aethel)
- **GitHub:** [github.com/aethel-engine](https://github.com/aethel-engine)
- **Docs:** [docs.aethel.io](https://docs.aethel.io)

---

## 🆘 Troubleshooting

### Problema: "Blender não encontrado"

```bash
# Defina o caminho manualmente em Settings → Paths → Blender
# Ou via ambiente:
export BLENDER_PATH=/path/to/blender
```

### Problema: "IA não responde"

1. Verifique se Ollama está rodando: `ollama list`
2. Ou configure API key da OpenAI em Settings → AI → API Key

### Problema: "Viewport lento"

1. Reduza a qualidade em Settings → Performance
2. Ative "Low Detail Mode" para cenas complexas

---

> **Dica Final:** Use a IA para tudo! Quanto mais você descrever, melhor ela entende. Experimente comandos como:
> - "Crie uma floresta low-poly"
> - "Adicione iluminação dramática de pôr do sol"
> - "Faça o personagem andar quando eu apertar W"

Divirta-se criando! 🚀
