# Authenticated UX Surface Audit

- Base URL: http://localhost:3000
- Viewports: desktop 1440x1000, mobile 390x844
- Auth method: signed JWT injected through cookie `token` and localStorage `aethel-token`
- Note: screenshots live under `output/playwright/v22-authenticated/` and are intentionally not versioned.

| Viewport | Route | Status | Final URL | Screenshot | Stabilization | Console errors | Network errors |
| --- | --- | ---: | --- | --- | --- | ---: | ---: |
| desktop | /dashboard | 200 | http://localhost:3000/dashboard | output/playwright/v22-authenticated/desktop-dashboard.png | domcontentloaded+settle(500ms) | 6 | 6 |
| desktop | /ide | 200 | http://localhost:3000/ide | output/playwright/v22-authenticated/desktop-ide.png | domcontentloaded+settle(500ms) | 8 | 8 |
| desktop | /studio | 200 | http://localhost:3000/studio | output/playwright/v22-authenticated/desktop-studio.png | networkidle | 0 | 0 |
| desktop | /studio/level | 200 | http://localhost:3000/studio/level | output/playwright/v22-authenticated/desktop-studio-level.png | networkidle | 2 | 2 |
| desktop | /studio/scene | 200 | http://localhost:3000/studio/scene | output/playwright/v22-authenticated/desktop-studio-scene.png | networkidle | 0 | 0 |
| desktop | /studio/film | 200 | http://localhost:3000/studio/film | output/playwright/v22-authenticated/desktop-studio-film.png | networkidle | 0 | 0 |
| desktop | /admin | 200 | http://localhost:3000/admin | output/playwright/v22-authenticated/desktop-admin.png | networkidle | 1 | 1 |
| desktop | /billing | 200 | http://localhost:3000/billing | output/playwright/v22-authenticated/desktop-billing.png | domcontentloaded+settle(500ms) | 3 | 3 |
| desktop | /settings | 200 | http://localhost:3000/settings | output/playwright/v22-authenticated/desktop-settings.png | networkidle | 0 | 0 |
| desktop | /evidence | 200 | http://localhost:3000/evidence | output/playwright/v22-authenticated/desktop-evidence.png | networkidle | 2 | 2 |
| mobile | /dashboard | 200 | http://localhost:3000/dashboard | output/playwright/v22-authenticated/mobile-dashboard.png | domcontentloaded+settle(500ms) | 6 | 6 |
| mobile | /ide | 200 | http://localhost:3000/ide | output/playwright/v22-authenticated/mobile-ide.png | domcontentloaded+settle(500ms) | 9 | 9 |
| mobile | /studio | 200 | http://localhost:3000/studio | output/playwright/v22-authenticated/mobile-studio.png | networkidle | 0 | 0 |
| mobile | /studio/level | 200 | http://localhost:3000/studio/level | output/playwright/v22-authenticated/mobile-studio-level.png | networkidle | 2 | 2 |
| mobile | /studio/scene | 200 | http://localhost:3000/studio/scene | output/playwright/v22-authenticated/mobile-studio-scene.png | networkidle | 0 | 0 |
| mobile | /studio/film | 200 | http://localhost:3000/studio/film | output/playwright/v22-authenticated/mobile-studio-film.png | networkidle | 0 | 0 |
| mobile | /admin | 200 | http://localhost:3000/admin | output/playwright/v22-authenticated/mobile-admin.png | domcontentloaded+settle(500ms) | 1 | 1 |
| mobile | /billing | 200 | http://localhost:3000/billing | output/playwright/v22-authenticated/mobile-billing.png | networkidle | 3 | 3 |
| mobile | /settings | 200 | http://localhost:3000/settings | output/playwright/v22-authenticated/mobile-settings.png | networkidle | 0 | 0 |
| mobile | /evidence | 200 | http://localhost:3000/evidence | output/playwright/v22-authenticated/mobile-evidence.png | networkidle | 2 | 2 |

## Network Error Evidence

### desktop /dashboard
  - GET 404 /api/wallet/summary (fetch)
  - GET 500 /api/usage/status (fetch)
  - GET 404 /api/connectivity/status (fetch)
  - GET 404 /api/studio/cost/live (fetch)
  - GET 404 /api/studio/access/full (fetch)
  - GET 404 /api/copilot/workflows?archived=false (fetch)

### desktop /ide
  - GET 500 /api/system-health (fetch)
  - GET 500 /api/system-health (fetch)
  - POST 403 /api/files/tree (fetch)
  - GET 404 /api/auth/profile (fetch)
  - GET 404 /api/studio/cost/live?projectId=default (fetch)
  - POST 403 /api/files/tree (fetch)
  - POST 403 /api/files/tree (fetch)
  - POST 403 /api/files/tree (fetch)

### desktop /studio/level
  - POST 403 /api/files/fs (fetch)
  - POST 403 /api/files/fs (fetch)

### desktop /admin
  - GET 404 /api/admin/users (fetch)

### desktop /billing
  - GET 404 /api/billing/usage (fetch)
  - GET 404 /api/billing/subscription (fetch)
  - GET 404 /api/billing/subscription (fetch)

### desktop /evidence
  - GET 404 /api/projects (fetch)
  - GET 404 /api/projects (fetch)

### mobile /dashboard
  - GET 404 /api/wallet/summary (fetch)
  - GET 500 /api/usage/status (fetch)
  - GET 404 /api/studio/cost/live (fetch)
  - GET 404 /api/connectivity/status (fetch)
  - GET 404 /api/studio/access/full (fetch)
  - GET 404 /api/copilot/workflows?archived=false (fetch)

### mobile /ide
  - GET 500 /api/system-health (fetch)
  - GET 500 /api/system-health (fetch)
  - POST 403 /api/files/tree (fetch)
  - GET 404 /api/auth/profile (fetch)
  - POST 403 /api/files/tree (fetch)
  - POST 403 /api/files/tree (fetch)
  - GET 404 /api/studio/cost/live?projectId=default (fetch)
  - POST 403 /api/files/tree (fetch)

### mobile /studio/level
  - POST 403 /api/files/fs (fetch)
  - POST 403 /api/files/fs (fetch)

### mobile /admin
  - GET 404 /api/admin/users (fetch)

### mobile /billing
  - GET 404 /api/billing/usage (fetch)
  - GET 404 /api/billing/subscription (fetch)
  - GET 404 /api/billing/subscription (fetch)

### mobile /evidence
  - GET 404 /api/projects (fetch)
  - GET 404 /api/projects (fetch)
