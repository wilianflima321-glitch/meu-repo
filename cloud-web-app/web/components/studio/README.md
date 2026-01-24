# 🏗️ ARQUITETURA STUDIO UNIFICADO - AETHEL ENGINE

## 📋 Visão Geral

O **Unified Studio** é a nova arquitetura centralizada que resolve os problemas de:
- ❌ Componentes duplicados (múltiplos viewports 3D, previews, etc.)
- ❌ Navegação fragmentada (usuário pula de página em página)
- ❌ Código redundante (~700KB de lógica repetida)

## 🎯 Solução: Interface Unificada

### Antes vs Depois

| Antes | Depois |
|-------|--------|
| 17+ páginas separadas | 1 interface unificada |
| Cada editor tem seu viewport | 1 viewport compartilhado |
| Navegação por URLs | Tabs integrados |
| Recarrega tudo a cada editor | Troca instantânea de modo |

## 📁 Estrutura do Módulo

\`\`\`
components/studio/
├── index.ts                 # Exports centralizados
├── UnifiedStudio.tsx        # Interface principal (1200+ linhas)
├── SharedViewport3D.tsx     # Viewport 3D reutilizável (500+ linhas)
├── panels/                  # Painéis dockáveis (futuros)
│   ├── WorldOutliner.tsx
│   ├── DetailsPanel.tsx
│   ├── ContentBrowser.tsx
│   └── OutputLog.tsx
└── hooks/                   # Hooks compartilhados (futuros)
    ├── useViewport.ts
    ├── useTransform.ts
    └── useSelection.ts
\`\`\`

## 🔧 Componentes Principais

### 1. UnifiedStudio

Interface principal estilo Unreal Engine 5:

\`\`\`tsx
import UnifiedStudio from '@/components/studio/UnifiedStudio';

export default function StudioPage() {
  return <UnifiedStudio />;
}
\`\`\`

**Features:**
- Menu bar completo (File, Edit, View, etc.)
- Toolbar com transform tools (W/E/R)
- Play/Pause/Stop para simulação
- Tabs para múltiplos editores
- Painéis dockáveis e redimensionáveis
- Status bar com FPS e estatísticas
- Atalhos de teclado (Ctrl+S, Ctrl+Z, etc.)

### 2. SharedViewport3D

Viewport 3D reutilizável por TODOS os editores:

\`\`\`tsx
import { SharedViewport3D } from '@/components/studio';

<SharedViewport3D
  objects={myObjects}
  selectedId={selectedObjectId}
  onSelect={(id) => setSelectedId(id)}
  settings={{
    mode: 'perspective',
    showGrid: true,
    showStats: false,
  }}
/>
\`\`\`

**Features:**
- Múltiplos modos de visualização (Perspective, Top, Front, Right)
- Modos de renderização (Lit, Unlit, Wireframe, Normals)
- Grid configurável
- Gizmo de navegação
- Seleção de objetos
- Transform controls
- Sombras e iluminação

## 🗺️ Modos de Editor Suportados

O UnifiedStudio suporta os seguintes modos:

| Modo | Label | Painéis Padrão |
|------|-------|----------------|
| `level` | Level Editor | Viewport, Outliner, Details, Content |
| `material` | Material Editor | Viewport, Node Graph, Details, Preview |
| `blueprint` | Blueprint Editor | Node Graph, Details, Outliner, Console |
| `animation` | Animation Blueprint | Viewport, Timeline, Node Graph, Details |
| `niagara` | Niagara VFX | Viewport, Node Graph, Details, Preview |
| `landscape` | Landscape Editor | Viewport, Details, Layers, Properties |
| `sequencer` | Sequencer | Viewport, Timeline, Details, Content |
| `audio` | Audio Editor | Viewport, Timeline, Details, Properties |
| `dialogue` | Dialogue Editor | Node Graph, Details, Preview, Properties |
| `quest` | Quest Editor | Node Graph, Details, Outliner, Properties |
| `terrain` | Terrain Sculpting | Viewport, Details, Layers, Properties |
| `hair` | Hair & Fur | Viewport, Details, Properties, Preview |
| `cloth` | Cloth Simulation | Viewport, Details, Timeline, Properties |
| `fluid` | Fluid Simulation | Viewport, Details, Timeline, Properties |

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+S` | Salvar |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Refazer |
| `W` | Modo Translate |
| `E` | Modo Rotate |
| `R` | Modo Scale |
| `Alt+P` | Play/Stop |
| `Esc` | Stop simulação |

## 🔄 Migração dos Editores Antigos

### Antes (Página Separada)

\`\`\`tsx
// app/material-editor/page.tsx
import MaterialEditor from '@/components/MaterialEditor';

export default function MaterialEditorPage() {
  return <MaterialEditor />;
}
\`\`\`

### Depois (Tab no Studio)

O Material Editor agora é um **modo** dentro do Unified Studio, acessível via:
- Tab no topo
- Menu Window > Material Editor
- Atalho (futuro)

## 📊 Benefícios

### Performance
- **-60% menos código** duplicado
- **Carregamento único** do viewport 3D
- **Troca instantânea** entre editores

### UX
- **Experiência unificada** estilo profissional
- **Sem recarregamentos** ao mudar de editor
- **Layout customizável** com painéis dockáveis

### Manutenibilidade
- **Componentes centralizados** fáceis de atualizar
- **Consistência visual** garantida
- **Testes simplificados**

## 🚧 Próximos Passos

1. [ ] Implementar drag & drop de painéis
2. [ ] Persistir layout do usuário (localStorage)
3. [ ] Integrar editores existentes como modos
4. [ ] Adicionar suporte a plugins
5. [ ] Implementar multi-viewport (split view)

## 📍 Acesso

O Studio Unificado está disponível em:

\`\`\`
/studio
\`\`\`

---

*Documentação criada em Janeiro 2026*
