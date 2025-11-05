import { ScanOSSResult, ScanOSSService } from '../common';
export declare class ScanOSSServiceImpl implements ScanOSSService {
    private readonly processor;
    scanContent(content: string, apiKey?: string): Promise<ScanOSSResult>;
    doScanContent(content: string, apiKey?: string): Promise<ScanOSSResult>;
}
//# sourceMappingURL=scanoss-service-impl.d.ts.map