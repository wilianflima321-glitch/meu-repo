# Authenticated UX Surface Audit

- Base URL: http://localhost:3000
- Viewports: desktop 1440x1000, mobile 390x844
- Auth method: signed JWT injected through cookie `token` and localStorage `aethel-token`
- Error budgets: console <= 20, network <= 100
- Note: screenshots live under `output/playwright/v22-authenticated/` and are intentionally not versioned.

| Viewport | Route | Status | Final URL | Route match | Screenshot | Stabilization | Console errors | Network errors |
| --- | --- | ---: | --- | --- | --- | --- | ---: | ---: |
| desktop | /dashboard | 200 | http://localhost:3000/dashboard | yes | output/playwright/v22-authenticated/desktop-dashboard.png | domcontentloaded+settle(500ms) | 0 | 0 |
| desktop | /ide | 200 | http://localhost:3000/ide | yes | output/playwright/v22-authenticated/desktop-ide.png | domcontentloaded+settle(500ms) | 0 | 0 |
| desktop | /studio | 200 | http://localhost:3000/studio | yes | output/playwright/v22-authenticated/desktop-studio.png | networkidle | 0 | 0 |
| desktop | /studio/level | 200 | http://localhost:3000/studio/level | yes | output/playwright/v22-authenticated/desktop-studio-level.png | domcontentloaded+settle(500ms) | 0 | 0 |
| desktop | /studio/scene | 200 | http://localhost:3000/studio/scene | yes | output/playwright/v22-authenticated/desktop-studio-scene.png | networkidle | 0 | 0 |
| desktop | /studio/film | 200 | http://localhost:3000/studio/film | yes | output/playwright/v22-authenticated/desktop-studio-film.png | networkidle | 0 | 0 |
| desktop | /admin | 200 | http://localhost:3000/admin | yes | output/playwright/v22-authenticated/desktop-admin.png | networkidle | 0 | 0 |
| desktop | /billing | 200 | http://localhost:3000/billing | yes | output/playwright/v22-authenticated/desktop-billing.png | domcontentloaded+settle(500ms) | 0 | 0 |
| desktop | /settings | 200 | http://localhost:3000/settings | yes | output/playwright/v22-authenticated/desktop-settings.png | networkidle | 0 | 0 |
| desktop | /evidence | 200 | http://localhost:3000/evidence | yes | output/playwright/v22-authenticated/desktop-evidence.png | networkidle | 0 | 0 |
| mobile | /dashboard | 200 | http://localhost:3000/dashboard | yes | output/playwright/v22-authenticated/mobile-dashboard.png | domcontentloaded+settle(500ms) | 0 | 0 |
| mobile | /ide | 200 | http://localhost:3000/ide | yes | output/playwright/v22-authenticated/mobile-ide.png | domcontentloaded+settle(500ms) | 0 | 0 |
| mobile | /studio | 200 | http://localhost:3000/studio | yes | output/playwright/v22-authenticated/mobile-studio.png | networkidle | 0 | 0 |
| mobile | /studio/level | 200 | http://localhost:3000/studio/level | yes | output/playwright/v22-authenticated/mobile-studio-level.png | domcontentloaded+settle(500ms) | 0 | 0 |
| mobile | /studio/scene | 200 | http://localhost:3000/studio/scene | yes | output/playwright/v22-authenticated/mobile-studio-scene.png | networkidle | 0 | 0 |
| mobile | /studio/film | 200 | http://localhost:3000/studio/film | yes | output/playwright/v22-authenticated/mobile-studio-film.png | networkidle | 0 | 0 |
| mobile | /admin | 200 | http://localhost:3000/admin | yes | output/playwright/v22-authenticated/mobile-admin.png | networkidle | 0 | 0 |
| mobile | /billing | 200 | http://localhost:3000/billing | yes | output/playwright/v22-authenticated/mobile-billing.png | domcontentloaded+settle(500ms) | 0 | 0 |
| mobile | /settings | 200 | http://localhost:3000/settings | yes | output/playwright/v22-authenticated/mobile-settings.png | networkidle | 0 | 0 |
| mobile | /evidence | 200 | http://localhost:3000/evidence | yes | output/playwright/v22-authenticated/mobile-evidence.png | networkidle | 0 | 0 |

## Network Error Evidence

- none
