# Authenticated UX Surface Audit

- Base URL: http://localhost:3000
- Viewports: desktop 1440x1000, mobile 390x844
- Auth method: signed JWT injected through cookie `token` and localStorage `aethel-token`
- Error budgets: console <= 0, network <= 0
- Note: screenshots live under `output/playwright/v22-authenticated/` and are intentionally not versioned.

| Viewport | Route | Status | Final URL | Screenshot | Stabilization | Console errors | Network errors |
| --- | --- | ---: | --- | --- | --- | ---: | ---: |
| desktop | /dashboard | 200 | http://localhost:3000/dashboard | output/playwright/v22-authenticated/desktop-dashboard.png | domcontentloaded+settle(500ms) | 0 | 0 |
| desktop | /ide | 200 | http://localhost:3000/ide | output/playwright/v22-authenticated/desktop-ide.png | domcontentloaded+settle(500ms) | 0 | 0 |
| desktop | /studio | 200 | http://localhost:3000/studio | output/playwright/v22-authenticated/desktop-studio.png | networkidle | 0 | 0 |
| desktop | /studio/level | 200 | http://localhost:3000/studio/level | output/playwright/v22-authenticated/desktop-studio-level.png | networkidle | 0 | 0 |
| desktop | /studio/scene | 200 | http://localhost:3000/studio/scene | output/playwright/v22-authenticated/desktop-studio-scene.png | networkidle | 0 | 0 |
| desktop | /studio/film | 200 | http://localhost:3000/studio/film | output/playwright/v22-authenticated/desktop-studio-film.png | networkidle | 0 | 0 |
| desktop | /admin | 200 | http://localhost:3000/admin | output/playwright/v22-authenticated/desktop-admin.png | domcontentloaded+settle(500ms) | 0 | 0 |
| desktop | /billing | 200 | http://localhost:3000/billing | output/playwright/v22-authenticated/desktop-billing.png | domcontentloaded+settle(500ms) | 0 | 0 |
| desktop | /settings | 200 | http://localhost:3000/settings | output/playwright/v22-authenticated/desktop-settings.png | networkidle | 0 | 0 |
| desktop | /evidence | 200 | http://localhost:3000/evidence | output/playwright/v22-authenticated/desktop-evidence.png | networkidle | 0 | 0 |
| mobile | /dashboard | 200 | http://localhost:3000/dashboard | output/playwright/v22-authenticated/mobile-dashboard.png | domcontentloaded+settle(500ms) | 0 | 0 |
| mobile | /ide | 200 | http://localhost:3000/ide | output/playwright/v22-authenticated/mobile-ide.png | domcontentloaded+settle(500ms) | 0 | 0 |
| mobile | /studio | 200 | http://localhost:3000/studio | output/playwright/v22-authenticated/mobile-studio.png | networkidle | 0 | 0 |
| mobile | /studio/level | 200 | http://localhost:3000/studio/level | output/playwright/v22-authenticated/mobile-studio-level.png | domcontentloaded+settle(500ms) | 0 | 0 |
| mobile | /studio/scene | 200 | http://localhost:3000/studio/scene | output/playwright/v22-authenticated/mobile-studio-scene.png | networkidle | 0 | 0 |
| mobile | /studio/film | 200 | http://localhost:3000/studio/film | output/playwright/v22-authenticated/mobile-studio-film.png | networkidle | 0 | 0 |
| mobile | /admin | 200 | http://localhost:3000/admin | output/playwright/v22-authenticated/mobile-admin.png | networkidle | 0 | 0 |
| mobile | /billing | 200 | http://localhost:3000/billing | output/playwright/v22-authenticated/mobile-billing.png | domcontentloaded+settle(500ms) | 0 | 0 |
| mobile | /settings | 200 | http://localhost:3000/settings | output/playwright/v22-authenticated/mobile-settings.png | networkidle | 0 | 0 |
| mobile | /evidence | 200 | http://localhost:3000/evidence | output/playwright/v22-authenticated/mobile-evidence.png | networkidle | 0 | 0 |

## Network Error Evidence

- none
