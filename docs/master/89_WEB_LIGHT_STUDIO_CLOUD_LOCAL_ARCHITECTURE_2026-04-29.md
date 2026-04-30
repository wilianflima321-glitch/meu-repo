# 89_WEB_LIGHT_STUDIO_CLOUD_LOCAL_ARCHITECTURE_2026-04-29

## 1) Purpose

Define the canonical user-experience architecture that lets Aethel:
- feel as simple as Firebase Studio / ChatGPT / Gemini / Manus at entry,
- keep the Studio IDE as the real product core,
- scale into a local desktop experience when browser limits become the bottleneck,
- avoid future drift between web, dashboard, operator, preview, and Studio.

This document exists to prevent a false tradeoff:
- "light AI app" versus
- "deep IDE/cockpit".

The correct answer is:
- one product,
- one navigation grammar,
- multiple depth modes.

## 2) Evidence Base Used

### 2.1 Canonical local sources
- `docs/master/39_STUDIO_UNIFIED_INFORMATION_ARCHITECTURE_2026-03-11.md`
- `docs/master/46_LIMITATIONS_2026-03-22.md`
- `docs/master/65_STUDIO_PRODUCT_BLUEPRINT_2026-03-24.md`
- `docs/master/66_AI_OPERATIONAL_EXPERIENCE_BLUEPRINT_2026-03-24.md`
- `docs/master/72_UX_UI_BENCHMARK_TRIAGE_2026-04-08.md`
- `docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md`
- `docs/master/85_EXECUTION_STATUS_MAP_2026-04-22.md`
- `docs/master/87_PARALLEL_SLICING_AND_BENCHMARK_WAVE_2026-04-24.md`
- `docs/master/88_AI_ARSENAL_AND_DOMAIN_SUPERIORITY_BLUEPRINT_2026-04-28.md`

### 2.2 Visual arsenal prepared on 2026-04-29
- `../AETHEL_UX_ARSENAL_2026-04-29/00_ARSENAL_INDEX.md`
- Firebase references
- Manus references
- Gemini references
- ChatGPT references
- Cursor / Windsurf / Vercel / Linear / Unreal references
- local Aethel concept anchors

### 2.3 Reality correction
We are not copying competitor identity literally.
We are extracting:
- clarity,
- depth management,
- surface hierarchy,
- artifact authority,
- operator trust.

## 3) Product Thesis

Aethel must be:
- `Web Light` for low-anxiety entry,
- `Mission Control` for current-task orientation,
- `Studio Cloud` for deep browser-native work,
- `Studio Local` for heavier and more trusted device execution.

This is not four separate products.
This is one product with four depth states.

The user must feel:
- "I started in a lightweight AI app,"
- "I deepened into a serious work surface,"
- "I never switched mental models."

## 4) Non-Negotiable Rules

1. The IDE remains the product core.
2. The public web must not look like a generic marketing site.
3. The dashboard must not look like a generic SaaS admin board.
4. The Studio must not feel like a second product.
5. The browser/operator surface must not feel like ungoverned magic.
6. The viewport must beat the chrome in Studio mode.
7. Preview and chat must never default to a flat 50/50 split.
8. Local desktop is not a fork of the product; it is a depth unlock.

## 5) Canonical Product Modes

### 5.1 Web Light
Purpose:
- first contact,
- low-anxiety mission intake,
- continue recent work,
- connect tools,
- route the user into the correct next surface.

Audience:
- starter / solo builder,
- lightly technical founder,
- casual operator,
- first-time visitor.

### 5.2 Mission Control
Purpose:
- orient the user around the current mission,
- show what is running,
- show what needs attention,
- route to Studio or Operator.

Audience:
- active user with a live task,
- returning user,
- operator reviewing progress,
- lead checking blockers.

### 5.3 Studio Cloud
Purpose:
- implementation,
- artifact review,
- preview/runtime,
- AI-assisted editing,
- research/evidence adjacency,
- deploy/readiness.

Audience:
- builders,
- operators,
- technical teams,
- power users,
- anyone who needs depth before local install is necessary.

### 5.4 Studio Local
Purpose:
- remove browser ceilings,
- improve filesystem trust,
- improve local runtime access,
- enable heavier workflows and device-local operations.

