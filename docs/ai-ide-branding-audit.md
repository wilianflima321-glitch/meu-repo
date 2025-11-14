# AI IDE Branding & UI Audit (2025-11-14)

## Completed adjustments in this pass
- **Brand palette**: Introduced primary/secondary/tertiary tokens in `packages/ai-ide/src/browser/style/index.css` so gradients, shadows and controls reuse the same colors as `cloud-web-app/web/public/aethel-logo.svg`.
- **Logomark**: Replaced the improvised glyph inside `AiIdeBrandingWidget` with the official Aethel path, including a descriptive `<title>` for accessibility.
- **Layout polish**: Restored the two-column layout of `ProviderConfigurationWidget` by styling the missing `.provider-config-columns` wrapper and added responsive fallbacks for narrow widths.
- **Action affordances**: Updated quick-action buttons and primary CTAs to share the same gradient + hover treatment so the top banner, footer buttons and cards feel cohesive.

## Outstanding gaps
| Area | Observation | Impact | Recommendation |
| --- | --- | --- | --- |
| Language consistency | Branding bar copy is in pt-BR while configuration widgets (`provider`, `agents`, `tools`) remain in English. | Creates a fragmented experience and complicates documentation/support. | Pick a primary locale (likely English) and wire strings through the Theia `nls` service so we can localize intentionally instead of mixing languages inline. |
| Typography delivery | We import Inter/JetBrains fonts via Google Fonts at runtime. Air-gapped builds or CSP-restricted customers will silently fall back to system fonts. | Brand typography disappears in secure networks. | Bundle the font files locally (e.g., via `@fontsource`) or ship woff2 assets under `packages/ai-ide/src/browser/style/fonts`. |
| Secondary surfaces unthemed | Agent, variable, and MCP widgets still use stock Theia colors because their markup lives in compiled `lib` code without `ai-ide-*` classes. | Users leave the branded hero area and immediately hit generic Theia chrome. | Extend theming by wrapping those widgets with lightweight style adapters or by adding BEM-style hooks (e.g., `ai-ide-panel`) before compiling. |
| Iconography debt | Tool confirmation options expose `icon` metadata but never render codicons, so dropdowns feel text-only and fail to communicate risk levels. | Slower scanning for operations and inconsistent with "icon + label" language established in the branding bar. | Render the icons next to each option (or promote them to segmented buttons) using the same codicon sprite injected in `frontend-module.ts`. |
| Shared asset source | The logomark is still defined inline and will need manual edits whenever branding evolves. | High risk of divergence between desktop/web/mobile surfaces. | Move the canonical SVG into `packages/shared-branding/` (or reuse `cloud-web-app/web/public/aethel-logo.svg`) and import it so every surface references a single asset. |

## Recommended next steps
1. **Decide on localization strategy** (single-locale vs. translated) and refactor all visible strings to pass through `nls.localize`.
2. **Bundle fonts and codicons offline** so Electron builds meet CSP/air-gapped requirements.
3. **Add design-token utilities** (SCSS or CSS Modules) that other packages can import to avoid duplicating color values.
4. **Instrument UI visual tests** (Playwright screenshot diffs) to lock the new palette in place before tackling deeper layout work.
