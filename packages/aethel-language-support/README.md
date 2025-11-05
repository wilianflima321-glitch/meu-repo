# Aethel Language Support

Este pacote fornece o gerenciamento de suporte a linguagens e depuração para o Aethel IDE.

## Funcionalidades

- **Language Extension Manager**: Gerencia Language Servers (LSP) para diferentes linguagens
- **Debug Adapter Manager**: Gerencia adaptadores de depuração (DAP) 
- **Integração com IA**: Recursos avançados como autocomplete híbrido e análise de erros com IA

## Linguagens Suportadas

### Fase 1 (Alta Prioridade)
- Python (Pyright + debugpy)
- TypeScript/JavaScript (tsserver + Node.js Inspector)
- C++ (clangd + vs-cpptools)

### Fase 2 (Média Prioridade)
- Go (gopls + delve)
- Rust (rust-analyzer + lldb-vscode)
- C# (OmniSharp + netcoredbg)

## Estrutura

```
src/
  browser/           # Código frontend
    components/      # Componentes de UI
    language-ext/    # Extensão de linguagem
    debug-ext/       # Extensão de depuração
  node/             # Código backend
    lsp/            # Gerenciamento LSP
    dap/            # Gerenciamento DAP
  common/           # Código compartilhado
```

## Desenvolvimento

1. Instale as dependências:
```bash
yarn install
```

2. Build o pacote:
```bash
yarn build
```

3. Testes:
```bash
yarn test
```

## Licença

- Eclipse Public License 2.0
- GNU General Public License v2 com GNU Classpath Exception