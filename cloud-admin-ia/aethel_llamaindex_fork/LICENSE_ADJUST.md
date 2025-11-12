# Relatório de Licenciamento - Fork Aethel LlamaIndex

## Software Original
- **Nome**: LlamaIndex (anteriormente GPT Index)
- **Licença Original**: MIT License
- **Repositório Original**: https://github.com/run-llama/llama_index
- **Versão Forkada**: Core v0.10.x (aproximadamente)

## Modificações Realizadas
### Arquivos Modificados
1. **llama_index/core/node_parser/file/html.py**
   - **Alteração**: Refatoração do método `get_nodes_from_node()` para criar um nó por tag HTML em vez de agrupar tags consecutivas
   - **Razão**: Correção de bug onde tags consecutivas eram agrupadas incorretamente
   - **Linhas Afetadas**: 71-91
   - **Compatibilidade**: Mantém API pública, apenas altera comportamento interno

### Arquivos Adicionados
- Nenhum arquivo novo adicionado ao core

## Análise de Licenciamento
### Licença MIT - Compatibilidade
- **Permitido**: Uso, modificação, distribuição
- **Obrigatório**: Manter aviso de copyright e licença
- **Compatibilidade Aethel**: OK (Aethel usa Apache 2.0, MIT é compatível)

### Direitos Autorais
- **Copyright Original**: 2023 Jerry Liu (LlamaCloud)
- **Copyright Aethel**: 2024 Aethel IDE Team
- **Atribuição**: Mantida em headers de arquivos modificados

## Conformidade Legal
- ✅ Licença MIT permite modificações e distribuição
- ✅ Avisos de copyright preservados
- ✅ Modificações documentadas neste relatório
- ✅ Código proprietário Aethel não mesclado com open-source

## Distribuição
- Este fork é usado internamente pela Aethel IDE
- Não redistribuído como produto separado
- Modificações proprietárias isoladas

## Revisão
**Data**: $(Get-Date -Format "yyyy-MM-dd")
**Revisor**: Agent-Arquitetor Aethel
**Status**: Aprovado para uso interno