# Offline and CSP Compliance

Documentation for offline functionality and Content Security Policy compliance.

## Offline Font Bundles

### Status

✅ **Configured**: Local font definitions in `src/browser/style/fonts.css`  
⚠️ **Pending**: Actual font files need to be added to `src/browser/style/fonts/`

### Font Files Required

See `src/browser/style/fonts/README.md` for complete list and download instructions.

**Inter (UI Font)**:
- `inter-regular.woff2` / `inter-regular.woff`
- `inter-medium.woff2` / `inter-medium.woff`
- `inter-semibold.woff2` / `inter-semibold.woff`
- `inter-bold.woff2` / `inter-bold.woff`

**JetBrains Mono (Code Font)**:
- `jetbrains-mono-regular.woff2` / `jetbrains-mono-regular.woff`
- `jetbrains-mono-semibold.woff2` / `jetbrains-mono-semibold.woff`

**Codicons (Icon Font)**:
- `codicon.ttf`

### Fallback Behavior

If font files are missing, CSS falls back to system fonts:
- Inter → Segoe UI, Roboto, Helvetica Neue, Arial
- JetBrains Mono → Fira Code, Consolas, Courier New
- Codicons → Unicode symbols (degraded icons)

### Validation

Test offline font loading:

```bash
# 1. Build the package
npm run build:ai-ide

# 2. Serve locally without network
python3 -m http.server 8000 --directory lib/browser/style

# 3. Open in browser with DevTools Network tab
# - Disable cache
# - Set throttling to "Offline"
# - Reload page
# - Check for font loading errors
```

Expected result: No 404 errors for font files (or graceful fallback to system fonts).

## Content Security Policy (CSP)

### Current CSP Configuration

**Status**: ⚠️ Needs verification in production environment

**Recommended CSP Headers**:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  img-src 'self' data: blob:;
  connect-src 'self' ws: wss:;
  worker-src 'self' blob:;
```

### CSP Compliance Checklist

- [x] **No external font CDNs**: Fonts loaded from local bundle
- [x] **No external style CDNs**: All CSS bundled locally
- [ ] **Inline styles**: Some components use inline styles (needs audit)
- [ ] **Inline scripts**: Check for inline event handlers
- [ ] **eval() usage**: Verify no dynamic code execution

### Testing CSP Compliance

#### 1. Browser DevTools

```javascript
// In browser console
// Check for CSP violations
window.addEventListener('securitypolicyviolation', (e) => {
  console.error('CSP Violation:', e.violatedDirective, e.blockedURI);
});
```

#### 2. CSP Evaluator

Use [CSP Evaluator](https://csp-evaluator.withgoogle.com/) to validate policy.

#### 3. Automated Testing

```typescript
// csp-validation.spec.ts
import { test, expect } from '@playwright/test';

test('should not violate CSP', async ({ page }) => {
  const violations: any[] = [];
  
  page.on('console', msg => {
    if (msg.text().includes('CSP')) {
      violations.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  expect(violations).toHaveLength(0);
});
```

### Known CSP Issues

**Issue**: Monaco Editor requires `unsafe-eval` for syntax highlighting  
**Mitigation**: Use Web Workers for code execution  
**Status**: Accepted risk (common in IDEs)

**Issue**: React DevTools requires `unsafe-inline`  
**Mitigation**: Disable in production builds  
**Status**: Development-only

## Electron Offline Mode

### Configuration

For Electron builds, ensure offline mode works:

```javascript
// main.js
const { app, BrowserWindow } = require('electron');

app.on('ready', () => {
  const win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Load local files
  win.loadFile('index.html');
});
```

### Testing Offline in Electron

```bash
# 1. Build Electron app
npm run build:electron

# 2. Disable network
sudo ifconfig en0 down  # macOS
sudo ip link set eth0 down  # Linux

# 3. Launch app
npm run start:electron

# 4. Verify functionality
# - UI loads correctly
# - Fonts render properly
# - Icons display
# - No network errors in console

# 5. Re-enable network
sudo ifconfig en0 up  # macOS
sudo ip link set eth0 up  # Linux
```

## Service Worker for Offline Support

### Implementation (Optional)

```javascript
// service-worker.js
const CACHE_NAME = 'ai-ide-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style/index.css',
  '/style/fonts.css',
  '/style/fonts/inter-regular.woff2',
  '/style/fonts/jetbrains-mono-regular.woff2',
  '/style/fonts/codicon.ttf'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### Registration

```typescript
// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('Service Worker registered'))
    .catch(err => console.error('Service Worker registration failed', err));
}
```

## Validation Checklist

### Pre-Release Validation

- [ ] All font files present in `src/browser/style/fonts/`
- [ ] Fonts load without network access
- [ ] Icons render correctly offline
- [ ] No CSP violations in browser console
- [ ] Electron app works offline
- [ ] Service worker caches critical assets (if implemented)
- [ ] No external CDN dependencies
- [ ] All styles bundled locally

### Testing Environments

1. **Browser (Chrome/Firefox/Safari)**
   - Offline mode via DevTools
   - CSP violations monitoring
   - Font loading verification

2. **Electron**
   - Network disabled at OS level
   - All features functional
   - No console errors

3. **CI/CD**
   - Automated CSP validation
   - Font file presence check
   - Bundle size monitoring

## Troubleshooting

### Fonts not loading offline

**Symptom**: System fonts used instead of custom fonts

**Causes**:
1. Font files missing from bundle
2. Incorrect font-face src paths
3. CORS issues (if served from different origin)

**Solutions**:
```bash
# Check font files exist
ls -la src/browser/style/fonts/

# Verify font-face paths in CSS
grep "url(" src/browser/style/fonts.css

# Test with local server
python3 -m http.server 8000
```

### CSP violations

**Symptom**: Console errors about blocked resources

**Causes**:
1. External CDN references
2. Inline event handlers
3. eval() or Function() usage

**Solutions**:
```bash
# Find external references
grep -r "https://" src/browser/style/

# Find inline handlers
grep -r "onclick=" src/

# Find eval usage
grep -r "eval(" src/
```

### Icons not displaying

**Symptom**: Missing or broken icons

**Causes**:
1. Codicon font not loaded
2. Incorrect icon class names
3. CSS not applied

**Solutions**:
```css
/* Verify codicon font-face */
@font-face {
  font-family: 'codicon';
  src: url('./fonts/codicon.ttf') format('truetype');
}

/* Check icon classes */
.codicon-warning:before { content: '\ea6c'; }
```

## Performance Impact

### Bundle Size

**With local fonts**:
- Inter: ~400KB (4 weights × 2 formats)
- JetBrains Mono: ~200KB (2 weights × 2 formats)
- Codicons: ~100KB
- **Total**: ~700KB additional bundle size

**Trade-offs**:
- ✅ Offline functionality
- ✅ No CDN dependency
- ✅ Consistent rendering
- ❌ Larger initial download
- ❌ Slower first load (without cache)

### Optimization

```javascript
// Preload critical fonts
<link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/codicon.ttf" as="font" type="font/ttf" crossorigin>
```

## See Also

- [Font Bundle README](./src/browser/style/fonts/README.md)
- [CSP Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
