# CI/CD Integration

Continuous Integration setup for AI IDE package.

## Test Suites

### Unit Tests (Mocha)

Located in `src/__tests__/`:
- `prompt-templates.spec.ts` - Prompt template validation and snapshots
- `orchestrator-delegation.spec.ts` - Agent delegation logic with mocked LLM

Run locally:
```bash
npm run test:ai-ide
```

### E2E Tests (Playwright)

Located in repository root:
- `soft-warn.spec.ts` - Soft warning banner UI tests
- `soft-warn-e2e.spec.ts` - LLM mock ensemble E2E tests
- `executor.spec.ts` - **NEW** Workspace executor tests (success/failure/toasts/channel)
- `accessibility.spec.ts` - **NEW** AXE accessibility tests for all screens
- `visual-regression.spec.ts` - **NEW** Visual regression snapshots

Run locally:
```bash
npm run test:e2e
```

Run specific test:
```bash
npx playwright test executor.spec.ts
```

## CI Pipeline

### GitHub Actions Workflow

File: `.github/workflows/ci-playwright.yml`

**Stages**:
1. Install dependencies
2. Run AI IDE unit tests (Mocha)
3. Install Playwright browsers
4. Start mock backend server
5. Run Playwright E2E tests
6. Archive test results and reports

**Test Execution**:
- All `*.spec.ts` files in repository root are executed
- Tests run with 2 retries in CI (1 retry locally)
- HTML report generated in `playwright-report/`
- JSON results saved to `test-results/playwright.json`

### Test Configuration

File: `playwright.config.ts`

```ts
// See repository root: playwright.config.ts
export default {
  testDir: '.',
  testMatch: ['*.spec.ts', 'examples/playwright/tests/*.spec.ts'],
  testIgnore: ['**/node_modules/**', '**/lib/**'],
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/playwright.json' }]
  ]
};
```

## Flakiness Investigation

### Common Causes

1. **Timing issues**: Async operations not properly awaited
2. **Mock backend delays**: Health check timeout
3. **Network flakes**: Intermittent connection issues
4. **Resource contention**: CI runner under load

### Mitigation Strategies

**Implemented**:
- Retry logic (2 retries in CI)
- Robust health check with backoff
- Explicit waits for elements
- Stable selectors (data-test attributes)

**Best Practices**:
```typescript
// ✅ Good: Explicit wait with timeout
await expect(element).toBeVisible({ timeout: 5000 });

// ✅ Good: Wait for network idle
await page.waitForLoadState('networkidle');

// ❌ Bad: Fixed sleep
await page.waitForTimeout(1000);

// ❌ Bad: No timeout
await element.click();
```

### Debugging Flaky Tests

1. **Run test multiple times**:
```bash
npx playwright test executor.spec.ts --repeat-each=10
```

2. **Enable trace on failure**:
```bash
npx playwright test --trace on-first-retry
```

3. **Check CI logs**:
- Mock server logs: `tools/ci/ci-mock.log`
- Playwright output: `playwright-report/`
- CI metrics: `tools/ci/ci-metrics.json`

4. **Local reproduction**:
```bash
# Start mock backend
npm run dev:mock-backend

# Run tests in headed mode
npx playwright test --headed --debug
```

## Adding New Tests

### 1. Create Test File

```typescript
// my-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    // Test implementation
  });
});
```

### 2. Update Test Patterns (if needed)

If test is in a subdirectory, update `playwright.config.js`:

```javascript
testMatch: ['*.spec.ts', 'my-dir/**/*.spec.ts']
```

### 3. Run Locally

```bash
npx playwright test my-feature.spec.ts
```

### 4. Verify in CI

Push to branch and check GitHub Actions workflow.

## Smoke Tests

Minimal smoke tests run before full Playwright suite:

File: `tools/ci/smoke_ci.sh`

**Checks**:
- Mock backend health endpoint
- Basic API responses
- Provider registration

## Metrics Collection

CI collects metrics for regression tracking:

File: `tools/ci/ci-metrics.json`

```json
{
  "health_wait_ms": 1234,
  "attempts": 5
}
```

**Tracked Metrics**:
- Mock backend startup time
- Health check attempts
- Test execution duration
- Flake rate (via retries)

## Artifacts

**Uploaded on every run**:
- `playwright-report.zip` - HTML test report
- `tools/ci/ci-mock.log` - Mock server logs
- `tools/ci/ci-metrics.json` - CI metrics
- `test-results/playwright.json` - Test results JSON

**Access artifacts**:
1. Go to GitHub Actions run
2. Scroll to "Artifacts" section
3. Download zip files

## Troubleshooting

### Tests pass locally but fail in CI

**Possible causes**:
- Different Node.js version
- Missing environment variables
- CI runner resource constraints
- Network/firewall differences

**Solutions**:
- Match Node.js version (check `.github/workflows/ci-playwright.yml`)
- Set `CI=true` locally: `CI=true npm run test:e2e`
- Check CI logs for specific errors

### Mock backend not starting

**Check**:
```bash
# Verify port 8010 is free
lsof -i :8010

# Check mock logs
cat tools/ci/ci-mock.log
cat tools/ci/ci-mock.err.log
```

**Fix**:
```bash
# Kill process on port 8010
kill -9 $(lsof -t -i:8010)

# Restart mock
npm run dev:mock-backend
```

### Playwright browsers not installed

```bash
npx playwright install --with-deps
```

## Performance Benchmarks

**Target metrics** (on GitHub Actions standard runner):
- Mock backend startup: < 5 seconds
- Health check wait: < 10 seconds
- Unit tests: < 30 seconds
- Playwright E2E: < 2 minutes
- Total CI time: < 5 minutes

**Current metrics** (as of last run):
- Check CI artifacts for `ci-metrics.json`

## Future Improvements

- [ ] Parallel test execution
- [ ] Visual regression baseline management
- [ ] Performance regression tracking
- [ ] Flake rate dashboard
- [ ] Test coverage reporting
- [ ] Integration with external monitoring (Datadog, Grafana)

## See Also

- [Playwright Documentation](https://playwright.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AI IDE Metrics](./METRICS.md)
- [Validation Guide](../../VALIDACAO_IDE_FUNCIONAL.md)
