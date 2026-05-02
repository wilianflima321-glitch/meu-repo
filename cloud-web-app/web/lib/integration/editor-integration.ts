/**
 * Editor Integration
 * Integrates LSP, AI, and other features with the code editor
 */

import {
  getLSPApiClient,
  LSPCodeActionResult,
  LSPCompletionResult,
  LSPHoverResult,
  LSPLocationResult,
  LSPTextEditResult,
  LSPWorkspaceEditResult,
} from '../api/lsp-api';
import {
  AICodeActionResponse,
  AICompletionResponse,
  AIHoverResponse,
  getAIApiClient,
} from '../api/ai-api';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('integration/editor-integration')

export interface EditorDocument {
  uri: string;
  languageId: string;
  version: number;
  content: string;
}

export interface EditorPosition {
  line: number;
  character: number;
}

export interface EditorRange {
  start: EditorPosition;
  end: EditorPosition;
}

export interface EditorDocumentChange {
  range?: EditorRange;
  rangeLength?: number;
  text: string;
}

export interface EditorCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: unknown;
  sortText?: string;
  [key: string]: unknown;
}

export interface EditorCompletionList {
  items: EditorCompletionItem[];
}

export interface EditorHover {
  contents: unknown;
  range?: EditorRange;
}

export interface EditorCodeAction {
  title: string;
  kind: string;
  edit?: unknown;
  command?: unknown;
  [key: string]: unknown;
}

export class EditorIntegration {
  private lspClient = getLSPApiClient();
  private aiClient = getAIApiClient();
  private openDocuments: Map<string, EditorDocument> = new Map();

  /**
   * Open document
   */
  async openDocument(document: EditorDocument): Promise<void> {
    this.openDocuments.set(document.uri, document);

    // Notify LSP
    if (this.lspClient.isServerActive(document.languageId)) {
      await this.lspClient.didOpen(
        document.languageId,
        document.uri,
        document.languageId,
        document.version,
        document.content
      );
    }

    log.info(`[Editor Integration] Opened document: ${document.uri}`);
  }

  /**
   * Change document
   */
  async changeDocument(uri: string, version: number, changes: EditorDocumentChange[]): Promise<void> {
    const document = this.openDocuments.get(uri);
    if (!document) {
      throw new Error(`Document not open: ${uri}`);
    }

    document.version = version;

    // Apply changes to content
    for (const change of changes) {
      if (change.range) {
        // Incremental change
        document.content = this.applyChange(document.content, change.range, change.text);
      } else {
        // Full document change
        document.content = change.text;
      }
    }

    // Notify LSP
    if (this.lspClient.isServerActive(document.languageId)) {
      await this.lspClient.didChange(document.languageId, uri, version, changes);
    }
  }

  /**
   * Close document
   */
  async closeDocument(uri: string): Promise<void> {
    const document = this.openDocuments.get(uri);
    if (!document) {
      return;
    }

    // Notify LSP
    if (this.lspClient.isServerActive(document.languageId)) {
      await this.lspClient.didClose(document.languageId, uri);
    }

    this.openDocuments.delete(uri);
    log.info(`[Editor Integration] Closed document: ${uri}`);
  }

  /**
   * Get completions
   */
  async getCompletions(uri: string, position: EditorPosition): Promise<EditorCompletionList> {
    const document = this.openDocuments.get(uri);
    if (!document) {
      throw new Error(`Document not open: ${uri}`);
    }

    // Try LSP first
    if (this.lspClient.isServerActive(document.languageId)) {
      try {
        const lspCompletions = await this.lspClient.completion(
          document.languageId,
          uri,
          position
        );

        // Enhance with AI if enabled
        if (this.aiClient.getConsent()) {
          const aiCompletions = await this.aiClient.getCompletions({
            language: document.languageId,
            code: document.content,
            position,
          });

          // Merge LSP and AI completions
          return this.mergeCompletions(lspCompletions, aiCompletions);
        }

        return { items: this.toCompletionItems(lspCompletions) };
      } catch (error) {
        log.warn('[Editor Integration] LSP completion failed:', error);
      }
    }

    // Fallback to AI only
    if (this.aiClient.getConsent()) {
      const aiCompletions = await this.aiClient.getCompletions({
        language: document.languageId,
        code: document.content,
        position,
      });

      return this.convertAICompletions(aiCompletions);
    }

    return { items: [] };
  }

