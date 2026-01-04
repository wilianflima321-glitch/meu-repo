# 🚀 GUIA DE USO RÁPIDO - SISTEMAS AAA

## 📦 NOVOS ARQUIVOS CRIADOS

1. **[aaa-asset-pipeline.ts](../lib/aaa-asset-pipeline.ts)** - Pipeline completo de assets
2. **[aaa-render-system.ts](../lib/aaa-render-system.ts)** - Sistema de renderização AAA
3. **[ai-content-generation.ts](../lib/ai-content-generation.ts)** - Geração de conteúdo com IA
4. **[aaa-material-system.ts](../lib/aaa-material-system.ts)** - Sistema de materiais avançados
5. **[cinematic-lighting.ts](../lib/cinematic-lighting.ts)** - Sistema de iluminação cinematográfica
6. **[AAA_ANALYSIS_AND_ROADMAP.md](../docs/AAA_ANALYSIS_AND_ROADMAP.md)** - Análise completa e roadmap

---

## 🎯 EXEMPLOS DE USO

### 1. **IMPORTAR ASSETS AAA**

```typescript
import { assetImporter, assetDatabase } from './lib/aaa-asset-pipeline';

// Importar modelo GLTF com LODs automáticos
const meshAsset = await assetImporter.import('building.glb', {
  generateLODs: true,
  lodLevels: 4,
  lodReduction: [1, 0.5, 0.25, 0.125],
  generateAIMetadata: true,
});

// Adicionar ao database
assetDatabase.add(meshAsset);

// Buscar assets por tag de IA
const metalAssets = assetDatabase.getByTag('metallic');

// Buscar similares
const similar = assetDatabase.findSimilar(meshAsset.id);
```

---

### 2. **CRIAR MATERIAIS AAA**

```typescript
import { AdvancedPBRMaterial, MaterialLibrary } from './lib/aaa-material-system';

// Usar preset
const carPaint = MaterialLibrary.createMaterial('car-paint');

// Ou criar custom
const customMaterial = new AdvancedPBRMaterial({
  albedo: new THREE.Color(1, 0, 0),
  metallic: 0.8,
  roughness: 0.2,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  normalMap: normalTexture,
  heightMap: heightTexture,
  heightScale: 0.1,
});

// Aplicar em mesh
mesh.material = customMaterial;
```

**Presets disponíveis**:
- `metal/iron`, `metal/gold`, `metal/copper`, `metal/aluminum`
- `plastic/glossy`, `plastic/matte`
- `glass/clear`, `glass/frosted`
- `fabric/velvet`, `fabric/silk`
- `car-paint`, `skin/caucasian`, `wax`

---

### 3. **GERAR CONTEÚDO PROCEDURAL**

```typescript
import { 
  proceduralMeshGenerator, 
  aiTextureGenerator,
  levelGenerator 
} from './lib/ai-content-generation';

// Gerar prédio
const buildingGeom = proceduralMeshGenerator.generate({
  primitive: 'building',
  seed: 12345,
  complexity: 0.8,
  variation: 0.5,
  scale: [10, 30, 10],
  buildingHeight: 30,
  buildingFloors: 10,
});

// Gerar árvore
const treeGeom = proceduralMeshGenerator.generate({
  primitive: 'tree',
  seed: 67890,
  complexity: 0.7,
  variation: 0.6,
  scale: [1, 15, 1],
  treeSpecies: 'oak',
});

// Gerar textura PBR
const brickAlbedo = await aiTextureGenerator.generate({
  type: 'albedo',
  resolution: 1024,
  style: 'photorealistic',
  material: 'brick',
  seed: 123,
  seamless: true,
});

const brickNormal = await aiTextureGenerator.generate({
  type: 'normal',
  resolution: 1024,
  material: 'brick',
  seed: 123,
  seamless: true,
});

// Gerar cidade completa
const cityGroup = levelGenerator.generate({
  type: 'city',
  size: [1000, 0, 1000],
  complexity: 0.8,
  seed: 999,
});

scene.add(cityGroup);
```

---

### 4. **CONFIGURAR RENDER AAA**

```typescript
import AAARenderSystem from './lib/aaa-render-system';

const renderSystem = new AAARenderSystem(renderer, scene, camera, {
  type: 'forwardPlus',
  hdr: true,
  toneMapping: THREE.ACESFilmicToneMapping,
  shadowMapEnabled: true,
  shadowMapSize: 4096,
});

// Configurar Global Illumination
renderSystem.setupGlobalIllumination({
  method: 'ssgi',
  intensity: 1.0,
  bounces: 1,
  ssgiSamples: 16,
});

// Configurar Volumetrics
renderSystem.setupVolumetrics({
  enabled: true,
  method: 'froxel',
  fogDensity: 0.01,
  godRaysEnabled: true,
});

// Configurar Shadows
renderSystem.setupShadows({
  technique: 'cascaded',
  resolution: 2048,
  cascades: 4,
  contactShadows: true,
});

// Configurar Post-Processing
renderSystem.setPostProcessing({
  antialiasing: 'taa',
  ssao: { enabled: true, radius: 0.5, samples: 16 },
  ssr: { enabled: true, maxDistance: 50 },
  bloom: { enabled: true, threshold: 0.8, strength: 0.3 },
  dof: { enabled: false },
  motionBlur: { enabled: true, samples: 16 },
  colorGrading: { enabled: true, saturation: 1.1 },
  vignette: { enabled: true, darkness: 0.5 },
  filmGrain: { enabled: true, intensity: 0.05 },
});

// Renderizar
function animate() {
  requestAnimationFrame(animate);
  renderSystem.render();
}
animate();
```

