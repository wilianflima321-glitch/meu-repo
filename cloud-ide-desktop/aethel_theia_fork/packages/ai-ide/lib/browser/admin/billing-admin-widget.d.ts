// Type-only shim for tests that import the compiled CommonJS widget.
// The actual runtime bundle is produced by the build; for TS noEmit we only need the surface.

declare class BillingAdminWidget {
  render(): any;
}

export { BillingAdminWidget };
