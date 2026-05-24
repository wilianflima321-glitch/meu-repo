#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const FILES = [
  'components/ui/CookieConsent.tsx',
  'components/Onboarding.tsx',
  'components/ide/fullscreen/WorkbenchEditorToolbar.tsx',
  'components/ide/modern-shell/chromeHeaderParts.tsx',
  'components/ide/PreviewViewport3D.tsx',
  'components/ai-chat/AIChatComposer.tsx',
  'components/ai-chat/AIChatHeader.tsx',
  'components/ai-chat/AIChatMessagesPane.tsx',
  'components/ai-chat/AIChatSessionBanner.tsx',
  'components/ai-chat/MessageBubbleActionBar.tsx',
  'components/ide/AIChatPanelChrome.tsx',
  'components/ide/CommandPalette.tsx',
  'components/ide/IDELayout.tsx',
  'components/nexus/AethelResearch.tsx',
  'app/nexus/page.tsx',
]

const DRIFT = /\b(Usamos|Apenas|Aceitar|Saiba|Primeiros|concluidos|Reverificar|Parcial|Viewport compacto|Substituir|Diagnosticos|Executar|IA Render|experiencia|Alternar|Pergunte|Selecionado|Pausar|Reproduzir|Tela cheia|Opcionais|Conquistas|Pular|Comecar|Proximo|Desconhecido|Faltam|Status geral|Ferramentas|Empilhar|Dividir|Pesquisa|Direcao|Orquestracao|renderizacao|verificacao|Coletando|Pontuando|sintese|confianca|Latencia|Otimizado)\b/gi

const findings = []
for (const file of FILES) {
  const abs = path.join(ROOT, file)
  if (!fs.existsSync(abs)) {
    findings.push(`${file}: missing`)
    continue
  }
  const content = fs.readFileSync(abs, 'utf8')
  const matches = content.match(DRIFT) ?? []
  if (matches.length > 0) findings.push(`${file}: ${matches.length} [${[...new Set(matches)].slice(0, 12).join(', ')}]`)
}

if (findings.length > 0) {
  console.error(`[ide-visible-language-drift] FAIL\n${findings.join('\n')}`)
  process.exit(1)
}

console.log(`[ide-visible-language-drift] PASS files=${FILES.length}`)
