# Authenticated UX Surface Audit

- Base URL: http://localhost:3000
- Viewports: desktop 1440x1000, mobile 390x844
- Auth method: signed JWT injected through cookie `token` and localStorage `aethel-token`
- Note: screenshots live under `output/playwright/v22-authenticated/` and are intentionally not versioned.

| Viewport | Route | Status | Final URL | Screenshot | Stabilization | Console errors |
| --- | --- | ---: | --- | --- | --- | ---: |
| desktop | /dashboard | 200 | http://localhost:3000/dashboard | output/playwright/v22-authenticated/desktop-dashboard.png | domcontentloaded+settle(500ms) | 13 |
| desktop | /ide | 200 | http://localhost:3000/ide | output/playwright/v22-authenticated/desktop-ide.png | domcontentloaded+settle(500ms) | 8 |
| desktop | /studio | 200 | http://localhost:3000/studio | output/playwright/v22-authenticated/desktop-studio.png | networkidle | 0 |
| desktop | /studio/level | 200 | http://localhost:3000/studio/level | output/playwright/v22-authenticated/desktop-studio-level.png | networkidle | 2 |
| desktop | /studio/scene | 200 | http://localhost:3000/studio/scene | output/playwright/v22-authenticated/desktop-studio-scene.png | networkidle | 0 |
| desktop | /studio/film | 200 | http://localhost:3000/studio/film | output/playwright/v22-authenticated/desktop-studio-film.png | networkidle | 0 |
| desktop | /admin | 200 | http://localhost:3000/admin | output/playwright/v22-authenticated/desktop-admin.png | networkidle | 1 |
| desktop | /billing | 200 | http://localhost:3000/billing | output/playwright/v22-authenticated/desktop-billing.png | domcontentloaded+settle(500ms) | 3 |
| desktop | /settings | 200 | http://localhost:3000/settings | output/playwright/v22-authenticated/desktop-settings.png | networkidle | 0 |
| desktop | /evidence | 200 | http://localhost:3000/evidence | output/playwright/v22-authenticated/desktop-evidence.png | networkidle | 2 |
| mobile | /dashboard | 200 | http://localhost:3000/dashboard | output/playwright/v22-authenticated/mobile-dashboard.png | domcontentloaded+settle(500ms) | 14 |
| mobile | /ide | 200 | http://localhost:3000/ide | output/playwright/v22-authenticated/mobile-ide.png | domcontentloaded+settle(500ms) | 14 |
| mobile | /studio | 200 | http://localhost:3000/studio | output/playwright/v22-authenticated/mobile-studio.png | networkidle | 0 |
| mobile | /studio/level | 200 | http://localhost:3000/studio/level | output/playwright/v22-authenticated/mobile-studio-level.png | networkidle | 2 |
| mobile | /studio/scene | 200 | http://localhost:3000/studio/scene | output/playwright/v22-authenticated/mobile-studio-scene.png | networkidle | 0 |
| mobile | /studio/film | 200 | http://localhost:3000/studio/film | output/playwright/v22-authenticated/mobile-studio-film.png | networkidle | 0 |
| mobile | /admin | 200 | http://localhost:3000/admin | output/playwright/v22-authenticated/mobile-admin.png | networkidle | 1 |
| mobile | /billing | 200 | http://localhost:3000/billing | output/playwright/v22-authenticated/mobile-billing.png | networkidle | 3 |
| mobile | /settings | 200 | http://localhost:3000/settings | output/playwright/v22-authenticated/mobile-settings.png | networkidle | 0 |
| mobile | /evidence | 200 | http://localhost:3000/evidence | output/playwright/v22-authenticated/mobile-evidence.png | networkidle | 2 |
