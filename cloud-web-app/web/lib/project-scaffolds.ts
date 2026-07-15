export type ProjectScaffoldFile = {
  path: string
  language: string
  content: string
}

export type ProjectScaffold = {
  id: string
  name: string
  description: string
  domain: 'app' | 'game' | 'film' | 'api' | 'mobile' | 'blank'
  estimatedSize: number
  recommendedStudioSurface: string
  files: ProjectScaffoldFile[]
}

const packageJson = (name: string, scripts: Record<string, string>, dependencies: Record<string, string> = {}) =>
  JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      scripts,
      dependencies,
    },
    null,
    2,
  )

export const PROJECT_SCAFFOLDS: ProjectScaffold[] = [
  {
    id: 'nextjs-saas',
    name: 'Next.js SaaS Starter',
    description: 'Production-minded app shell with pricing, dashboard, API route and deployment notes.',
    domain: 'app',
    estimatedSize: 42_000,
    recommendedStudioSurface: '/studio',
    files: [
      {
        path: '/README.md',
        language: 'markdown',
        content: [
          '# Aethel SaaS Starter',
          '',
          'This project is scaffolded for a fast first value loop: landing, dashboard, API route, and deploy readiness.',
          '',
          '## Next steps',
          '- Replace the hero copy with the mission outcome.',
          '- Connect auth and billing providers.',
          '- Run the Aethel deploy review before publishing.',
        ].join('\n'),
      },
      {
        path: '/package.json',
        language: 'json',
        content: packageJson(
          'aethel-nextjs-saas',
          { dev: 'next dev', build: 'next build', start: 'next start' },
          { next: 'latest', react: 'latest', 'react-dom': 'latest' },
        ),
      },
      {
        path: '/app/page.tsx',
        language: 'typescriptreact',
        content: [
          "export default function HomePage() {",
          '  return (',
          '    <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">',
          '      <section className="mx-auto max-w-4xl space-y-6">',
          '        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Aethel mission starter</p>',
          '        <h1 className="text-5xl font-semibold">Ship the first credible version in one focused session.</h1>',
          '        <p className="text-lg text-slate-300">Use Project Brain, Mission Ledger, and deploy evidence before every release.</p>',
          '      </section>',
          '    </main>',
          '  )',
          '}',
        ].join('\n'),
      },
      {
        path: '/app/api/health/route.ts',
        language: 'typescript',
        content: [
          "import { NextResponse } from 'next/server'",
          '',
          'export function GET() {',
          "  return NextResponse.json({ ok: true, service: 'aethel-nextjs-saas' })",
          '}',
        ].join('\n'),
      },
    ],
  },
  {
    id: 'react-vite',
    name: 'React Vite App',
    description: 'Fast client app scaffold for tools, dashboards and creative utilities.',
    domain: 'app',
    estimatedSize: 34_000,
    recommendedStudioSurface: '/ide',
    files: [
      {
        path: '/package.json',
        language: 'json',
        content: packageJson(
          'aethel-react-vite',
          { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          { '@vitejs/plugin-react': 'latest', vite: 'latest', react: 'latest', 'react-dom': 'latest' },
        ),
      },
      {
        path: '/src/App.tsx',
        language: 'typescriptreact',
        content: [
          "import './style.css'",
          '',
          'export default function App() {',
          '  return (',
          '    <main className="shell">',
          '      <section>',
          '        <span>AI-ready workspace</span>',
          '        <h1>Build, preview, validate, and ship.</h1>',
          '        <p>Start from a narrow mission, then let agents operate with evidence and scope locks.</p>',
          '      </section>',
          '    </main>',
          '  )',
          '}',
        ].join('\n'),
      },
      {
        path: '/src/main.tsx',
        language: 'typescriptreact',
        content: [
          "import React from 'react'",
          "import { createRoot } from 'react-dom/client'",
          "import App from './App'",
          '',
          "createRoot(document.getElementById('root')!).render(<App />)",
        ].join('\n'),
      },
    ],
  },
  {
    id: 'api-express',
    name: 'Express API Service',
    description: 'Small API service with health, jobs and agent-safe request boundaries.',
    domain: 'api',
    estimatedSize: 28_000,
    recommendedStudioSurface: '/ide',
    files: [
      {
        path: '/package.json',
        language: 'json',
        content: packageJson(
          'aethel-api-service',
          { dev: 'tsx src/server.ts', build: 'tsc -p tsconfig.json', start: 'node dist/server.js' },
          { express: 'latest', zod: 'latest', tsx: 'latest', typescript: 'latest' },
        ),
      },
      {
        path: '/src/server.ts',
        language: 'typescript',
        content: [
          "import express from 'express'",
          "import { z } from 'zod'",
          '',
          'const app = express()',
          'app.use(express.json({ limit: "1mb" }))',
          '',
          "app.get('/health', (_req, res) => res.json({ ok: true }))",
          '',
          "app.post('/jobs', (req, res) => {",
          "  const body = z.object({ mission: z.string().min(1), maxCostUSD: z.number().nonnegative() }).parse(req.body)",
          "  res.status(202).json({ jobId: crypto.randomUUID(), status: 'queued', mission: body.mission })",
          '})',
          '',
          'app.listen(3001, () => {',
          "  // Intentionally quiet by default; wire your logger here in production.",
          '})',
        ].join('\n'),
      },
    ],
  },
  {
    id: 'react-native-companion',
    name: 'Mobile Companion',
    description: 'Approval/review companion shell for mission evidence, pause and deploy review.',
    domain: 'mobile',
    estimatedSize: 30_000,
    recommendedStudioSurface: '/studio',
    files: [
      {
        path: '/README.md',
        language: 'markdown',
        content: [
          '# Aethel Mobile Companion',
          '',
          'Use this scaffold for review-only mobile flows: approve, pause, inspect evidence, and view previews.',
          'It should not become a heavy IDE.',
        ].join('\n'),
      },
      {
        path: '/App.tsx',
        language: 'typescriptreact',
        content: [
          'export default function App() {',
          '  return null',
          '}',
        ].join('\n'),
      },
    ],
  },
  {
    id: 'game-3d',
    name: '3D Game Mission',
    description: 'A coherent mini-game scaffold with scene graph, player controller and playtest contract.',
    domain: 'game',
    estimatedSize: 64_000,
    recommendedStudioSurface: '/studio/level',
    files: [
      {
        path: '/aethel.project.json',
        language: 'json',
        content: JSON.stringify(
          {
            type: 'game',
            requiredGraphs: ['assetGraph', 'sceneWorldGraph', 'gameplayGraph', 'validationGraph'],
            firstValidation: 'playtest-bot',
          },
          null,
          2,
        ),
      },
      {
        path: '/Content/Scenes/Prototype.scene.json',
        language: 'json',
        content: JSON.stringify(
          {
            name: 'Prototype Arena',
            camera: { mode: 'third-person', fov: 65 },
            player: { prefab: 'Hero', spawn: [0, 1, 0] },
            objectives: ['teach movement', 'teach combat', 'validate fun score'],
          },
          null,
          2,
        ),
      },
      {
        path: '/Content/Scripts/PlayerController.ts',
        language: 'typescript',
        content: [
          'export type PlayerIntent = { move: [number, number]; jump: boolean; primary: boolean }',
          '',
          'export function resolvePlayerVelocity(intent: PlayerIntent, speed = 6) {',
          '  const [x, z] = intent.move',
          '  const length = Math.hypot(x, z) || 1',
          '  return { x: (x / length) * speed, y: intent.jump ? 7 : 0, z: (z / length) * speed }',
          '}',
        ].join('\n'),
      },
      {
        path: '/Validation/playtest.contract.md',
        language: 'markdown',
        content: [
          '# Playtest Contract',
          '',
          '- The player must understand the objective within 20 seconds.',
          '- Combat must respond within 120ms of input.',
          '- The first arena must run above the configured performance budget.',
        ].join('\n'),
      },
    ],
  },
  {
    id: 'film-story',
    name: 'Film / Story Mission',
    description: 'Storytelling scaffold with script, shot graph and continuity review contract.',
    domain: 'film',
    estimatedSize: 36_000,
    recommendedStudioSurface: '/studio/film',
    files: [
      {
        path: '/Film/script.md',
        language: 'markdown',
        content: [
          '# Script',
          '',
          '## Logline',
          'A focused short scene that proves the visual tone, character need and emotional turn.',
          '',
          '## Scene 1',
          'The protagonist enters a quiet space, makes a difficult choice, and leaves changed.',
        ].join('\n'),
      },
      {
        path: '/Film/shot-graph.json',
        language: 'json',
        content: JSON.stringify(
          {
            shots: [
              { id: 'shot-001', type: 'establishing', durationSec: 4, continuity: ['location', 'timeOfDay'] },
              { id: 'shot-002', type: 'medium', durationSec: 6, continuity: ['characterBlocking', 'eyeLine'] },
            ],
            validation: ['continuity-check', 'audio-sync-check', 'render-preview'],
          },
          null,
          2,
        ),
      },
    ],
  },
  {
    id: 'blank',
    name: 'Blank Mission',
    description: 'Minimal workspace for teams that already know the target architecture.',
    domain: 'blank',
    estimatedSize: 8_000,
    recommendedStudioSurface: '/studio',
    files: [
      {
        path: '/README.md',
        language: 'markdown',
        content: '# Blank Aethel Mission\n\nDefine the mission, constraints, evidence and first validation before editing.\n',
      },
      {
        path: '/aethel.project.json',
        language: 'json',
        content: JSON.stringify({ type: 'blank', requiredEvidence: ['plan', 'diff', 'validation'] }, null, 2),
      },
    ],
  },
]

export function listProjectScaffolds() {
  return PROJECT_SCAFFOLDS.map(({ files, ...scaffold }) => ({
    ...scaffold,
    fileCount: files.length,
  }))
}

export function findProjectScaffold(templateId: string) {
  return PROJECT_SCAFFOLDS.find((scaffold) => scaffold.id === templateId)
}

export function getScaffoldTotalSize(scaffold: ProjectScaffold) {
  return scaffold.files.reduce((total, file) => total + Buffer.byteLength(file.content, 'utf8'), 0)
}
