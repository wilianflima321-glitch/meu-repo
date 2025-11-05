import { ScannerComponent } from 'scanoss';
export declare const SCANOSS_SERVICE_PATH = "/services/scanoss/service";
export declare const ScanOSSService: unique symbol;
export interface ScanOSSResultClean {
    type: 'clean';
}
export interface ScanOSSResultMatch {
    type: 'match';
    matched: string;
    url: string;
    raw: ScannerComponent;
    file?: string;
}
export interface ScanOSSResultError {
    type: 'error';
    message: string;
}
export type ScanOSSResult = ScanOSSResultClean | ScanOSSResultMatch | ScanOSSResultError;
export interface ScanOSSService {
    scanContent(content: string, apiKey?: string): Promise<ScanOSSResult>;
}
//# sourceMappingURL=scanoss-service.d.ts.map