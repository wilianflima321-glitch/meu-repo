# 📝 IMPLEMENTAÇÃO DETALHADA - ITENS FALTANTES
## Especificação Técnica para Cada Item

**Data:** 14 de Janeiro de 2026

---

## PARTE 1: COMPONENTES UI FALTANTES

### 1.1 ClothSimulationEditor.tsx

**Arquivo:** `cloud-web-app/web/components/physics/ClothSimulationEditor.tsx`

**Funcionalidades necessárias:**
```typescript
interface ClothSimulationEditorProps {
  meshId: string;
  onSimulationUpdate: (params: ClothParams) => void;
}

// Deve incluir:
// - Slider para stiffness (0-1)
// - Slider para damping (0-1)  
// - Slider para gravity multiplier
// - Checkbox para self-collision
// - Dropdown para constraint type (distance, bending, etc)
// - Preview em tempo real
// - Botão "Pin Vertices" com seleção visual
// - Export para runtime
```

**Conectar com:** `lib/cloth-simulation.ts`

---

### 1.2 DestructionEditor.tsx

**Arquivo:** `cloud-web-app/web/components/physics/DestructionEditor.tsx`

**Funcionalidades necessárias:**
```typescript
interface DestructionEditorProps {
  meshId: string;
  onFragmentGenerated: (fragments: Fragment[]) => void;
}

// Deve incluir:
// - Slider para fragment count
// - Pattern selector (voronoi, radial, directional)
// - Health points input
// - Damage threshold slider
// - Impact point visualizer
// - Preview da destruição
// - Export de fragments para runtime
```

**Conectar com:** `lib/destruction-system.ts`

---

### 1.3 FluidSimulationEditor.tsx

**Arquivo:** `cloud-web-app/web/components/physics/FluidSimulationEditor.tsx`

**Funcionalidades necessárias:**
```typescript
interface FluidSimulationEditorProps {
  volumeId: string;
  onFluidUpdate: (params: FluidParams) => void;
}

// Deve incluir:
// - Particle count slider
// - Viscosity slider
// - Surface tension slider
// - Color picker para fluido
// - Boundary box editor
// - Flow direction arrows
// - Preview em tempo real (com limite de particles)
// - Bake to mesh option
```

**Conectar com:** `lib/fluid-simulation-system.ts`

---

### 1.4 HairFurEditor.tsx

**Arquivo:** `cloud-web-app/web/components/character/HairFurEditor.tsx`

**Funcionalidades necessárias:**
```typescript
interface HairFurEditorProps {
  characterId: string;
  onHairUpdate: (params: HairParams) => void;
}

// Deve incluir:
// - Strand count slider
// - Length slider
// - Clumping slider
// - Curl intensity
// - Color/gradient picker
// - Groom brush tools (comb, cut, add)
// - Physics preview (gravity, wind)
// - LOD settings
// - Export para runtime (cards vs strands)
```

**Conectar com:** `lib/hair-fur-system.ts`

---

### 1.5 FacialAnimationEditor.tsx

**Arquivo:** `cloud-web-app/web/components/character/FacialAnimationEditor.tsx`

**Funcionalidades necessárias:**
```typescript
interface FacialAnimationEditorProps {
  characterId: string;
  onBlendShapeUpdate: (shapes: BlendShape[]) => void;
}

// Deve incluir:
// - Blend shape sliders (52 ARKit shapes mínimo)
// - Emotion presets (happy, sad, angry, etc)
// - Lip sync timeline
// - Audio waveform para sync
// - FACS action units
// - Preview com webcam (face tracking)
// - Export para metahuman format
```

**Conectar com:** `lib/facial-animation-system.ts`

---

### 1.6 ControlRigEditor.tsx

**Arquivo:** `cloud-web-app/web/components/character/ControlRigEditor.tsx`

**Funcionalidades necessárias:**
```typescript
interface ControlRigEditorProps {
  skeletonId: string;
  onRigUpdate: (rig: ControlRig) => void;
}

// Deve incluir:
// - Skeleton hierarchy view
// - IK chain creator
// - FK/IK blend slider por chain
// - Pole vector visualizer
// - Control shape customization
// - Constraints editor (aim, parent, etc)
// - Rig mirroring
// - Rig presets (biped, quadruped, etc)
```

