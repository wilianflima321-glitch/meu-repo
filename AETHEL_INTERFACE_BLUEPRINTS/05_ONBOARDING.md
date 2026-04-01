# 05_ONBOARDING
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Entry

## Mission
Get a user from blank state to a meaningful first project in under ninety seconds.

## Primary CTA
- `Create Project`

## Flow Model
This is a guided flow, not a settings page.
The user should feel they are making one decision at a time.

## Step Structure
### Step 1: What are you building...
Choices:
- App or site
- Game
- Film or video
- Asset or concept pack
- Research-led project

### Step 2: How do you want to start...
Choices:
- Template
- Blank
- Import existing
- Demo mode

### Step 3: How should AI help...
Choices:
- Guided
- Standard
- Advanced
- No AI for now

### Step 4: Provider and runtime readiness
- provider selection or demo path
- only the essentials
- advanced provider setup remains in Settings

### Step 5: Confirm and create
- project name
- workspace selection
- primary domain
- connected contexts suggestions

## Layout Anatomy
- top progress bar with labeled steps
- center decision card area
- right summary rail on desktop
- footer action bar with Back and Continue

## Component Tree
### OnboardingProgress
Subcomponents:
- StepDot
- StepLabel
- CurrentProgressBar

### IntentCardGrid
Each card includes:
- title
- one-line description
- visual hint
- recommended starter label if needed

### ProjectSummaryPanel
Fields:
- selected domain
- start mode
- AI assistance level
- provider or demo mode
- estimated destination after creation

## Microinteractions
- selecting a card advances emphasis but not automatically the step unless explicitly desired
- Back preserves state without resetting dependent sections unnecessarily
- summary panel updates live as choices change
- Continue remains disabled only when the current step is truly incomplete

## Button Inventory
- `Back`
- `Continue`
- `Create Project`
- `Use Demo Mode`
- `Open Advanced Setup` (secondary only)

## States
### Empty
- first step visible with recommended options clearly marked

### Loading
- project creation state with progress checklist

### Blocked
- provider or runtime blockers summarized in one compact card
- always offer demo path if available

### Success
- route directly to Studio Home or Workbench based on flow choice

## What To Avoid
- Full settings form during onboarding
- Technical blockers taking over the flow
- More than four or five major choices on one decision screen

## Entry and Exit
- Entry: post-auth redirect
- Exit success: Studio Home or Workbench
- Exit blocked: Settings provider setup or demo fallback

## Critical Opinion
### What this page should be
- a guided narrowing of choices

### What this page should not be
- a settings dump
- a product tour pretending to be onboarding

## Interactions Between Components
- summary panel should update after each decision
- provider step must defer advanced config to Settings unless it blocks creation entirely


## Detailed Component Specs
### OnboardingProgress
- step labels always visible on desktop
- current step visually strongest
- completed steps compressed but still readable

### IntentCardGrid
Each card contains:
- icon or visual marker
- title
- one-line explanation
- optional recommended badge

Rule:
- selection state must be unmistakable
- hover states suggest clickability but do not overanimate

### ProviderSetupLite
Contains only:
- provider choice
- demo path
- one compact readiness note if blocked
- link to advanced setup in Settings

Opinion:
This component must stay intentionally shallow.
Advanced provider configuration belongs elsewhere.

### ProjectSummaryPanel
Contains:
- selected domain
- start mode
- AI mode
- provider state
- destination after creation

Rule:
- this panel mirrors the user's choices in real time
- it must help confidence, not create extra decisions

## Microinteractions
- card selection updates summary instantly
- moving back a step preserves choices unless they become invalid
- final create state should show a short progress checklist, not a spinner alone

## Figma Frame Requirements
- Onboarding step 1 intent select
- Onboarding step 2 start mode
- Onboarding step 3 AI help mode
- Onboarding provider/demo state
- Onboarding final confirmation
- Onboarding blocked/provider missing
- Onboarding success/provisioning

## Exact Component Geometry
### OnboardingProgress
- top bar height target: `72 px`
- desktop step labels always visible
- mobile compresses labels into current-step summary plus progress bar

### IntentCardGrid
- desktop card width: `220-260 px`
- min card height: `168 px`
- card gap: `16 px`

### ProjectSummaryPanel
- width: `320-360 px` desktop
- internal padding: `20 px`
- remains sticky on desktop if vertical space allows

## Step-Specific Rules
### Step 1: Domain intent
- cards must include domain icon, short explanation, and one result-oriented example
- game and film should feel like first-class choices, not side options

### Step 2: Start mode
- template, blank, import and demo must be mutually clear
- template cards should show speed and structure benefit, not a long template catalog at this stage

### Step 3: AI help mode
- guided, standard, advanced and no-AI options should explain control level and expected involvement
- no option should imply permanent lock-in; this is a starting mode

### Step 4: Provider setup lite
- one provider choice, one demo path, one readiness note
- anything deeper routes to Settings

### Step 5: Confirmation
- name, workspace, selected path, destination mode, and blockers if any
- `Create Project` must be the only dominant action

## Responsive Rules
### Desktop
- decision cards center stage
- summary rail visible
- footer actions pinned

### Tablet
- summary rail may move below cards
- progress labels shorten but remain visible

### Mobile
- one card column
- summary collapses into an expandable section
- footer actions stay sticky to viewport bottom when safe

## Handoff Contract
- default exit after successful creation: Studio Home for broad workspace setup, Workbench for direct build intent
- if the chosen start mode implies immediate making, prefer direct Workbench entry
- if provider/runtime is blocked and demo exists, success path should still produce a usable project shell

