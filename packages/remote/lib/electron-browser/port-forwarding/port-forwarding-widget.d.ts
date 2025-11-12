/// <reference types="react" />
import { ReactNode } from '@theia/core/shared/react';
import { OpenerService, ReactWidget } from '@theia/core/lib/browser';
import { ForwardedPort, PortForwardingService } from './port-forwarding-service';
import { ClipboardService } from '@theia/core/lib/browser/clipboard-service';
export declare const PORT_FORWARDING_WIDGET_ID = "port-forwarding-widget";
export declare class PortForwardingWidget extends ReactWidget {
    protected readonly portForwardingService: PortForwardingService;
    protected readonly openerService: OpenerService;
    protected readonly clipboardService: ClipboardService;
    protected init(): void;
    protected render(): ReactNode;
    protected renderForwardPortButton(): ReactNode;
    protected renderAddressColumn(port: ForwardedPort): ReactNode;
    protected renderPortColumn(port: ForwardedPort): ReactNode;
}
//# sourceMappingURL=port-forwarding-widget.d.ts.map