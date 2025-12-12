import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useIDEStore } from '@/store/ideStore';
import {
  Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, X,
  Maximize2, Minimize2, RotateCcw, AlertTriangle, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const LivePreview = () => {
  const { openFiles, activeFileId, editorContent } = useIDEStore();
  const iframeRef = useRef(null);
  const [viewport, setViewport] = useState('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeFile = openFiles.find(f => f.id === activeFileId);

  const viewports = {
    desktop: { width: '100%', height: '100%', label: 'Desktop' },
    tablet: { width: '768px', height: '100%', label: 'Tablet' },
    mobile: { width: '375px', height: '100%', label: 'Mobile' }
  };

  // Generate preview HTML
  const generatePreview = useCallback(() => {
    const isHtml = activeFile?.name?.endsWith('.html');
    const isJsx = activeFile?.name?.match(/\.(jsx|tsx)$/);
    const isCss = activeFile?.name?.endsWith('.css');
    const isJs = activeFile?.name?.match(/\.(js|ts)$/) && !isJsx;

    let html = '';

    if (isHtml) {
      html = editorContent || '';
    } else if (isJsx) {
      // Simple React preview
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${editorContent || 'const App = () => <div>Hello World</div>;'}
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;
    } else if (isCss) {
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${editorContent || ''}</style>
</head>
<body>
  <div class="preview-container">
    <h1>CSS Preview</h1>
    <p>This is a paragraph with your styles applied.</p>
    <button>Button</button>
    <div class="box">Box Element</div>
  </div>
</body>
</html>`;
    } else if (isJs) {
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
    .output { margin: 5px 0; padding: 5px; background: #2d2d2d; border-radius: 4px; }
  </style>
</head>
<body>
  <div id="output"></div>
  <script>
    const outputEl = document.getElementById('output');
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      const div = document.createElement('div');
      div.className = 'output';
      div.textContent = args.map(a => JSON.stringify(a)).join(' ');
      outputEl.appendChild(div);
    };
    
    try {
      ${editorContent || ''}
    } catch (e) {
      console.log('Error:', e.message);
    }
  </script>
</body>
</html>`;
    } else {
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      margin: 0;
      background: #09090b;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div style="text-align: center;">
    <p>Open an HTML, JSX, or JS file to see preview</p>
  </div>
</body>
</html>`;
    }

    return html;
  }, [activeFile, editorContent]);

  // Update preview on content change
  useEffect(() => {
    if (iframeRef.current) {
      const html = generatePreview();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
      
      return () => URL.revokeObjectURL(url);
    }
  }, [generatePreview, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    setConsoleOutput([]);
  };

  const canPreview = activeFile?.name?.match(/\.(html|jsx|tsx|js|ts|css)$/);

  return (
    <div className={cn(
      "flex flex-col h-full bg-zinc-900",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Live Preview</span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Viewport Selector */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            {[
              { id: 'desktop', icon: Monitor },
              { id: 'tablet', icon: Tablet },
              { id: 'mobile', icon: Smartphone }
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setViewport(v.id)}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewport === v.id ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
                )}
                title={viewports[v.id].label}
              >
                <v.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowConsole(!showConsole)} title="Toggle Console">
            <AlertTriangle className="w-3.5 h-3.5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(!isFullscreen)} title="Toggle Fullscreen">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Preview Frame */}
      <div className="flex-1 bg-zinc-950 p-4 overflow-auto">
        <div
          className="mx-auto h-full bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
          style={{
            width: viewports[viewport].width,
            maxWidth: '100%'
          }}
        >
          {canPreview ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-modals"
              title="Live Preview"
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-zinc-900 text-zinc-500">
              <div className="text-center">
                <Monitor className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                <p>Select an HTML, JSX, or JS file to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Console */}
      {showConsole && (
        <div className="h-32 border-t border-zinc-800 bg-zinc-950 overflow-auto">
          <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-b border-zinc-800">
            <span className="text-xs text-zinc-500">Console</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setConsoleOutput([])}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
          <div className="p-2 font-mono text-xs">
            {consoleOutput.length === 0 ? (
              <span className="text-zinc-600">Console output will appear here</span>
            ) : (
              consoleOutput.map((log, i) => (
                <div key={i} className={cn(
                  "py-0.5",
                  log.type === 'error' && "text-red-400",
                  log.type === 'warn' && "text-yellow-400",
                  log.type === 'log' && "text-zinc-300"
                )}>
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LivePreview;
