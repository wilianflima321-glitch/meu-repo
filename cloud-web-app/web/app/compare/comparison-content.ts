export type ComparisonLink = {
  label: string
  href: string
  external?: boolean
}

export type ComparisonCard = {
  category: string
  tool: string
  marketFocus: string
  benchmarkStrength: string
  chooseAethelWhen: string
  honestGap: string
  bestFor: string[]
  sources: ComparisonLink[]
}

export const HERO_NOTES = [
  'Last public review: April 27, 2026.',
  'Based on official competitor docs and live public Aethel pages.',
  'Does not mark Aethel as an automatic winner; the gaps stay visible.',
]

export const COMPARISON_METRICS = [
  {
    label: 'Where Aethel already leads',
    value: 'Unified studio',
    detail: 'Research, AI, preview, and review stay connected.',
  },
  {
    label: 'Where the market still leads',
    value: 'AI loop + deploy trust',
    detail: 'Cursor leads editor loops; Vercel leads deploy trust.',
  },
  {
    label: 'Best fit today',
    value: 'Apps + Research',
    detail: 'The clearest wedge while runtime coverage expands.',
  },
]

export const COMPARISON_CARDS: ComparisonCard[] = [
  {
    category: 'AI code editor',
    tool: 'Cursor',
    marketFocus: 'AI-first editor for teams that want codebase chat, inline edits, and agent loops in a familiar development environment.',
    benchmarkStrength:
      'Cursor has made inline edit, codebase understanding, and background agents feel like default expectations for people who live inside an editor all day.',
    chooseAethelWhen:
      'Code, preview, review, and buyer context must stay together.',
    honestGap:
      'Aethel still needs deeper inline inevitability, stronger persistent memory, and a more central AI-to-artifact loop inside the editor.',
    bestFor: [
      'Teams comparing a pure AI editor against a broader operating studio.',
      'Technical champions who need context and review trails, not only faster autocomplete.',
    ],
    sources: [
      { label: 'Cursor docs', href: 'https://docs.cursor.com/', external: true },
      { label: 'Background agents', href: 'https://docs.cursor.com/background-agents', external: true },
      { label: 'Aethel IDE', href: '/docs/ide' },
    ],
  },
  {
    category: 'AI code editor',
    tool: 'Windsurf',
    marketFocus: 'VS Code-like editor with Cascade, Tab, and familiar migration paths for teams that want immediate coding acceleration.',
    benchmarkStrength:
      'Windsurf is strong at inline suggestions, Tab workflows, and onboarding developers who already understand the VS Code mental model.',
    chooseAethelWhen:
      'Research, code, review, and rollout need one flow.',
    honestGap:
      'Aethel still trails the polish of the inline loop, ecosystem familiarity, and the low-friction daily migration path of mature AI editors.',
    bestFor: [
      'Squads comparing editor assistants against an operation-visible studio.',
      'Teams that value context and governance as much as write throughput.',
    ],
    sources: [
      { label: 'Windsurf docs', href: 'https://docs.windsurf.com/command/codeium-overview', external: true },
      { label: 'Windsurf Tab', href: 'https://docs.windsurf.com/tab/overview', external: true },
      { label: 'Aethel changelog', href: '/docs/changelog' },
    ],
  },
  {
    category: 'Browser workspace',
    tool: 'Replit',
    marketFocus: 'Browser-first workspace for generating, editing, collaborating, and publishing apps from one place.',
    benchmarkStrength:
      'Replit remains strong when the buyer wants multiplayer, preview, shell, history, and deploy to feel native in a 100% browser workspace.',
    chooseAethelWhen:
      'Build flow and buyer trust must move together.',
    honestGap:
      'Aethel still needs stronger canonical live collaboration and a preview/review/deploy loop that feels as inevitable as mature browser-native workspaces.',
    bestFor: [
      'Teams comparing browser-native build loops with a studio that has a stronger buyer path.',
      'Evaluators who care about status, compliance, and procurement beyond the editor.',
    ],
    sources: [
      { label: 'Replit workspace', href: 'https://docs.replit.com/core-concepts/workspace', external: true },
      { label: 'Replit deployments', href: 'https://docs.replit.com/cloud-services/deployments', external: true },
      { label: 'Aethel status', href: '/status' },
    ],
  },
  {
    category: 'Deploy + ops',
    tool: 'Vercel',
    marketFocus: 'Preview deployments, observability, rollback, and frontend operations at scale.',
    benchmarkStrength:
      'Vercel is the reference for preview deploys, observability, rollback, and operational pages for teams that already have strong engineering workflows.',
    chooseAethelWhen:
      'Build, research, AI control, and trust need one place.',
    honestGap:
      'Aethel still needs full runtime/review parity, a stronger preview loop, and deploy confidence as stable as a specialist platform.',
    bestFor: [
      'Founders and squads who want a broader all-in-one studio instead of only a deploy provider.',
      'Teams willing to trade some infra maturity for a more integrated studio loop.',
    ],
    sources: [
      { label: 'Vercel observability', href: 'https://vercel.com/docs/observability', external: true },
      { label: 'Aethel security', href: '/security' },
      { label: 'Aethel pricing', href: '/pricing' },
    ],
  },
  {
    category: 'Ops + planning',
    tool: 'Linear',
    marketFocus: 'Issue tracking, triage, roadmap, and product execution with extremely refined UX.',
    benchmarkStrength:
      'Linear remains strong in speed, density, keyboard flow, and triage discipline for teams that live in backlogs, roadmaps, and product operations.',
    chooseAethelWhen:
      'Operations need to live beside building and validation.',
    honestGap:
      'Aethel still trails in workflow maturity, filters, dense operational views, and the feeling of inevitability for pure planning work.',
    bestFor: [
      'Squads comparing execution systems against a studio for execution plus delivery.',
      'Leads who need product, roadmap, status, and review in one conversation.',
    ],
    sources: [
      { label: 'Linear features', href: 'https://linear.app/features', external: true },
      { label: 'Linear docs', href: 'https://linear.app/docs', external: true },
      { label: 'Aethel changelog', href: '/docs/changelog' },
    ],
  },
  {
    category: 'Docs + knowledge',
    tool: 'Notion',
    marketFocus: 'Wiki, docs, collaboration, and knowledge management for organizing teams and company memory.',
    benchmarkStrength:
      'Notion remains a reference for sharing, authoring, knowledge bases, and document structure across large, mixed-function teams.',
    chooseAethelWhen:
      'Knowledge must stay close to AI work and product review.',
    honestGap:
      'Aethel still needs better search, deeper authoring, and a knowledge mesh as fluid as specialist documentation products.',
    bestFor: [
      'Buyers deciding whether knowledge belongs inside the studio or beside it.',
      'Teams that need docs, status, trust, and product review in one narrative.',
    ],
    sources: [
      { label: 'Notion help', href: 'https://www.notion.com/help', external: true },
      { label: 'Aethel docs', href: '/docs' },
      { label: 'Trust fit', href: '/trust' },
    ],
  },
]

export const EVIDENCE_LINKS: ComparisonLink[] = [
  { label: 'Public status', href: '/status' },
  { label: 'Security', href: '/security' },
  { label: 'Compliance', href: '/compliance' },
  { label: 'Trust fit', href: '/trust' },
  { label: 'Product changelog', href: '/docs/changelog' },
  { label: 'Procurement docs', href: '/docs/procurement-starter-pack' },
]
