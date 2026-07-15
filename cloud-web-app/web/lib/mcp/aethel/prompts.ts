import type { MCPServer } from '../mcp-core';

export function registerAethelPrompts(server: MCPServer): void {
  server.registerPrompt({
      name: 'code_review',
      description: 'Analisa código e sugere melhorias',
      arguments: [
        { name: 'file', description: 'Arquivo para revisar', required: true },
      ],
    },
    async (args) => {
      const file = args.file as string;
      return `Analise o arquivo ${file} e forneça:
  1. Bugs potenciais
  2. Melhorias de performance
  3. Melhores práticas não seguidas
  4. Sugestões de refatoração
  5. Problemas de segurança`;
    });

  server.registerPrompt({
      name: 'explain_code',
      description: 'Explica o que um trecho de código faz',
      arguments: [
        { name: 'code', description: 'Código para explicar', required: true },
      ],
    },
    async (args) => {
      return `Explique detalhadamente o que este código faz:
  
  \`\`\`
  ${args.code}
  \`\`\`
  
  Inclua:
  1. Propósito geral
  2. Explicação linha por linha
  3. Dependências e efeitos colaterais
  4. Exemplos de uso`;
    });

  server.registerPrompt({
      name: 'generate_tests',
      description: 'Gera testes unitários para código',
      arguments: [
        { name: 'file', description: 'Arquivo para testar', required: true },
      ],
    },
    async (args) => {
      return `Gere testes unitários completos para o arquivo ${args.file}:
  
  1. Use Jest como framework
  2. Cubra todos os casos de borda
  3. Inclua mocks quando necessário
  4. Teste tanto casos de sucesso quanto de erro
  5. Adicione descrições claras para cada teste`;
    });

}