Audience:
- advanced builders,
- heavier app/game/media workflows,
- teams needing device-level integration,
- users who prefer native execution confidence.

## 6) Homepage Initial Architecture

### 6.1 Goal
Make the product feel like an AI app immediately, not a corporate website.

### 6.2 Primary hierarchy
1. mission input
2. mission suggestions
3. domain triage
4. continue recent work
5. connected tools/accounts
6. small Studio proof

### 6.3 Canonical blocks
- compact header
- central mission input
- starter chips:
  - build a site
  - fix a deployment
  - research competitors
  - configure a domain
  - connect billing
- domain cards:
  - apps/sites
  - research
  - cloud/devops
  - growth/ops
  - games
  - films/media
- recent mission continuation row
- connected tools row
- one clear CTA to open Studio when needed

### 6.4 What must stay hidden here
- heavy infra vocabulary
- large analytics cards
- full operator complexity
- large Studio chrome
- enterprise procurement detail

### 6.5 Why this beats the wrong Firebase copy
We borrow:
- simple entry,
- prompt-first flow,
- low text density.

We do not inherit:
- shallow preview lane,
- side-by-side chat/preview ceiling,
- thin governance language,
- overreliance on one input surface.

## 7) Mission Dashboard Architecture

### 7.1 Goal
Turn `/dashboard` into a control room, not a metrics dashboard.

### 7.2 Primary hierarchy
1. current mission
2. next required action
3. active agents / current run
4. evidence / outputs
5. costs / trust / deploy summary
6. Open in Studio

### 7.3 Canonical layout
- left: navigation and project scope
- center top: mission hero
- center middle: run/activity ledger + approvals
- center lower: evidence, outputs, deployments
- right: live artifact / Studio entry / operator signal / budget signal

### 7.4 What this surface must answer in 3 seconds
- what is happening now?
- what is the AI doing?
- what needs my approval?
- what is the next best action?
- should I open Studio now?

### 7.5 What this surface must not become
- tab explosion
- equal-weight cards everywhere
- general analytics board
- second-rate imitation of admin SaaS

## 8) Studio Cloud Architecture

### 8.1 Goal
Make `/ide` feel like the command center for implementation and artifact truth.

### 8.2 Canonical layout
- top app bar: compact command center
- left rail: files, search, git, structure
- center: editor or artifact viewport
- right rail: AI/context/plan/research
- bottom rail: logs, output, runtime, problems, changes
- preview: integrated and artifact-first

### 8.3 Surface dominance rule
The dominant surface must change by task:
- coding task -> editor dominates
- review task -> artifact preview dominates
- operator handoff -> browser/runtime dominates
- research validation -> evidence/run detail dominates

The Studio must not freeze into one static split forever.

### 8.4 Viewport rule
The viewport is not "just preview".
It is:
- live artifact,
- proposal artifact,
- inspect surface,
- review surface,
- device/runtime surface.

### 8.5 AI rail rule
The AI rail is not "a chat panel".
It is:
- intent,
- run state,
- evidence,
- approvals,
- costs,
- diff/review,
- memory,
- operator handoff.

## 9) Studio Local Architecture

### 9.1 Why it exists
`46_LIMITATIONS_2026-03-22.md` confirms that browser limits are real:
- filesystem sandbox,
- GPU memory ceilings,
- heavy runtime limits,
- large binary handling,
- long-lived local execution constraints,
- browser-only offline fragility.

Therefore a downloadable local Studio is not feature creep.
It is the depth mode that prevents ceiling-induced product failure.

### 9.2 What local unlocks
- real filesystem access
- stronger local runtime trust
- heavier preview/workload support
- more robust device integrations
- better long-running tool execution
- better local operator actions when device context matters

### 9.3 What local must not become
- a visually separate product
- a forked navigation model
- a special-only mode for everything

### 9.4 Design rule
Cloud and Local must share:
- mission model
- navigation grammar
- component language
- status grammar
- approval grammar
- evidence grammar

Local changes depth, not identity.

## 10) Transition Rules Between Modes

### 10.1 Web Light -> Mission Control
Triggered by:
- mission submitted
- account created
- recent mission resumed

