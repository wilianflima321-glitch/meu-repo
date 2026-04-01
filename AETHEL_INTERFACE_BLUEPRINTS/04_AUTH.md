# 04_AUTH
Date: 2026-03-25
Status: BLUEPRINT
Surface Type: Entry

## Mission
Get the user into the product with minimum friction and clear expectation of what happens next.

## Includes
- Login
- Register

## Shared Layout
- two-column split on desktop
- form column width: 420 to 480 px
- proof column width: flexible remainder
- vertical alignment centered on large screens
- mobile collapses to form first, proof panel second

## Shared Information Hierarchy
1. Form title
2. Primary auth method
3. Alternate auth method
4. Product proof panel
5. Minor support links

## Shared Layout Anatomy
### Left side: Auth form
- title
- one-line framing copy
- social login row
- divider
- email/password flow
- compact legal text
- switch auth mode link

### Right side: Product proof panel
- one premium product crop
- three proof points
- one line explaining what opens after auth

## Login Specific
### Primary CTA
- `Continue`

### Secondary actions
- `Forgot password`
- `Create account`

### Ideal copy
- sign in to continue your studio work
- resume your latest project and preview state

## Register Specific
### Primary CTA
- `Create account`

### Secondary actions
- `Sign in`

### Ideal copy
- create your workspace and start your first project

## Component Tree
### AuthFormShell
Subcomponents:
- AuthHeader
- SocialLoginRow
- DividerLabel
- InputGroup
- PasswordField
- SubmitButton
- AlternateAuthLink
- LegalNotice

### AuthProofPanel
Subcomponents:
- ProductCrop
- ProofPointList
- ExpectedOutcomeLine

## Field Rules
### Email field
- label always visible
- inline validation after blur and on submit
- support business email preference text only if relevant

### Password field
- visibility toggle on the right edge
- helper text only for register mode
- error shown inline under the field

## Microinteractions
- social buttons respond with strong focus and pressed states
- password visibility toggle must not shift layout
- switching between login and register preserves entered email if reasonable
- submit button enters loading state without changing width

## States
- default
- validation error
- auth provider error
- loading
- success redirect

## Mobile Behavior
- form first
- proof panel below
- no huge decorative crop above the form

## What To Avoid
- Technical jargon
- Huge screenshots that push the form below the fold
- Four or more competing secondary links

## Critical Opinion
### What this page should be
- fast
- trustworthy
- visually tied to the product

### What this page should not be
- decorative at the expense of task clarity
- text-heavy onboarding before account creation

## Interactions Between Components
- auth proof panel must strengthen intent but never distract from the form
- switching between login and register should preserve useful context where possible


## Detailed Component Specs
### AuthFormShell: exact vertical order
1. AuthHeader
2. SocialLoginRow
3. DividerLabel
4. EmailField
5. PasswordField
6. Optional confirm password or name fields in register
7. SubmitButton
8. AlternateAuthLink
9. LegalNotice

Rule:
- the submit button is always visible without scrolling on desktop
- helper copy must stay close to the relevant field
- alternate auth link belongs below the form, not in the header

### SocialLoginRow
- equal-width buttons
- provider icon left, label centered visually
- loading spinner replaces icon without changing button width

### AuthProofPanel
Contains:
- one product crop
- three proof bullets max
- one line about what happens after sign-in

Opinion:
This panel exists to reduce uncertainty, not to market aggressively.
If it gets louder than the form, the page fails.

## Microinteractions
- field validation appears inline below the field
- switching auth mode preserves entered email where possible
- submit loading keeps button size stable
- social auth errors map back into the form shell, not a detached toast only

## Figma Frame Requirements
- Login desktop default
- Register desktop default
- Login mobile
- Register mobile
- Auth error state
- Auth loading state

## Exact Component Geometry
### AuthFormShell
- width target: `440 px`
- internal padding: `28 px`
- section gap: `16 px`
- submit button height: `44 px`

### AuthProofPanel
- min height: `520 px` desktop
- internal padding: `32 px`
- product crop aspect ratio target: `4:3` or `16:10`

## Field and Action Anatomy
### EmailField
- label
- input
- helper text only when needed
- inline validation

### PasswordField
- label
- input
- visibility toggle
- optional forgot-password link in login mode
- inline validation

### SocialLoginRow
- max two primary providers visible without overflow
- equal button widths
- divider always below social row, never above header

## Responsive Rules
### Desktop
- form and proof panel side by side
- proof panel may carry stronger product crop

### Tablet
- proof panel narrows and simplifies to one crop plus two bullets

### Mobile
- form first and above the fold
- proof panel reduced to compact reassurance block
- forgot-password and alternate mode links remain reachable without scroll traps

## Error and Redirect Behavior
- provider auth error returns into the form shell with scoped explanation
- success redirect should show a short progress state only if redirect takes longer than instant
- if the user was invited to a workspace, the post-auth destination should reflect that context instead of generic entry
