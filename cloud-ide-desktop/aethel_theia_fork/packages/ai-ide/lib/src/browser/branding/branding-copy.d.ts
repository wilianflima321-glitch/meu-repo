export type BrandingQuickActionId = 'providers' | 'agents' | 'tools' | 'usage' | 'chat' | 'history';
export interface BrandingQuickActionStrings {
    label: string;
    description: string;
}
export interface BrandingCopy {
    name: string;
    tagline: string;
    logoTitle: string;
    logoAriaLabel: string;
    quickActions: Record<BrandingQuickActionId, BrandingQuickActionStrings>;
}
export declare const getBrandingCopy: () => BrandingCopy;