**Conectar com:** `lib/control-rig-system.ts`

---

### 1.7 DialogueEditor.tsx

**Arquivo:** `cloud-web-app/web/components/narrative/DialogueEditor.tsx`

**Funcionalidades necessárias:**
```typescript
interface DialogueEditorProps {
  dialogueId: string;
  onDialogueUpdate: (tree: DialogueTree) => void;
}

// Deve incluir:
// - Node-based dialogue tree editor
// - Character selector por node
// - Text editor com variables {{name}}
// - Condition editor (if player has item, etc)
// - Audio attachment per line
// - Branching visualization
// - Preview mode (play through)
// - Localization support (multi-language)
// - Export para runtime format
```

**Conectar com:** `lib/dialogue-cutscene-system.ts`

---

### 1.8 QuestEditor.tsx

**Arquivo:** `cloud-web-app/web/components/narrative/QuestEditor.tsx`

**Funcionalidades necessárias:**
```typescript
interface QuestEditorProps {
  questId: string;
  onQuestUpdate: (quest: Quest) => void;
}

// Deve incluir:
// - Quest metadata (name, description, icon)
// - Objective list editor
// - Prerequisite quest selector
// - Reward editor (XP, items, currency)
// - Quest stages timeline
// - Map marker placement
// - NPC assignment
// - Completion conditions
// - Quest log preview
```

**Conectar com:** `lib/quest-mission-system.ts`

---

### 1.9 FoliagePainter.tsx

**Arquivo:** `cloud-web-app/web/components/environment/FoliagePainter.tsx`

**Funcionalidades necessárias:**
```typescript
interface FoliagePainterProps {
  terrainId: string;
  onFoliageUpdate: (instances: FoliageInstance[]) => void;
}

// Deve incluir:
// - Brush size/density sliders
// - Foliage type palette
// - Paint mode (add, remove, scale)
// - Slope/height constraints
// - Random rotation/scale range
// - LOD distance settings
// - Collision toggle per type
// - Instancing preview
// - Erase by type option
```

**Conectar com:** `lib/foliage-system.ts`

---

### 1.10 DecalPlacer.tsx

**Arquivo:** `cloud-web-app/web/components/environment/DecalPlacer.tsx`

**Funcionalidades necessárias:**
```typescript
interface DecalPlacerProps {
  sceneId: string;
  onDecalPlaced: (decal: Decal) => void;
}

// Deve incluir:
// - Decal texture browser
// - Size/rotation gizmo
// - Projection depth slider
// - Fade distance settings
// - Layer priority
// - Surface filter (walls only, floors only, etc)
// - Batch placement mode
// - Decal atlas support
```

**Conectar com:** `lib/decal-system.ts`

---

### 1.11 CloudEditor.tsx

**Arquivo:** `cloud-web-app/web/components/environment/CloudEditor.tsx`

**Funcionalidades necessárias:**
```typescript
interface CloudEditorProps {
  skyId: string;
  onCloudUpdate: (params: CloudParams) => void;
}

// Deve incluir:
// - Cloud coverage slider
// - Cloud type presets (cumulus, stratus, etc)
// - Wind speed/direction
// - Time of day integration
// - Volumetric density
// - Light scattering settings
// - Weather transition preview
// - Performance quality toggle
```

**Conectar com:** `lib/volumetric-clouds.ts`

---

### 1.12 WaterEditor.tsx

**Arquivo:** `cloud-web-app/web/components/environment/WaterEditor.tsx`

**Funcionalidades necessárias:**
```typescript
interface WaterEditorProps {
  waterBodyId: string;
  onWaterUpdate: (params: WaterParams) => void;
}

// Deve incluir:
// - Water type (ocean, lake, river, pool)
// - Wave height/frequency
// - Flow direction (rivers)
// - Water color/clarity
// - Foam settings
// - Caustics toggle
// - Underwater fog
// - Buoyancy physics preview
// - Shore blend settings
```

**Conectar com:** `lib/water-ocean-system.ts`

---

## PARTE 2: TESTES UNITÁRIOS PRIORITÁRIOS

### 2.1 gameplay-ability-system.test.ts

