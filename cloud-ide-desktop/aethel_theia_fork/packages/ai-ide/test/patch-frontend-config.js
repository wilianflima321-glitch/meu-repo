// Patch FrontendApplicationConfigProvider.set to be tolerant in test runs
try {
  const prov = require('@theia/core/lib/browser/frontend-application-config-provider');
  if (prov && prov.FrontendApplicationConfigProvider && typeof prov.FrontendApplicationConfigProvider.set === 'function') {
    const orig = prov.FrontendApplicationConfigProvider.set;
    prov.FrontendApplicationConfigProvider.set = function(cfg) {
      try {
        return orig.call(this, cfg);
      } catch (e) {
        // If configuration was already set, swallow the error in tests.
        if (e && e.message && e.message.indexOf('already set') !== -1) {
          // no-op
          return;
        }
        throw e;
      }
    };
  }
} catch (e) {
  // ignore if provider cannot be required yet
}

// Ensure a default frontend config exists for tests (some modules call get() eagerly)
try {
  const prov2 = require('@theia/core/lib/browser/frontend-application-config-provider');
  if (prov2 && prov2.FrontendApplicationConfigProvider && typeof prov2.FrontendApplicationConfigProvider.doGet === 'function') {
    try {
      // If not set, set an empty/default config to avoid throws during test runtime.
      if (prov2.FrontendApplicationConfigProvider.doGet() === undefined) {
        // Provide a minimal default config
        prov2.FrontendApplicationConfigProvider.set({});
      }
    } catch (e) {
      // swallow errors (e.g., already set) — we only want to make tests tolerant
    }
  }
} catch (e) {
  // ignore if provider not present yet
}