  /**
   * Get hover information
   */
  async getHover(uri: string, position: EditorPosition): Promise<EditorHover | null> {
    const document = this.openDocuments.get(uri);
    if (!document) {
      throw new Error(`Document not open: ${uri}`);
    }

    // Try LSP first
    if (this.lspClient.isServerActive(document.languageId)) {
      try {
        const lspHover = await this.lspClient.hover(document.languageId, uri, position);

        // Enhance with AI if enabled
        if (this.aiClient.getConsent() && lspHover?.contents) {
          const symbol = this.getSymbolAtPosition(document.content, position);
          const aiHover = await this.aiClient.getHover({
            language: document.languageId,
            code: document.content,
            position,
            symbol,
          });

          return this.mergeHover(lspHover, aiHover);
        }

        return this.toEditorHover(lspHover);
      } catch (error) {
        log.warn('[Editor Integration] LSP hover failed:', error);
      }
    }

    return null;
  }

  /**
   * Get definition
   */
  async getDefinition(uri: string, position: EditorPosition): Promise<LSPLocationResult> {
    const document = this.openDocuments.get(uri);
    if (!document) {
      throw new Error(`Document not open: ${uri}`);
    }

    if (this.lspClient.isServerActive(document.languageId)) {
      return this.lspClient.definition(document.languageId, uri, position);
    }

    return null;
  }

  /**
   * Get references
   */
  async getReferences(uri: string, position: EditorPosition): Promise<LSPLocationResult> {
    const document = this.openDocuments.get(uri);
    if (!document) {
      throw new Error(`Document not open: ${uri}`);
    }

    if (this.lspClient.isServerActive(document.languageId)) {
      return this.lspClient.references(document.languageId, uri, position);
    }

    return [];
  }

  /**
   * Get code actions
   */
  async getCodeActions(uri: string, range: EditorRange, diagnostics: unknown[]): Promise<EditorCodeAction[]> {
    const document = this.openDocuments.get(uri);
    if (!document) {
      throw new Error(`Document not open: ${uri}`);
    }

    const actions: EditorCodeAction[] = [];

    // Get LSP code actions
    if (this.lspClient.isServerActive(document.languageId)) {
      try {
        const lspActions = await this.lspClient.codeActions(
          document.languageId,
          uri,
          range,
          { diagnostics }
        );
        actions.push(...this.convertLSPCodeActions(lspActions));
      } catch (error) {
        log.warn('[Editor Integration] LSP code actions failed:', error);
      }
    }

    // Get AI code actions
    if (this.aiClient.getConsent()) {
      try {
        const aiActions = await this.aiClient.getCodeActions({
          language: document.languageId,
          code: document.content,
          range,
          diagnostics,
        });
        actions.push(...this.convertAICodeActions(aiActions));
      } catch (error) {
        log.warn('[Editor Integration] AI code actions failed:', error);
      }
    }

    return actions;
  }

  /**
   * Format document
   */
  async formatDocument(uri: string, options: Record<string, unknown>): Promise<LSPTextEditResult> {
    const document = this.openDocuments.get(uri);
    if (!document) {
      throw new Error(`Document not open: ${uri}`);
    }

    if (this.lspClient.isServerActive(document.languageId)) {
      return this.lspClient.formatting(document.languageId, uri, options);
    }

    return [];
  }

  /**
   * Rename symbol
   */
  async rename(uri: string, position: EditorPosition, newName: string): Promise<LSPWorkspaceEditResult> {
    const document = this.openDocuments.get(uri);
    if (!document) {
      throw new Error(`Document not open: ${uri}`);
    }

    if (this.lspClient.isServerActive(document.languageId)) {
      return this.lspClient.rename(document.languageId, uri, position, newName);
    }

    return null;
  }

