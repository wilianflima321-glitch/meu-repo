/**
 * Internationalization (NLS) for AI IDE
 * Centralized string localization to avoid mixing languages
 */

export const NLS = {
    // Executor
    executor: {
        title: 'AI Workspace Executor',
        executing: 'Executing command...',
        completed: 'Command completed',
        failed: 'Command failed',
        timedOut: 'Command execution timed out and was terminated',
        truncated: 'Command output was truncated due to size limit',
        terminated: 'Command was terminated by signal',
        exitCode: 'Exit code',
        showLogs: 'Show Executor Logs',
        exportMetrics: 'Export Executor Metrics'
    },

    // Agents
    agents: {
        orchestrator: {
            name: 'Orchestrator',
            description: 'Analyzes requests and selects the most appropriate agent',
            selecting: 'Determining the most appropriate agent...',
            delegating: 'Delegating to agent'
        },
        coder: {
            name: 'Coder',
            description: 'Assists with code writing, refactoring, and debugging'
        },
        architect: {
            name: 'Architect',
            description: 'Analyzes project structure and provides architectural guidance'
        },
        universal: {
            name: 'Universal',
            description: 'Provides general programming assistance and knowledge'
        },
        command: {
            name: 'Command',
            description: 'Executes IDE commands and workspace operations'
        },
        appTester: {
            name: 'App Tester',
            description: 'Runs tests and validates functionality'
        }
    },

    // Configuration
    config: {
        title: 'AI Configuration',
        agents: 'Agents',
        providers: 'Providers',
        models: 'Models',
        tools: 'Tools',
        variables: 'Variables',
        prompts: 'Prompts',
        save: 'Save',
        cancel: 'Cancel',
        reset: 'Reset to Defaults',
        apply: 'Apply Changes'
    },

    // Health & Observability
    health: {
        title: 'AI Health',
        status: 'Status',
        metrics: 'Metrics',
        errors: 'Errors',
        warnings: 'Warnings',
        performance: 'Performance',
        p95: '95th Percentile',
        p99: '99th Percentile',
        totalRequests: 'Total Requests',
        successRate: 'Success Rate',
        errorRate: 'Error Rate',
        avgDuration: 'Average Duration',
        exportMetrics: 'Export Metrics',
        refresh: 'Refresh'
    },

    // Onboarding
    onboarding: {
        welcome: 'Welcome to AI IDE',
        subtitle: 'Your intelligent development assistant',
        getStarted: 'Get Started',
        learnMore: 'Learn More',
        shortcuts: 'Keyboard Shortcuts',
        documentation: 'Documentation',
        skip: 'Skip',
        next: 'Next',
        previous: 'Previous',
        finish: 'Finish'
    },

    // Tooltips
    tooltips: {
        executor: 'Execute commands in the workspace with streaming output',
        preview: 'Preview changes in real-time',
        voice: 'Voice input for hands-free coding',
        aiButton: 'Open AI assistant panel',
        settings: 'Configure AI settings',
        health: 'View AI system health and metrics'
    },

    // Common
    common: {
        loading: 'Loading...',
        error: 'Error',
        warning: 'Warning',
        info: 'Information',
        success: 'Success',
        close: 'Close',
        open: 'Open',
        details: 'Details',
        hide: 'Hide',
        show: 'Show',
        copy: 'Copy',
        paste: 'Paste',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        remove: 'Remove',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        refresh: 'Refresh',
        export: 'Export',
        import: 'Import'
    },

    // Errors
    errors: {
        generic: 'An error occurred',
        network: 'Network error',
        timeout: 'Request timed out',
        notFound: 'Not found',
        unauthorized: 'Unauthorized',
        forbidden: 'Forbidden',
        serverError: 'Server error',
        invalidInput: 'Invalid input',
        missingRequired: 'Required field is missing'
    }
};

/**
 * Get localized string by path
 * Example: nls('executor.title') => 'AI Workspace Executor'
 */
export function nls(path: string): string {
    const parts = path.split('.');
    let current: any = NLS;
    
    for (const part of parts) {
        if (current[part] === undefined) {
            console.warn(`NLS: Missing translation for '${path}'`);
            return path;
        }
        current = current[part];
    }
    
    return typeof current === 'string' ? current : path;
}

/**
 * Get localized string with parameters
 * Example: nlsFormat('errors.custom', { code: 404 }) => 'Error 404'
 */
export function nlsFormat(path: string, params: Record<string, any>): string {
    let text = nls(path);
    
    for (const [key, value] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    
    return text;
}
