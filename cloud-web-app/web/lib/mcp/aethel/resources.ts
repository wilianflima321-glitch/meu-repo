import { prisma } from '@/lib/db';
import type { MCPServer } from '../mcp-core';

export function registerAethelResources(server: MCPServer): void {
  server.registerResource({
      uri: 'aethel://project/structure',
      name: 'Project Structure',
      description: 'Estrutura completa do projeto atual',
      mimeType: 'application/json',
    },
    async () => {
      const files = await prisma.file.findMany({
        select: { path: true, language: true },
      });
      return JSON.stringify(files.map(f => f.path), null, 2);
    });

  server.registerResource({
      uri: 'aethel://config/settings',
      name: 'IDE Settings',
      description: 'Configurações atuais do IDE',
      mimeType: 'application/json',
    },
    async () => {
      return JSON.stringify({
        theme: 'dark',
        fontSize: 14,
        tabSize: 2,
        autoSave: true,
        formatOnSave: true,
      }, null, 2);
    });

}
