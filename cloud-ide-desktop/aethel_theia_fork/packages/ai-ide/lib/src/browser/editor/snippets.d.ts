/**
 * Common Code Snippets
 * Professional snippets for major languages
 */
export interface Snippet {
    prefix: string;
    body: string[];
    description: string;
}
export declare const TYPESCRIPT_SNIPPETS: Record<string, Snippet>;
export declare const JAVASCRIPT_SNIPPETS: Record<string, Snippet>;
export declare const PYTHON_SNIPPETS: Record<string, Snippet>;
export declare const HTML_SNIPPETS: Record<string, Snippet>;
export declare const CSS_SNIPPETS: Record<string, Snippet>;
/**
 * Get snippets for language
 */
export declare function getSnippetsForLanguage(languageId: string): Record<string, Snippet>;
/**
 * Register snippets with Monaco
 */
export declare function registerSnippets(monaco: any): void;
