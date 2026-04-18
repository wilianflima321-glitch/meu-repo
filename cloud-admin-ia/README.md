# cloud-admin-ia

Este diretório agora guarda apenas o ponto de entrada para workloads de admin/IA do Aethel.

## O que foi removido

O diretório `aethel_llamaindex_fork/` foi removido do monorepo porque era uma cópia vendorizada enorme do LlamaIndex, sem referências de runtime no produto web.

## Como usar daqui para frente

Se algum serviço Python realmente precisar de LlamaIndex, instale a dependência no serviço apropriado em vez de versionar o upstream inteiro dentro deste repositório.