```typescript
// cloud-web-app/web/lib/__tests__/gameplay-ability-system.test.ts

describe('GameplayAbilitySystem', () => {
  describe('GameplayTag', () => {
    it('should match exact tags', () => {});
    it('should match parent tags', () => {});
    it('should not match sibling tags', () => {});
  });
  
  describe('GameplayTagContainer', () => {
    it('should add and remove tags', () => {});
    it('should check hasAny correctly', () => {});
    it('should check hasAll correctly', () => {});
    it('should match query with required and blocked', () => {});
  });
  
  describe('AttributeSet', () => {
    it('should calculate base value', () => {});
    it('should apply add modifiers', () => {});
    it('should apply multiply modifiers', () => {});
    it('should apply override modifiers', () => {});
    it('should respect min/max bounds', () => {});
    it('should stack modifiers correctly', () => {});
  });
  
  describe('GameplayAbility', () => {
    it('should check activation requirements', () => {});
    it('should consume resources on activation', () => {});
    it('should respect cooldowns', () => {});
    it('should apply effects on target', () => {});
    it('should handle interruption', () => {});
  });
  
  describe('GameplayEffect', () => {
    it('should apply instant effects', () => {});
    it('should apply duration effects', () => {});
    it('should apply infinite effects', () => {});
    it('should remove on duration expire', () => {});
    it('should handle stacking rules', () => {});
  });
});
```

---

### 2.2 networking-multiplayer.test.ts

```typescript
// cloud-web-app/web/lib/__tests__/networking-multiplayer.test.ts

describe('NetworkingMultiplayer', () => {
  describe('Connection', () => {
    it('should establish WebSocket connection', () => {});
    it('should handle connection timeout', () => {});
    it('should reconnect on disconnect', () => {});
    it('should measure ping correctly', () => {});
  });
  
  describe('Lobby', () => {
    it('should create lobby', () => {});
    it('should join existing lobby', () => {});
    it('should update player list', () => {});
    it('should transfer host on leave', () => {});
    it('should enforce max players', () => {});
  });
  
  describe('State Sync', () => {
    it('should serialize state efficiently', () => {});
    it('should apply delta updates', () => {});
    it('should interpolate remote positions', () => {});
    it('should extrapolate on packet loss', () => {});
  });
  
  describe('Client Prediction', () => {
    it('should predict local movement', () => {});
    it('should reconcile with server state', () => {});
    it('should handle prediction errors', () => {});
  });
  
  describe('Rollback', () => {
    it('should save game states', () => {});
    it('should rollback to past state', () => {});
    it('should resimulate inputs', () => {});
  });
});
```

---

### 2.3 credit-wallet.test.ts

```typescript
// cloud-web-app/web/lib/__tests__/credit-wallet.test.ts

describe('CreditWallet', () => {
  describe('Balance', () => {
    it('should return correct balance', () => {});
    it('should handle zero balance', () => {});
    it('should not allow negative balance', () => {});
  });
  
  describe('Transactions', () => {
    it('should add credits', () => {});
    it('should deduct credits', () => {});
    it('should fail on insufficient funds', () => {});
    it('should record transaction history', () => {});
    it('should support atomic operations', () => {});
  });
  
  describe('Metering', () => {
    it('should track AI token usage', () => {});
    it('should track build minutes', () => {});
    it('should track storage usage', () => {});
    it('should enforce plan limits', () => {});
  });
  
  describe('Billing', () => {
    it('should integrate with Stripe', () => {});
    it('should handle webhooks', () => {});
    it('should process refunds', () => {});
  });
});
```

---

### 2.4 script-sandbox.test.ts

```typescript
// cloud-web-app/web/lib/sandbox/__tests__/script-sandbox.test.ts

describe('ScriptSandbox', () => {
  describe('Execution', () => {
    it('should execute safe code', () => {});
    it('should return execution result', () => {});
    it('should timeout long-running scripts', () => {});
  });
  
  describe('Security', () => {
    it('should block eval()', () => {});
    it('should block Function constructor', () => {});
    it('should block process access', () => {});
    it('should block require/import', () => {});
    it('should block __proto__ manipulation', () => {});
    it('should block document access', () => {});
    it('should block window access', () => {});
  });
  
  describe('Resource Limits', () => {
    it('should limit memory usage', () => {});
    it('should limit CPU time', () => {});
    it('should limit recursion depth', () => {});
  });
  
  describe('API Exposure', () => {
    it('should expose allowed APIs', () => {});
    it('should not expose dangerous APIs', () => {});
  });
});
```

