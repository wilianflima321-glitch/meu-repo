import { injectable } from 'inversify';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
// import { MonacoBinding } from 'y-monaco'; // Needs integration with Monaco Editor Service

@injectable()
export class CollaborationService implements FrontendApplicationContribution {
    
    private ydoc: Y.Doc;
    private provider: WebsocketProvider;

    constructor() {
        this.ydoc = new Y.Doc();
        // Connect to the server we just created
        this.provider = new WebsocketProvider(
            'ws://localhost:1234', 
            'aethel-global-room', 
            this.ydoc
        );
        
        this.provider.on('status', (event: any) => {
            console.log('Collab Status:', event.status); // logs "connected" or "disconnected"
        });
    }

    onStart(app: FrontendApplication): void {
        console.log('🚀 Aethel Collaboration Engine Started');
    }

    // TODO: Connect to active Editor widget
    public connectToEditor(editor: any, model: any) {
        // const yText = this.ydoc.getText('monaco');
        // new MonacoBinding(yText, model, new Set([editor]), this.provider.awareness);
    }
}
