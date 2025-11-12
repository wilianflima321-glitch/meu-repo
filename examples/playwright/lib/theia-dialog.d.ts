import { ElementHandle } from '@playwright/test';
import { TheiaPageObject } from './theia-page-object';
export declare class TheiaDialog extends TheiaPageObject {
    protected overlaySelector: string;
    protected blockSelector: string;
    protected titleBarSelector: string;
    protected titleSelector: string;
    protected contentSelector: string;
    protected controlSelector: string;
    protected errorSelector: string;
    waitForVisible(): Promise<void>;
    waitForClosed(): Promise<void>;
    isVisible(): Promise<boolean>;
    title(): Promise<string | null>;
    waitUntilTitleIsDisplayed(title: string): Promise<void>;
    protected contentElement(): Promise<ElementHandle<SVGElement | HTMLElement>>;
    protected buttonElement(label: string): Promise<ElementHandle<SVGElement | HTMLElement>>;
    protected buttonElementByClass(buttonClass: string): Promise<ElementHandle<SVGElement | HTMLElement>>;
    protected validationElement(): Promise<ElementHandle<SVGElement | HTMLElement>>;
    getValidationText(): Promise<string | null>;
    validationResult(): Promise<boolean>;
    close(): Promise<void>;
    clickButton(buttonLabel: string): Promise<void>;
    isButtonDisabled(buttonLabel: string): Promise<boolean>;
    clickMainButton(): Promise<void>;
    clickSecondaryButton(): Promise<void>;
    waitUntilMainButtonIsEnabled(): Promise<void>;
}
//# sourceMappingURL=theia-dialog.d.ts.map