# 18_DEPTH_MODES_AND_HANDOFFS
Date: 2026-04-29
Status: BLUEPRINT
Surface Type: Product Continuity Contract

## Mission
Define how Aethel transitions between light entry, Studio Home, Studio Cloud, Operator, and Studio Local without feeling fragmented.

## Core Thesis
Users should feel depth increasing, not products changing.

## Canonical Depth Modes
1. Web Light
2. Studio Home
3. Operator Surface
4. Studio Cloud
5. Studio Local

## Continuity Objects
These must persist across depth modes:
- current mission
- current project
- current artifact or output family
- active run state
- approvals pending
- evidence state
- cost state

## Mode Definitions

### Web Light
Use when:
- user is starting
- user is uncertain
- user needs a low-anxiety entry

Primary dominant object:
- mission input

### Studio Home
Use when:
- a mission already exists
- the system must orient the user
- the user needs the next best action

Primary dominant object:
- mission hero

### Operator Surface
Use when:
- the AI is acting on websites or connected platforms
- browser steps and approvals matter

Primary dominant object:
- browser canvas / operator action log

### Studio Cloud
Use when:
- the user needs implementation depth in-browser
- artifact review is active
- code/preview/AI loop matters

Primary dominant object:
- editor or artifact viewport, depending on task

### Studio Local
Use when:
- browser limits are in the way
- local filesystem/runtime trust is required
- heavier workflows need more depth

Primary dominant object:
- same as Studio Cloud, with deeper local capability

## Canonical Handoffs

### Web Light -> Studio Home
Trigger:
- mission submitted
- project selected
- recent task resumed

Must preserve:
- prompt text
- inferred domain
- mission type

### Studio Home -> Operator
Trigger:
- user asks the AI to operate a website or platform
- task requires acting with user permission on the internet

Must preserve:
- mission scope
- approval level
- connected account context

### Studio Home -> Studio Cloud
Trigger:
- implementation work
- artifact editing
- runtime review
- code-level intervention

Must preserve:
- current objective
- current artifact
- related run/evidence context

### Studio Cloud -> Studio Local
Trigger:
- local runtime depth needed
- local tool access needed
- browser ceiling reached

Must preserve:
- open artifact
- layout mode
- selected file or object
- AI context
- pending reviews

### Operator -> Studio Cloud
Trigger:
- operator action produces an artifact change
- user needs to inspect, edit, or review output deeply

Must preserve:
- action ledger
- screenshots/evidence
- current state of the external task

## Dominant Surface Rule
Every mode must have one dominant surface:
- Web Light -> mission card
- Studio Home -> mission hero
- Operator -> browser
- Studio Cloud -> editor or viewport
- Studio Local -> editor or viewport

If more than one surface fights for dominance, the user experiences fragmentation.

## Shared Grammar
Across all modes, Aethel should reuse:
- mission chips
- state chips
- approval capsules
- evidence capsules
- cost capsules
- live/proposal artifact states

## Anti-Drift Rules
1. Do not create new top-level products when a depth mode is enough.
2. Do not let Operator become a detached app.
3. Do not let Studio Home become a mini IDE.
4. Do not let Web Light become a marketing page.
5. Do not let Local mode become a forked shell.

## Final Reading
This document exists to keep the product from drifting into:
- a generic AI web app,
- a generic dashboard,
- a disconnected operator,
- and a detached IDE.

Aethel wins when all five modes feel like one machine.
