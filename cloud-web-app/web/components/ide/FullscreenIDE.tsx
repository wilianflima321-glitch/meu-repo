"use client";
import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import IDELayout from '@/components/ide/IDELayout';
import FileExplorerPro from '@/components/ide/FileExplorerPro';
import PreviewPanel from '@/components/ide/PreviewPanel';
import AIChatPanelContainer from '@/components/ide/AIChatPanelContainer';
import TabBar, { TabProvider } from '@/components/editor/TabBar';
import MonacoEditorPro from '@/components/editor/MonacoEditorPro';
import CommandPaletteProvider from '@/components/ide/CommandPalette';

// Mock de dados para o FileExplorer
const mockFiles = [
  {
    id: 'src',
    name: 'src',
    type: 'folder' as const,
    path: '/src',
    children: [
      {
        id: 'src/index.ts',
        name: 'index.ts',
        type: 'file' as const,
        path: '/src/index.ts',
      },
    ],
  },
  {
    id: 'package.json',
    name: 'package.json',
    type: 'file' as const,
    path: '/package.json',
  },
];

function IDEContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt');

  // Estado simplificado para o editor
  const [activeFile, setActiveFile] = useState<{ path: string; content: string } | null>(null);

  const handleFileSelect = useCallback((file: { path: string; type: 'file' | 'folder' }) => {
    if (file.type === 'file') {
      // Em um app real, você buscaria o conteúdo do arquivo aqui
      setActiveFile({ path: file.path, content: `// Conteúdo de ${file.path}` });
    }
  }, []);

  return (
    <TabProvider>
      <IDELayout
        fileExplorer={<FileExplorerPro files={mockFiles} onFileSelect={handleFileSelect} />}
        aiChatPanel={<AIChatPanelContainer initialPrompt={initialPrompt || ''} />}
      >
        <div className="h-full flex flex-col">
          <TabBar />
          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              <MonacoEditorPro
                path={activeFile.path}
                defaultValue={activeFile.content}
                language="typescript"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500">
                Selecione um arquivo para começar a editar.
              </div>
            )}
          </div>
        </div>
      </IDELayout>
    </TabProvider>
  );
}

export default function FullscreenIDE() {
  return (
    <Suspense fallback={<div>Carregando parâmetros...</div>}>
      <CommandPaletteProvider>
        <IDEContent />
      </CommandPaletteProvider>
    </Suspense>
  );
}
