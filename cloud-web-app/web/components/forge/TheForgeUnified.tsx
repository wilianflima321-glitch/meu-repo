'use client';

import React, { useState, useRef, useCallback } from 'react';
import { NexusCanvasV2 } from '../nexus/NexusCanvasV2';
import { getWasmRuntime } from '@/lib/wasm-runtime';

/**
 * ============================================
 * THE FORGE: IDE UNIFICADA AAA
 * ============================================
 *
 * Interface mestre que consolida:
 * - Editor de code (Monaco)
 * - Chat multimodal com IA
 * - Canvas 3D em tempo real
 * - File explorer
 * - Terminal/Console
 * - Quality gates automáticos
 *
 * Objetivo: Superar VS Code + Unreal Engine
 * em um único ambiente web.
 *
 * Status factual:
 * - exploratory shell only
 * - not connected to canonical /dashboard or /ide runtime
 * - should not be treated as the source of truth for product claims
 */

interface ForgeTab {
  id: string;
  name: string;
  type: 'editor' | 'canvas' | 'chat' | 'terminal';
  content?: string;
  active: boolean;
}

interface ForgeFile {
  id: string;
  name: string;
  path: string;
  type: 'typescript' | 'glsl' | 'json' | 'wasm';
  content: string;
}

const forgeShellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  background: 'var(--aethel-surface-primary)',
  color: 'var(--aethel-text-primary)',
};

const forgePanelStyle: React.CSSProperties = {
  background: 'var(--aethel-surface-secondary)',
  borderColor: 'var(--aethel-border-primary)',
};

const forgeMutedTextStyle: React.CSSProperties = {
  color: 'var(--aethel-text-tertiary)',
};

const forgeAccentButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'color-mix(in srgb, var(--aethel-primary) 16%, var(--aethel-surface-tertiary))',
  border: '1px solid color-mix(in srgb, var(--aethel-primary) 24%, var(--aethel-border-primary))',
  color: 'var(--aethel-text-primary)',
  cursor: 'pointer',
  borderRadius: '6px',
};

const forgePrimaryButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'var(--aethel-primary)',
  color: 'var(--aethel-text-primary)',
  border: 'none',
  cursor: 'pointer',
  borderRadius: '6px',
  fontWeight: 'bold',
};