---

## PARTE 3: ENDPOINTS API FALTANTES

### 3.1 /api/projects/export

```typescript
// cloud-web-app/web/app/api/projects/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { archiver } from 'archiver';

const exportSchema = z.object({
  projectId: z.string(),
  format: z.enum(['zip', 'tar.gz']),
  includeAssets: z.boolean().default(true),
  includeHistory: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await req.json();
  const { projectId, format, includeAssets, includeHistory } = exportSchema.parse(body);
  
  // Verificar ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id }
  });
  
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  // TODO: Implementar export completo
  // 1. Coletar todos os arquivos do projeto
  // 2. Incluir assets se solicitado
  // 3. Incluir histórico git se solicitado
  // 4. Criar arquivo comprimido
  // 5. Retornar URL de download
  
  return NextResponse.json({ 
    downloadUrl: `/api/projects/download/${projectId}`,
    expiresAt: new Date(Date.now() + 3600000) // 1 hora
  });
}
```

---

### 3.2 /api/multiplayer/create-lobby

```typescript
// cloud-web-app/web/app/api/multiplayer/create-lobby/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const lobbySchema = z.object({
  name: z.string().min(1).max(50),
  maxPlayers: z.number().min(2).max(16),
  isPrivate: z.boolean().default(false),
  gameMode: z.string(),
  region: z.enum(['us-east', 'us-west', 'eu-west', 'asia-east']),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await req.json();
  const params = lobbySchema.parse(body);
  
  const lobbyId = nanoid(10);
  const inviteCode = params.isPrivate ? nanoid(6).toUpperCase() : null;
  
  // TODO: Criar lobby no servidor de game
  // 1. Alocar servidor na região
  // 2. Registrar lobby no Redis
  // 3. Retornar connection info
  
  return NextResponse.json({
    lobbyId,
    inviteCode,
    connectionUrl: `wss://game-${params.region}.aethel.io/lobby/${lobbyId}`,
    createdAt: new Date(),
  });
}
```

---

## PARTE 4: WORKERS FALTANTES

### 4.1 asset-processor.worker.ts

```typescript
// cloud-web-app/web/lib/workers/asset-processor.worker.ts

import { expose } from 'comlink';

interface ProcessOptions {
  maxTextureSize: number;
  generateMipmaps: boolean;
  compressTextures: boolean;
  optimizeMesh: boolean;
  generateLODs: boolean;
}

const assetProcessor = {
  async processTexture(
    imageData: ImageData,
    options: ProcessOptions
  ): Promise<ArrayBuffer> {
    // Resize se necessário
    // Gerar mipmaps
    // Comprimir (basis universal)
    // Retornar buffer otimizado
  },
  
  async processMesh(
    vertices: Float32Array,
    indices: Uint32Array,
    options: ProcessOptions
  ): Promise<{ vertices: Float32Array; indices: Uint32Array; lods: any[] }> {
    // Otimizar vertex cache
    // Gerar LODs se solicitado
    // Quantizar se possível
    // Retornar mesh otimizado
  },
  
  async processAudio(
    audioBuffer: ArrayBuffer,
    targetFormat: 'mp3' | 'ogg' | 'webm'
  ): Promise<ArrayBuffer> {
    // Converter formato
    // Normalizar volume
    // Comprimir
  },
};

expose(assetProcessor);
```

---

## PARTE 5: CONFIGURAÇÃO DEPENDABOT

### 5.1 dependabot.yml

```yaml
# .github/dependabot.yml

version: 2
updates:
  # Root package.json
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    groups:
      production-dependencies:
        patterns:
          - "*"
        exclude-patterns:
          - "@types/*"
          - "eslint*"
          - "prettier*"
      dev-dependencies:
        patterns:
          - "@types/*"
          - "eslint*"
          - "prettier*"
          - "typescript"
    ignore:
      - dependency-name: "typescript"
        update-types: ["version-update:semver-major"]
    labels:
      - "dependencies"
      - "npm"

  # Server package.json
  - package-ecosystem: "npm"
    directory: "/server"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "server"

  # Cloud Web App
  - package-ecosystem: "npm"
    directory: "/cloud-web-app/web"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "web"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "github-actions"

  # Docker
  - package-ecosystem: "docker"
    directory: "/cloud-web-app/web"
    schedule:
      interval: "monthly"
    labels:
      - "dependencies"
      - "docker"
