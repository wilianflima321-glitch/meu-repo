const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron');

function getRepoRoot() {
  // __dirname = cloud-ide-desktop/desktop-app/src
  return path.resolve(__dirname, '..', '..', '..');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function canListen(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort(preferred) {
  if (await canListen(preferred)) return preferred;
  for (let port = preferred + 1; port <= preferred + 20; port++) {
    if (await canListen(port)) return port;
  }
  throw new Error('NO_FREE_PORT');
}

function httpGetStatus(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 2000 }, res => {
      // consume body to avoid socket hangups in some environments
      res.resume();
      res.on('end', () => resolve(res.statusCode || 0));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('TIMEOUT'));
    });
  });
}

async function waitForHealth(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastLog = 0;
  while (Date.now() < deadline) {
    try {
      const status = await httpGetStatus(`${baseUrl}/api/health`);
      if (status >= 200 && status < 400) return;
    } catch {
      // ignore
    }
    const now = Date.now();
    if (now - lastLog > 3000) {
      lastLog = now;
      // eslint-disable-next-line no-console
      console.log('[desktop] waiting for IDE health...');
    }
    await delay(250);
  }
  throw new Error('IDE_SERVER_NOT_READY');
}

let serverProcess;

function startIdeServer({ port }) {
  const ideCwd = path.resolve(getRepoRoot(), 'examples', 'browser-ide-app');
  const entry = path.join(ideCwd, 'server.js');

  // eslint-disable-next-line no-console
  console.log('[desktop] starting IDE server:', { ideCwd, entry, port });

  serverProcess = spawn(process.execPath, [entry], {
    cwd: ideCwd,
    env: {
      ...process.env,
      // In Electron, process.execPath points to electron.exe.
      // This flag makes Electron behave like Node for the child process.
      ELECTRON_RUN_AS_NODE: '1',
      HOST: '127.0.0.1',
      PORT: String(port)
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false
  });

  serverProcess.stdout.on('data', chunk => {
    const txt = chunk.toString('utf8');
    if (txt.trim()) console.log(`[ide-server] ${txt.trimEnd()}`);
  });
  serverProcess.stderr.on('data', chunk => {
    const txt = chunk.toString('utf8');
    if (txt.trim()) console.error(`[ide-server] ${txt.trimEnd()}`);
  });

  serverProcess.on('exit', code => {
    if (!app.isQuiting && code !== 0) {
      // eslint-disable-next-line no-console
      console.error('[desktop] IDE server exited:', code);
    }
  });

  serverProcess.on('error', err => {
    // eslint-disable-next-line no-console
    console.error('[desktop] IDE server spawn error:', err);
  });
}

function stopIdeServer() {
  if (!serverProcess) return;
  try {
    serverProcess.kill();
  } catch {
    // ignore
  }
  serverProcess = undefined;
}

function createMainWindow({ baseUrl }) {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadURL(baseUrl);

  return win;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuiting = true;
  stopIdeServer();
});

app.whenReady().then(async () => {
  try {
    const port = await findFreePort(Number(process.env.IDE_PORT || 3000));
    const baseUrl = `http://127.0.0.1:${port}`;

    startIdeServer({ port });
    await waitForHealth(baseUrl, 60_000);

    createMainWindow({ baseUrl });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[desktop] startup failed:', e);
    app.quit();
  }
});