---

### 5. **ILUMINAÇÃO CINEMATOGRÁFICA**

```typescript
import { 
  ThreePointLighting, 
  TimeOfDaySystem,
  LightingPresets 
} from './lib/cinematic-lighting';

// Three-point lighting (studio)
const threePoint = new ThreePointLighting();
threePoint.addToScene(scene);
threePoint.setTarget(mainCharacter);

// Ajustar intensidades
threePoint.keyLight.setIntensity(2.5);
threePoint.fillLight.setIntensity(0.8);
threePoint.rimLight.setIntensity(1.2);

// Time of Day
const tod = new TimeOfDaySystem({
  latitude: 40,
  longitude: -74,
  sunIntensity: 1.5,
});
tod.addToScene(scene);

// Definir hora
tod.setTime(17); // Golden hour (5pm)

// Animar (acelerar tempo)
tod.startAnimation(60); // 60 horas por segundo

function animate(deltaTime) {
  tod.update(deltaTime);
}

// Ou usar presets
const goldenHour = LightingPresets.getPreset('golden-hour');
if (goldenHour) {
  goldenHour.forEach(light => scene.add(light.getLight()));
}
```

---

### 6. **CRIAR CENA AAA COMPLETA**

```typescript
import * as THREE from 'three';
import { assetImporter } from './lib/aaa-asset-pipeline';
import { levelGenerator } from './lib/ai-content-generation';
import { MaterialLibrary } from './lib/aaa-material-system';
import AAARenderSystem from './lib/aaa-render-system';
import { TimeOfDaySystem } from './lib/cinematic-lighting';

// Setup básico
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Gerar cidade
const city = levelGenerator.generate({
  type: 'city',
  size: [500, 0, 500],
  complexity: 0.7,
  seed: Date.now(),
});
scene.add(city);

// Aplicar materiais
city.traverse((child) => {
  if (child.isMesh) {
    const random = Math.random();
    if (random < 0.3) {
      child.material = MaterialLibrary.createMaterial('metal/aluminum');
    } else if (random < 0.6) {
      child.material = MaterialLibrary.createMaterial('plastic/glossy');
    } else {
      child.material = MaterialLibrary.createMaterial('car-paint');
    }
  }
});

// Setup render AAA
const renderSystem = new AAARenderSystem(renderer, scene, camera, {
  type: 'forwardPlus',
  hdr: true,
});

renderSystem.setupGlobalIllumination({ method: 'ssgi' });
renderSystem.setupVolumetrics({ enabled: true, godRaysEnabled: true });
renderSystem.setupShadows({ technique: 'cascaded', cascades: 4 });
renderSystem.setPostProcessing({
  antialiasing: 'taa',
  ssao: { enabled: true },
  ssr: { enabled: true },
  bloom: { enabled: true },
  motionBlur: { enabled: true },
});

// Time of Day
const tod = new TimeOfDaySystem();
tod.addToScene(scene);
tod.setTime(17); // Golden hour

// Camera position
camera.position.set(50, 50, 50);
camera.lookAt(0, 0, 0);

// Animate
function animate() {
  requestAnimationFrame(animate);
  renderSystem.render();
}
animate();
```

---

## 🎨 WORKFLOW RECOMENDADO

### **Para Jogos AAA**

1. **Importar Assets**
   - Baixar de Quixel Megascans / Poly Haven
   - Importar com `assetImporter` (auto-LOD, AI metadata)
   - Adicionar ao `assetDatabase`

2. **Criar Materiais**
   - Usar `MaterialLibrary.createMaterial()` para presets
   - Ou custom com `AdvancedPBRMaterial`
   - Aplicar clearcoat, sheen, transmission conforme necessário

3. **Gerar Níveis**
   - Usar `levelGenerator` para layout base
   - Adicionar assets importados manualmente
   - Aplicar materiais

4. **Setup Render**
   - `AAARenderSystem` com Forward+ ou Deferred
   - Ativar GI (SSGI para tempo real)
   - Ativar volumetrics
   - CSM shadows
   - Full post-processing stack

5. **Iluminação**
   - `TimeOfDaySystem` para exterior
   - `ThreePointLighting` para personagens
   - Light probes para GI

6. **Otimização**
   - LODs automáticos
   - Asset streaming
   - Frustum culling

---

### **Para Filmes/Cinematics**

1. **Importar Assets de Alta Qualidade**
   - 8K textures
   - High-poly models (sem LOD)

2. **Materiais Fotorrealistas**
   - Subsurface scattering para skin
   - Clearcoat para car paint
   - Transmission para glass