```

---

## PARTE 6: NETWORK POLICY K8S

### 6.1 networkpolicy.yaml

```yaml
# infra/k8s/base/networkpolicy.yaml

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: aethel-network-policy
  namespace: aethel
spec:
  podSelector:
    matchLabels:
      app: aethel-engine
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from nginx ingress
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
    # Allow from same namespace
    - from:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 3000
  egress:
    # Allow to PostgreSQL
    - to:
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
    # Allow to Redis
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    # Allow DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
    # Allow HTTPS egress (for external APIs)
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
```

---

## PARTE 7: CSRF PROTECTION

### 7.1 csrf-middleware.ts

```typescript
// cloud-web-app/web/lib/middleware/csrf-middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = '__Host-csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCSRFToken(): string {
  return nanoid(32);
}

export function setCSRFCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 3600, // 1 hora
  });
}

export function validateCSRFToken(request: NextRequest): boolean {
  const cookieStore = cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  // Constant-time comparison
  if (cookieToken.length !== headerToken.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  
  return result === 0;
}

export function csrfMiddleware(request: NextRequest): NextResponse | null {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null;
  }
  
  // Skip for API routes that use other auth (e.g., API keys)
  if (request.nextUrl.pathname.startsWith('/api/webhooks')) {
    return null;
  }
  
  if (!validateCSRFToken(request)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }
  
  return null;
}
```

---

## PARTE 8: 2FA/MFA COMPLETO

### 8.1 Componente UI

```typescript
// cloud-web-app/web/components/auth/TwoFactorSetup.tsx

'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface TwoFactorSetupProps {
  onComplete: () => void;
}

export function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'generate' | 'verify' | 'backup'>('generate');
  const [secret, setSecret] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const generateSecret = async () => {
    const res = await fetch('/api/auth/2fa/generate', { method: 'POST' });
    const data = await res.json();
    setSecret(data.secret);
    setQrUri(data.qrUri);
    setStep('verify');
  };

  const verifyAndEnable = async () => {
    const res = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code: verifyCode }),
    });
    
    if (res.ok) {
      const data = await res.json();
      setBackupCodes(data.backupCodes);
      setStep('backup');
    } else {
      setError('Código inválido');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      {step === 'generate' && (
        <>
          <h2 className="text-xl font-bold mb-4">Ativar Autenticação em Dois Fatores</h2>
          <p className="text-gray-600 mb-4">
            Adicione uma camada extra de segurança à sua conta.
          </p>
          <Button onClick={generateSecret}>Começar Configuração</Button>
        </>
      )}

      {step === 'verify' && qrUri && (
        <>
          <h2 className="text-xl font-bold mb-4">Escaneie o QR Code</h2>
          <div className="flex justify-center mb-4">
            <QRCodeSVG value={qrUri} size={200} />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Ou insira manualmente: <code className="bg-gray-100 px-2 py-1">{secret}</code>
          </p>
          <Input
            placeholder="Código de 6 dígitos"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            maxLength={6}
          />
          {error && <p className="text-red-500 mt-2">{error}</p>}
          <Button onClick={verifyAndEnable} className="mt-4">Verificar e Ativar</Button>
        </>
      )}

      {step === 'backup' && (
        <>
          <h2 className="text-xl font-bold mb-4">Salve seus Códigos de Backup</h2>
          <p className="text-gray-600 mb-4">
            Guarde estes códigos em um local seguro. Cada código pode ser usado apenas uma vez.
          </p>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm">
            {backupCodes.map((code, i) => (
              <div key={i}>{code}</div>
            ))}
          </div>
          <Button onClick={onComplete} className="mt-4">Concluído</Button>
        </>
      )}
    </div>
  );
}
```

---

Este documento contém as especificações técnicas para os principais itens faltantes. Use como referência para implementação.
