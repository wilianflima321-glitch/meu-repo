export * from '@theia/plugin-ext';
declare module '@theia/plugin-ext' {
    /**
     * Extension of the package manifest interface defined by the core plugin framework.
     */
    interface PluginPackage {
        /**
         * Analogues of declarations offered by VS Code plugins, but for the headless instantiation.
         */
        headless?: {
            /** Activation events supported in headless mode, if any. */
            activationEvents?: string[];
        };
    }
}
/**
 * Name for a `string[]` injection binding contributing headless activation event names
 * supported by the application.
 */
export declare const SupportedHeadlessActivationEvents: unique symbol;
//# sourceMappingURL=headless-plugin-protocol.d.ts.map