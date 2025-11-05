export interface CollaborationColor {
    r: number;
    g: number;
    b: number;
}
export declare namespace CollaborationColor {
    function fromString(code: string): CollaborationColor;
    const Gold: CollaborationColor;
    const Tomato: CollaborationColor;
    const Aquamarine: CollaborationColor;
    const Beige: CollaborationColor;
    const Coral: CollaborationColor;
    const DarkOrange: CollaborationColor;
    const VioletRed: CollaborationColor;
    const DodgerBlue: CollaborationColor;
    const Chocolate: CollaborationColor;
    const LightGreen: CollaborationColor;
    const MediumOrchid: CollaborationColor;
    const Orange: CollaborationColor;
}
export declare class CollaborationColorService {
    light: string;
    dark: string;
    getColors(): CollaborationColor[];
    requiresDarkFont(color: CollaborationColor): boolean;
}
//# sourceMappingURL=collaboration-color-service.d.ts.map