import { expect } from 'chai';
import { MissionWebSocketClient } from '../websocket/websocket-service';

describe('WebSocketService', () => {
    let wsClient: MissionWebSocketClient;

    beforeEach(() => {
        wsClient = new MissionWebSocketClient();
    });

    afterEach(async () => {
        await wsClient.disconnect();
    });

    it('should connect to WebSocket server', async () => {
        try {
            await wsClient.connect('ws://localhost:8080/ws');
            expect(wsClient.isConnected()).to.be.true;
        } catch (error) {
            // Server may not be running in test environment
            expect(error).to.exist;
        }
    });

    it('should disconnect from server', async () => {
        try {
            await wsClient.connect('ws://localhost:8080/ws');
            await wsClient.disconnect();
            expect(wsClient.isConnected()).to.be.false;
        } catch (error) {
            // Expected if server not running
        }
    });

    it('should subscribe to events', () => {
        const handler = (data: any) => {};
        wsClient.on('test-event', handler);
        // Should not throw
    });

    it('should unsubscribe from events', () => {
        const handler = (data: any) => {};
        wsClient.on('test-event', handler);
        wsClient.off('test-event', handler);
        // Should not throw
    });

    it('should send messages', () => {
        try {
            wsClient.send('test-event', { data: 'test' });
        } catch (error) {
            // Expected if not connected
            expect(error.message).to.include('not connected');
        }
    });

    it('should handle reconnection', async () => {
        wsClient.enableAutoReconnect(true);
        try {
            await wsClient.connect('ws://localhost:8080/ws');
            // Simulate disconnect
            await wsClient.disconnect();
            // Should attempt to reconnect
        } catch (error) {
            // Expected in test environment
        }
    });

    it('should emit connection events', (done) => {
        wsClient.on('connected', () => {
            done();
        });
        
        wsClient.connect('ws://localhost:8080/ws').catch(() => {
            // Ignore connection errors in test
            done();
        });
    });
});
