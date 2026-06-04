# Authenticated UX Surface Audit

- Base URL: http://127.0.0.1:3064
- Viewports: desktop 1440x1000, mobile 390x844
- Auth method: signed JWT injected through cookie `token` and localStorage `aethel-token`
- Error budgets: console <= 0, network <= 0
- Note: screenshots live under `output/playwright/v22-authenticated/` and are intentionally not versioned.

| Viewport | Route | Status | Final URL | Route match | Screenshot | Stabilization | Signals | Auth chrome | Console errors | Network errors |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: | ---: |
| desktop | /dashboard | 200 | http://127.0.0.1:3064/dashboard | yes | output/playwright/v22-authenticated/desktop-dashboard.png | domcontentloaded+settle(500ms) | ok | clean | 0 | 0 |
| desktop | /ide | 200 | http://127.0.0.1:3064/ide | yes | output/playwright/v22-authenticated/desktop-ide.png | networkidle | ok | clean | 0 | 0 |
| desktop | /studio | 200 | http://127.0.0.1:3064/studio | yes | output/playwright/v22-authenticated/desktop-studio.png | networkidle | ok | clean | 0 | 0 |
| desktop | /studio/level | 200 | http://127.0.0.1:3064/studio/level | yes | output/playwright/v22-authenticated/desktop-studio-level.png | domcontentloaded+settle(500ms) | ok | clean | 0 | 0 |
| desktop | /studio/scene | 200 | http://127.0.0.1:3064/studio/scene | yes | output/playwright/v22-authenticated/desktop-studio-scene.png | networkidle | ok | clean | 0 | 0 |
| desktop | /studio/film | 200 | http://127.0.0.1:3064/studio/film | yes | output/playwright/v22-authenticated/desktop-studio-film.png | networkidle | ok | clean | 0 | 0 |
| desktop | /admin | 200 | http://127.0.0.1:3064/admin | yes | output/playwright/v22-authenticated/desktop-admin.png | domcontentloaded+settle(500ms) | ok | clean | 0 | 0 |
| desktop | /billing | 200 | http://127.0.0.1:3064/billing | yes | output/playwright/v22-authenticated/desktop-billing.png | networkidle | ok | clean | 0 | 0 |
| desktop | /settings | 200 | http://127.0.0.1:3064/settings | yes | output/playwright/v22-authenticated/desktop-settings.png | networkidle | ok | clean | 0 | 0 |
| desktop | /evidence | 200 | http://127.0.0.1:3064/evidence | yes | output/playwright/v22-authenticated/desktop-evidence.png | domcontentloaded+settle(500ms) | ok | clean | 0 | 0 |
| mobile | /dashboard | 200 | http://127.0.0.1:3064/dashboard | yes | output/playwright/v22-authenticated/mobile-dashboard.png | domcontentloaded+settle(500ms) | ok | clean | 0 | 0 |
| mobile | /ide | 200 | http://127.0.0.1:3064/ide | yes | output/playwright/v22-authenticated/mobile-ide.png | networkidle | ok | clean | 0 | 0 |
| mobile | /studio | 200 | http://127.0.0.1:3064/studio | yes | output/playwright/v22-authenticated/mobile-studio.png | networkidle | ok | clean | 0 | 0 |
| mobile | /studio/level | 200 | http://127.0.0.1:3064/studio/level | yes | output/playwright/v22-authenticated/mobile-studio-level.png | domcontentloaded+settle(500ms) | ok | clean | 0 | 0 |
| mobile | /studio/scene | 200 | http://127.0.0.1:3064/studio/scene | yes | output/playwright/v22-authenticated/mobile-studio-scene.png | networkidle | ok | clean | 0 | 0 |
| mobile | /studio/film | 200 | http://127.0.0.1:3064/studio/film | yes | output/playwright/v22-authenticated/mobile-studio-film.png | networkidle | ok | clean | 0 | 0 |
| mobile | /admin | 200 | http://127.0.0.1:3064/admin | yes | output/playwright/v22-authenticated/mobile-admin.png | networkidle | ok | clean | 0 | 0 |
| mobile | /billing | 200 | http://127.0.0.1:3064/billing | yes | output/playwright/v22-authenticated/mobile-billing.png | networkidle | ok | clean | 0 | 0 |
| mobile | /settings | 200 | http://127.0.0.1:3064/settings | yes | output/playwright/v22-authenticated/mobile-settings.png | networkidle | ok | clean | 0 | 0 |
| mobile | /evidence | 200 | http://127.0.0.1:3064/evidence | yes | output/playwright/v22-authenticated/mobile-evidence.png | networkidle | ok | clean | 0 | 0 |

## Network Error Evidence

- none
