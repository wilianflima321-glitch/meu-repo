import { ContributionProvider, Emitter, type Event } from '@theia/core';
import { type FrontendApplicationContribution } from '@theia/core/lib/browser';
import type { ChangeSetDecoration, ChangeSetElement } from '../common';
/**
 * A decorator for a change set element.
 * It allows to add additional information to the element, such as icons.
 */
export declare const ChangeSetDecorator: unique symbol;
export interface ChangeSetDecorator {
    readonly id: string;
    readonly onDidChangeDecorations: Event<void>;
    decorate(element: ChangeSetElement): ChangeSetDecoration | undefined;
}
export declare class ChangeSetDecoratorService implements FrontendApplicationContribution {
    protected readonly onDidChangeDecorationsEmitter: Emitter<void>;
    readonly onDidChangeDecorations: Event<void>;
    protected readonly contributions: ContributionProvider<ChangeSetDecorator>;
    initialize(): void;
    protected readonly fireDidChangeDecorations: import("lodash").DebouncedFunc<() => void>;
    getDecorations(element: ChangeSetElement): ChangeSetDecoration[];
    getAdditionalInfoSuffixIcon(element: ChangeSetElement): string[] | undefined;
}
//# sourceMappingURL=change-set-decorator-service.d.ts.map