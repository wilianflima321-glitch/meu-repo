# shared

Bibliotecas e ferramentas compartilhadas do monorepo.

## O que foi removido

O diretório `shared/tools/aethel_agi_tools/` foi removido porque continha forks vendorizados de bibliotecas externas de IA sem uso pelo runtime principal do produto web.

## Como usar daqui para frente

Se um serviço precisar dessas bibliotecas, declare-as como dependências próprias do serviço em vez de manter cópias completas do código-fonte aqui.