3. **Render Offline**
   - Pipeline: Deferred
   - RTGI (ray-traced GI)
   - RT Shadows
   - Ray-traced reflections
   - Max samples para post-processing

4. **Iluminação Cinematográfica**
   - Three-point lighting manual
   - Area lights
   - IES profiles
   - HDR skyboxes

5. **Post-Processing Pesado**
   - DOF com bokeh
   - Motion blur alto
   - Film grain
   - Color grading com LUT
   - Chromatic aberration

---

## 📊 PERFORMANCE

### **Configurações Recomendadas**

#### **Low-End (30fps)**
```typescript
{
  type: 'forward',
  gi: 'none',
  volumetrics: false,
  shadows: 'basic',
  ssao: false,
  ssr: false,
  antialiasing: 'fxaa',
}
```

#### **Mid-Range (60fps)**
```typescript
{
  type: 'forwardPlus',
  gi: 'lightProbes',
  volumetrics: true,
  shadows: 'pcf',
  ssao: { samples: 8 },
  ssr: { steps: 16 },
  antialiasing: 'taa',
}
```

#### **High-End (60fps+)**
```typescript
{
  type: 'deferred',
  gi: 'ssgi',
  volumetrics: { method: 'froxel' },
  shadows: 'cascaded',
  ssao: { samples: 16 },
  ssr: { steps: 32 },
  bloom: true,
  motionBlur: true,
  antialiasing: 'taa',
}
```

#### **Offline/Cinematic (Sem limite)**
```typescript
{
  type: 'deferred',
  gi: 'rtgi',
  volumetrics: { method: 'raymarched', steps: 128 },
  shadows: 'raytraced',
  rtao: { raysPerPixel: 4 },
  ssr: { steps: 64 },
  bloom: { passes: 7 },
  dof: { bokehShape: 'hexagon' },
  motionBlur: { samples: 32 },
}
```

---

## 🔧 TROUBLESHOOTING

### **Performance baixa?**
1. Reduzir LOD distances
2. Desativar SSGI → usar light probes
3. Reduzir shadow map resolution
4. Desativar volumetrics
5. Reduzir post-processing samples

### **Qualidade visual baixa?**
1. Aumentar texture resolution
2. Ativar SSGI ou RTGI
3. Aumentar shadow cascades
4. Ativar SSAO/SSR
5. Adicionar post-processing (bloom, DOF)

### **Assets não carregam?**
1. Verificar formato suportado (GLTF, FBX, OBJ, USD)
2. Verificar DRACO decoder path
3. Verificar tamanho do arquivo
4. Usar asset streaming

---

## 📚 RECURSOS EXTERNOS

### **Assets**
- [Poly Haven](https://polyhaven.com) - Texturas, HDRIs, modelos (FREE)
- [Quixel Megascans](https://quixel.com/megascans) - Assets AAA (FREE via Epic)
- [Mixamo](https://mixamo.com) - Personagens + animações (FREE)
- [Sketchfab](https://sketchfab.com) - Modelos 3D (muitos CC0)

### **Texturas**
- [AmbientCG](https://ambientcg.com) - Texturas PBR (CC0)
- [Texture.com](https://texture.com) - 10K+ texturas
- [3D Textures](https://3dtextures.me) - Materiais procedurais

### **HDRIs**
- [HDRI Haven](https://hdrihaven.com) - 500+ HDRIs 16K (FREE)

### **Audio**
- [Freesound](https://freesound.org) - 500K+ SFX (CC)
- [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk) - 16K+ SFX (FREE)

---

## ✅ TESTES

Todos os **60 testes** passaram:
```bash
npm test
```

**Test Suites**: 7 passed  
**Tests**: 60 passed  
**Time**: 14.266s

---

## 🚀 PRÓXIMOS PASSOS

1. **Download Asset Packs** (ver [AAA_ANALYSIS_AND_ROADMAP.md](../docs/AAA_ANALYSIS_AND_ROADMAP.md))
2. **Criar Interface Visual** (Asset Browser, Material Editor, etc.)
3. **Implementar Virtual Geometry** (performance 10x)
4. **Adicionar Physics Avançada** (soft body, fluids)

---

## 📖 DOCUMENTAÇÃO COMPLETA

- **[AAA_ANALYSIS_AND_ROADMAP.md](../docs/AAA_ANALYSIS_AND_ROADMAP.md)** - Análise completa, limitações e roadmap
- **[aaa-asset-pipeline.ts](../lib/aaa-asset-pipeline.ts)** - Documentação inline completa
- **[aaa-render-system.ts](../lib/aaa-render-system.ts)** - Todos os métodos documentados
- **[ai-content-generation.ts](../lib/ai-content-generation.ts)** - Exemplos e tipos
- **[aaa-material-system.ts](../lib/aaa-material-system.ts)** - Material presets
- **[cinematic-lighting.ts](../lib/cinematic-lighting.ts)** - Lighting presets

---

**Engine Aethel - Pronta para criar jogos e filmes AAA! 🎮🎬**