User lands on:
- one current mission,
- one suggested next step,
- one clear Studio/Operator path.

### 10.2 Mission Control -> Studio Cloud
Triggered by:
- open in Studio
- edit artifact
- review changes
- inspect runtime
- solve implementation blocker

Studio opens with:
- current mission bound,
- relevant file or artifact selected,
- contextual AI already scoped.

### 10.3 Mission Control -> Operator
Triggered by:
- web task execution,
- domain/cloud/billing/admin navigation task,
- "act for me" internet tasks.

### 10.4 Studio Cloud -> Studio Local
Triggered by:
- heavier local runtime requirement
- filesystem/dependency trust requirement
- large artifact workload
- user preference for native execution

### 10.5 Local -> Cloud continuity
The user should feel:
- same mission,
- same runs,
- same evidence,
- same approvals,
- same outputs,
- different execution depth.

## 11) User Triage That Matches The Product

### 11.1 Starter / solo builder
Needs:
- low anxiety
- one next step
- strong defaults
- mission-first entry
- little visible infra

Surface priority:
- Web Light
- Mission Control
- Studio only when needed

### 11.2 Operator / production builder
Needs:
- visible state
- browser/operator confidence
- artifact-first review
- budgets
- approvals

Surface priority:
- Mission Control
- Operator
- Studio Cloud

### 11.3 Team / studio lead
Needs:
- shared timeline
- ownership
- blockers
- evidence
- review confidence

Surface priority:
- Mission Control
- evidence/run surfaces
- Studio Cloud

### 11.4 Enterprise buyer
Needs:
- trust path
- readiness proof
- explicit limitations
- guardrails
- procurement materials

Surface priority:
- Public Web
- trust/procurement path
- controlled product proof

### 11.5 Research / knowledge teams
Needs:
- evidence-backed outputs
- contradiction visibility
- source traceability
- exportable artifacts

Surface priority:
- Mission Control
- evidence/research surfaces
- Studio when creation becomes implementation

## 12) Rules To Beat Firebase-Style Side-By-Side Limits

1. Do not default to chat and preview sharing equal visual weight.
2. Make the artifact the main decision surface during review.
3. Keep trust/deploy signals compact, not vertically dominant.
4. Keep the AI rail operational, not verbose.
5. Collapse secondary chrome until the user needs it.
6. Let the product choose the dominant surface by context.

## 13) Rules To Beat Unreal-Style Weight Without Losing Power

1. Keep viewport authority in Studio mode.
2. Keep inspector and structure strong, but contextual.
3. Use adaptive density:
   - low density in Web Light,
   - medium density in Mission Control,
   - high density in Studio.
4. Do not expose maximum complexity before the user has a mission.
5. Keep the same component grammar across all density levels.

## 14) Anti-Fragmentation Rules

1. Same product language across web, dashboard, operator, and Studio.
2. Same mission object everywhere.
3. Same run/evidence/approval/cost vocabulary everywhere.
4. Same navigation source of truth.
5. Same trust grammar in preview, deploy, and operator surfaces.
6. No surface should feel like "another app inside the app".

## 15) Immediate Execution Priorities

### 15.1 Web Light
- refactor the landing into a mission-first app surface
- reduce text and visual pollution
- add recent-mission continuation
- add connected-tools framing

### 15.2 Mission Control
- re-architect dashboard around mission hero + next action
- reduce equal-weight card clutter
- make Studio entry inevitable

### 15.3 Studio Cloud
- preserve IDE centrality
- keep viewport dominant in review states
- unify AI, preview, diff, and approvals

### 15.4 Studio Local
- define the local wrapper/product contract
- preserve cloud/local parity in UI grammar
- use local mode as depth unlock, not fork

## 16) Final Reading

The right Aethel is not:
- a lighter Firebase clone,
- a browser-only Unreal fantasy,
- or a chat app with a code panel.

The right Aethel is:
- Firebase-grade clarity at entry,
- Manus-grade operator usefulness,
- Cursor/Windsurf-grade AI implementation loop,
- Vercel-grade preview/review trust,
- Unreal-grade viewport authority when depth is needed,
- all inside one continuous product grammar.
