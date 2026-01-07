import { WebSocketServer } from 'ws';
import * as http from 'http';
import express from 'express';
import { setupWSConnection } from 'y-websocket/bin/utils';
import { LeveldbPersistence } from 'y-leveldb';

// Setup persistence (optional, for offline support/history)
// const persistence = new LeveldbPersistence('./storage-location')

const port = process.env.PORT || 1234;
const app = express();
const server = http.createServer(app);

// Initialize WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('Client connected to collab session');
  
  // Setup Yjs WebSocket connection
  // This handles the sync logic automatically
  setupWSConnection(ws, req, { docName: req.url?.slice(1) || 'default' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'aethel-collab-server' });
});

server.listen(port, () => {
  console.log(`🚀 Aethel Collab Server running at http://localhost:${port}`);
});