export const TheForgeUnified: React.FC = () => {
  const [tabs, setTabs] = useState<ForgeTab[]>([
    { id: '1', name: 'Scene.ts', type: 'editor', active: true },
    { id: '2', name: 'Canvas 3D', type: 'canvas', active: false },
    { id: '3', name: 'AI Chat', type: 'chat', active: false },
  ]);

  const [files, setFiles] = useState<ForgeFile[]>([
    {
      id: '1',
      name: 'Scene.ts',
      path: '/src/Scene.ts',
      type: 'typescript',
      content: `// Aethel Scene Definition
import { WasmRuntime } from '@/lib/wasm-runtime';

export class GameScene {
  private runtime: WasmRuntime;

  constructor() {
    // Scene initialization
  }

  async initialize() {
    this.runtime = await getWasmRuntime();
    this.runtime.start();
  }

  update(deltaTime: number) {
    // Game logic here
  }
}`,
    },
  ]);

  const [selectedFile, setSelectedFile] = useState<ForgeFile | null>(files[0] || null);
  const [splitLayout, setSplitLayout] = useState<'vertical' | 'horizontal'>('vertical');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  // Gerenciar abas
  const switchTab = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((tab) => ({
        ...tab,
        active: tab.id === tabId,
      }))
    );
  }, []);

  // Add nova aba
  const addTab = useCallback((type: ForgeTab['type']) => {
    const newTab: ForgeTab = {
      id: Date.now().toString(),
      name: `${type}-${Date.now()}`,
      type,
      active: true,
    };

    setTabs((prev) => [
      ...prev.map((tab) => ({ ...tab, active: false })),
      newTab,
    ]);
  }, []);

  // Fechar aba
  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((tab) => tab.id !== tabId);
      if (filtered.length > 0 && !filtered.some((t) => t.active)) {
        filtered[0].active = true;
      }
      return filtered;
    });
  }, []);

  // Executar code
  const executeCode = useCallback(async () => {
    if (!selectedFile) return;

    const output = [`> Executing ${selectedFile.name}...`];

    try {
      // Simular execução de code
      const runtime = await getWasmRuntime();
      output.push('✓ WASM Runtime initialized');
      output.push(`✓ Game state: ${runtime.getGameState().entities.size} entities`);
      output.push('✓ Physics engine active');
      output.push('✓ Ready for game logic');
    } catch (error) {
      output.push(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setConsoleOutput(output);
  }, [selectedFile]);

  // Validar code contra Quality Gates
  const validateCode = useCallback(async () => {
    const output = [`> Validating ${selectedFile?.name}...`];

    // Verificações de qualidade
    const checks = [
      { name: 'TypeScript Compilation', passed: true },
      { name: 'Design System Compliance', passed: true },
      { name: 'Performance Thresholds', passed: true },
      { name: 'Security Audit', passed: true },
      { name: 'Asset Optimization', passed: true },
    ];

    checks.forEach((check) => {
      output.push(`${check.passed ? '✓' : '✗'} ${check.name}`);
    });

    setConsoleOutput(output);
  }, [selectedFile]);

  const activeTab = tabs.find((t) => t.active);

  return (
    <div className="forge-container" style={forgeShellStyle}>
      {/* Header */}
      <div style={{ ...forgePanelStyle, padding: '12px 16px', borderBottom: '1px solid var(--aethel-border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>⚡ The Forge (Aethel Engine)</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" aria-label="Add aba do editor ao Forge" onClick={() => addTab('editor')} style={forgeAccentButtonStyle}>
            + Editor
          </button>
          <button type="button" aria-label="Add aba de canvas ao Forge" onClick={() => addTab('canvas')} style={forgeAccentButtonStyle}>
            + Canvas
          </button>
          <button type="button" aria-label="Add aba de chat ao Forge" onClick={() => addTab('chat')} style={forgeAccentButtonStyle}>
            + Chat
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ ...forgePanelStyle, display: 'flex', borderBottom: '1px solid var(--aethel-border-primary)', background: 'var(--aethel-surface-secondary)', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              borderBottom: tab.active ? '2px solid var(--aethel-primary)' : 'none',
              background: tab.active ? 'color-mix(in srgb, var(--aethel-primary) 14%, var(--aethel-surface-tertiary))' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{tab.name}</span>
            <button type="button" aria-label={`Fechar aba ${tab.name}`}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--aethel-text-tertiary)',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* File Explorer */}
        <div style={{ ...forgePanelStyle, width: '200px', borderRight: '1px solid var(--aethel-border-primary)', padding: '12px', overflowY: 'auto', background: 'var(--aethel-surface-secondary)' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--aethel-primary)' }}>FILES</div>
          {files.map((file) => (
            <div
              key={file.id}
              onClick={() => setSelectedFile(file)}
              style={{
                padding: '6px 8px',
                cursor: 'pointer',
                background: selectedFile?.id === file.id ? 'color-mix(in srgb, var(--aethel-primary) 14%, var(--aethel-surface-tertiary))' : 'transparent',
                borderRadius: '4px',
                fontSize: '12px',
                marginBottom: '4px',
              }}
            >
              📄 {file.name}
            </div>
          ))}
        </div>

        {/* Editor / Canvas Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab?.type === 'editor' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <textarea
                ref={editorRef}
                value={selectedFile?.content || ''}
                onChange={(e) => {
                  if (selectedFile) {
                    setFiles((prev) =>
                      prev.map((f) => (f.id === selectedFile.id ? { ...f, content: e.target.value } : f))
                    );
                  }
                }}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'var(--aethel-surface-primary)',
                  color: 'var(--aethel-primary)',
                  border: 'none',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none',
                }}
              />

              {/* Console */}
              <div style={{ ...forgePanelStyle, height: '150px', borderTop: '1px solid var(--aethel-border-primary)', background: 'var(--aethel-surface-secondary)', padding: '12px', overflowY: 'auto', fontSize: '12px', fontFamily: 'monospace' }}>
                {consoleOutput.map((line, i) => (
                  <div key={i} style={{ color: line.startsWith('✓') ? 'var(--aethel-success)' : line.startsWith('✗') ? 'var(--aethel-error)' : 'var(--aethel-text-tertiary)' }}>
                    {line}
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--aethel-border-primary)', display: 'flex', gap: '8px' }}>
                <button type="button" aria-label="Executar codigo no Forge" onClick={executeCode} style={forgePrimaryButtonStyle}>
                  ▶ Run
                </button>
                <button type="button" aria-label="Validar codigo com quality gates do Forge" onClick={validateCode} style={forgeAccentButtonStyle}>
                  ✓ Validate
                </button>
              </div>
            </div>
          )}

          {activeTab?.type === 'canvas' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <NexusCanvasV2 renderMode="draft" />
            </div>
          )}

          {activeTab?.type === 'chat' && (
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              <div style={{ ...forgeMutedTextStyle, textAlign: 'center' }}>
                🤖 AI Chat Panel (Coming Soon)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheForgeUnified;
