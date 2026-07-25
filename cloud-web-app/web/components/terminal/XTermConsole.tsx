'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface XTermConsoleProps {
  initialOutput?: string;
}

/**
 * xterm.js paints its `theme` colours to a canvas context, which cannot
 * resolve CSS custom properties — so the design-token value must be read
 * from the computed style at mount time rather than passed as `var(...)`.
 */
function readDesignToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function XTermConsole({ initialOutput = 'Aethel Engine Shell v1.0.0\r\n> ' }: XTermConsoleProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: 'transparent',
        foreground: readDesignToken('--aethel-text-secondary', '#c6cfdd'), // hex-allowed (SSR/pre-mount fallback mirrors the token's own value)
        cursor: readDesignToken('--aethel-primary', '#3b82f6'), // hex-allowed (SSR/pre-mount fallback mirrors the token's own value)
        selectionBackground: 'rgba(59, 130, 246, 0.3)',
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      scrollback: 5000,
      disableStdin: true, // Read-only view for output initially
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    term.write(initialOutput);

    xtermRef.current = term;

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [initialOutput]);

  return (
    <div
      ref={terminalRef}
      style={{
        width: '100%',
        height: '100%',
        padding: '8px',
        overflow: 'hidden',
        background: 'rgba(0,0,0,0.3)',
      }}
    />
  );
}
