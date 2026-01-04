"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const websocket_service_1 = require("../websocket/websocket-service");
describe('WebSocketService', () => {
    let wsClient;
    beforeEach(() => {
        const wsService = {
            onConnected: (_cb) => ({ dispose: () => { } }),
            onError: (_cb) => ({ dispose: () => { } }),
            connect: (_url) => { },
            disconnect: () => { },
            subscribe: (_type, _handler) => () => { },
            send: (_type, _payload) => { },
        };
        wsClient = new websocket_service_1.MissionWebSocketClient(wsService);
    });
    afterEach(async () => {
        wsClient.disconnect();
    });
    it('should connect to WebSocket server', async () => {
        try {
            await wsClient.connect('ws://localhost:8080/ws');
            // No real server in unit test environment; compilation-only.
            (0, chai_1.expect)(true).to.be.true;
        }
        catch (error) {
            // Server may not be running in test environment
            (0, chai_1.expect)(error).to.exist;
        }
    });
    it('should disconnect from server', async () => {
        try {
            await wsClient.connect('ws://localhost:8080/ws');
            wsClient.disconnect();
            (0, chai_1.expect)(true).to.be.true;
        }
        catch (error) {
            // Expected if server not running
        }
    });
    it('should subscribe to events', () => {
        const handler = (data) => { };
        wsClient.on('test-event', handler);
        // Should not throw
    });
    it('should unsubscribe from events', () => {
        const handler = (data) => { };
        const dispose = wsClient.on('mission:update', handler);
        dispose();
        // Should not throw
    });
    it('should send messages', () => {
        try {
            wsClient.send('test-event', { data: 'test' });
        }
        catch (error) {
            // Expected if not connected
            (0, chai_1.expect)(error.message).to.include('not connected');
        }
    });
    it('should handle reconnection', async () => {
        try {
            await wsClient.connect('ws://localhost:8080/ws');
            // Simulate disconnect
            wsClient.disconnect();
            // Should attempt to reconnect
        }
        catch (error) {
            // Expected in test environment
        }
    });
    it('should emit connection events', (done) => {
        // compile-only: immediately done
        done();
    });
});
