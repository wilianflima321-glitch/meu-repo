import { TheiaView } from './theia-view';
export declare abstract class TheiaEditor extends TheiaView {
    isDirty(): Promise<boolean>;
    save(): Promise<void>;
    closeWithoutSave(): Promise<void>;
    saveAndClose(): Promise<void>;
    undo(times?: number): Promise<void>;
    redo(times?: number): Promise<void>;
}
//# sourceMappingURL=theia-editor.d.ts.map