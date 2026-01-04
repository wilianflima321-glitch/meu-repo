/**
 * Internationalization (NLS) for AI IDE
 * Centralized string localization to avoid mixing languages
 */
export declare const NLS: {
    executor: {
        title: string;
        executing: string;
        completed: string;
        failed: string;
        timedOut: string;
        truncated: string;
        terminated: string;
        exitCode: string;
        showLogs: string;
        exportMetrics: string;
    };
    agents: {
        orchestrator: {
            name: string;
            description: string;
            selecting: string;
            delegating: string;
        };
        coder: {
            name: string;
            description: string;
        };
        architect: {
            name: string;
            description: string;
        };
        universal: {
            name: string;
            description: string;
        };
        command: {
            name: string;
            description: string;
        };
        appTester: {
            name: string;
            description: string;
        };
    };
    config: {
        title: string;
        agents: string;
        providers: string;
        models: string;
        tools: string;
        variables: string;
        prompts: string;
        save: string;
        cancel: string;
        reset: string;
        apply: string;
    };
    health: {
        title: string;
        status: string;
        metrics: string;
        errors: string;
        warnings: string;
        performance: string;
        p95: string;
        p99: string;
        totalRequests: string;
        successRate: string;
        errorRate: string;
        avgDuration: string;
        exportMetrics: string;
        refresh: string;
    };
    onboarding: {
        welcome: string;
        subtitle: string;
        getStarted: string;
        learnMore: string;
        shortcuts: string;
        documentation: string;
        skip: string;
        next: string;
        previous: string;
        finish: string;
    };
    tooltips: {
        executor: string;
        preview: string;
        voice: string;
        aiButton: string;
        settings: string;
        health: string;
    };
    common: {
        loading: string;
        error: string;
        warning: string;
        info: string;
        success: string;
        close: string;
        open: string;
        details: string;
        hide: string;
        show: string;
        copy: string;
        paste: string;
        delete: string;
        edit: string;
        add: string;
        remove: string;
        search: string;
        filter: string;
        sort: string;
        refresh: string;
        export: string;
        import: string;
    };
    errors: {
        generic: string;
        network: string;
        timeout: string;
        notFound: string;
        unauthorized: string;
        forbidden: string;
        serverError: string;
        invalidInput: string;
        missingRequired: string;
    };
};
/**
 * Get localized string by path
 * Example: nls('executor.title') => 'AI Workspace Executor'
 */
export declare function nls(path: string): string;
/**
 * Get localized string with parameters
 * Example: nlsFormat('errors.custom', { code: 404 }) => 'Error 404'
 */
export declare function nlsFormat(path: string, params: Record<string, any>): string;