  /**
   * Apply change to content
   */
  private applyChange(content: string, range: EditorRange, text: string): string {
    const lines = content.split('\n');
    const startLine = lines.slice(0, range.start.line).join('\n');
    const startChar = lines[range.start.line]?.substring(0, range.start.character) || '';
    const endChar = lines[range.end.line]?.substring(range.end.character) || '';
    const endLine = lines.slice(range.end.line + 1).join('\n');

    return [startLine, startChar + text + endChar, endLine].filter(Boolean).join('\n');
  }

  /**
   * Get symbol at position
   */
  private getSymbolAtPosition(content: string, position: EditorPosition): string {
    const lines = content.split('\n');
    const line = lines[position.line] || '';
    
    // Simple word extraction
    const before = line.substring(0, position.character);
    const after = line.substring(position.character);
    
    const wordBefore = before.match(/[\w]+$/)?.[0] || '';
    const wordAfter = after.match(/^[\w]+/)?.[0] || '';
    
    return wordBefore + wordAfter;
  }

  /**
   * Merge LSP and AI completions
   */
  private mergeCompletions(lspCompletions: LSPCompletionResult, aiCompletions: AICompletionResponse): EditorCompletionList {
    const items = this.toCompletionItems(lspCompletions);
    
    for (const aiCompletion of aiCompletions.completions) {
      items.push({
        label: aiCompletion.text,
        kind: 1, // Text
        detail: 'AI Suggestion',
        documentation: aiCompletion.documentation,
        sortText: `z${aiCompletion.confidence}`, // Sort AI suggestions lower
      });
    }

    return { items };
  }

  /**
   * Convert AI completions to LSP format
   */
  private convertAICompletions(aiCompletions: AICompletionResponse): EditorCompletionList {
    return {
      items: aiCompletions.completions.map((c) => ({
        label: c.text,
        kind: 1,
        detail: 'AI Suggestion',
        documentation: c.documentation,
      })),
    };
  }

  /**
   * Merge LSP and AI hover
   */
  private mergeHover(lspHover: NonNullable<LSPHoverResult>, aiHover: AIHoverResponse): EditorHover {
    return {
      contents: [
        lspHover.contents,
        '---',
        '**AI Insights:**',
        aiHover.content,
        ...(aiHover.examples || []).map((ex: string) => `\n**Example:**\n${ex}`),
      ],
      range: lspHover.range,
    };
  }

  /**
   * Convert AI code actions to LSP format
   */
  private convertAICodeActions(aiActions: AICodeActionResponse): EditorCodeAction[] {
    return aiActions.actions.map((action) => ({
      title: `AI: ${action.title}`,
      kind: action.kind,
      edit: action.edit,
      command: action.command,
    }));
  }

  private convertLSPCodeActions(actions: LSPCodeActionResult): EditorCodeAction[] {
    return actions.filter(this.isEditorCodeAction);
  }

  private toCompletionItems(completions: LSPCompletionResult): EditorCompletionItem[] {
    const rawItems = Array.isArray(completions) ? completions : completions.items || [];
    return rawItems.filter(this.isCompletionItem);
  }

  private toEditorHover(hover: LSPHoverResult): EditorHover | null {
    if (!hover || hover.contents === undefined) {
      return null;
    }

    return {
      contents: hover.contents,
      range: hover.range,
    };
  }

  private isCompletionItem(value: unknown): value is EditorCompletionItem {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value) && typeof (value as { label?: unknown }).label === 'string');
  }

  private isEditorCodeAction(value: unknown): value is EditorCodeAction {
    return Boolean(
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof (value as { title?: unknown }).title === 'string' &&
      typeof (value as { kind?: unknown }).kind === 'string'
    );
  }

  /**
   * Get open documents
   */
  getOpenDocuments(): EditorDocument[] {
    return Array.from(this.openDocuments.values());
  }

  /**
   * Get document
   */
  getDocument(uri: string): EditorDocument | undefined {
    return this.openDocuments.get(uri);
  }
}

// Singleton instance
let editorIntegrationInstance: EditorIntegration | null = null;

export function getEditorIntegration(): EditorIntegration {
  if (!editorIntegrationInstance) {
    editorIntegrationInstance = new EditorIntegration();
  }
  return editorIntegrationInstance;
}
