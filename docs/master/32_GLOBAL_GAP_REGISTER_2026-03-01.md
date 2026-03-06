# 32_GLOBAL_GAP_REGISTER_2026-03-01
Status: ACTIVE GAP REGISTER
Date: 2026-03-01
Owner: Platform + PM Tecnico

## 1) Objetivo
Publicar uma varredura factual unica de lacunas tecnicas/ux ainda abertas no estado atual do repositorio.

## 2) Snapshot factual
1. Markdown total no repo: `3656`
2. Markdown canonico (`docs/master`): `50`
3. Markdown fora do canonico: `3606`
4. Arquivos grandes (`>=1200` linhas) em `cloud-web-app/web`: `0`
5. Uso de dialogs bloqueantes (ativo): `0`
6. Uso de dialogs bloqueantes (deprecated): `0`
7. APIs com gate `NOT_IMPLEMENTED` explicito: `0`
8. Docs canonicos sem referencia no read-order do `00_INDEX`: `0`
9. Top origens de markdown nao-canonico:
   - `cloud-admin-ia/aethel_llamaindex_fork`: 1954
   - `shared/tools`: 1293
   - `docs/archive`: 256
   - `cloud-web-app/web`: 16
   - `docs/gaps`: 7
   - `src/common`: 3
   - `cloud-web-app/docs`: 2
   - `meu-repo/.github`: 2
   - `tools/ci`: 2
   - `tools/llm-mock`: 2

## 3) Lacunas abertas (prioridade)
### P0
1. Manter `0` hotspots (`>=1200` linhas) no escopo ativo.
2. Manter `0` dialogs bloqueantes ativos (`window.confirm/alert/prompt`) e bloquear regressao.
3. Manter gates `NOT_IMPLEMENTED` explicitos apenas onde a capacidade realmente nao existe.
4. Manter `00_INDEX` com read-order canonico completo (sem drift).

### P1
1. Consolidar markdown nao-canonico e reduzir volume consultivo fora de `docs/master`.
2. Fechar evidencias de colaboracao (carga/conflito) para promocao de `PARTIAL` -> `IMPLEMENTED`.
3. Fechar varredura runtime de acessibilidade (axe/lighthouse) para claim de cobertura completa.

## 4) Top hotspots >=1200 linhas
1. Nenhum hotspot acima de 1200 linhas no escopo ativo.

## 5) Dialogs bloqueantes ativos (amostra)
1. Nenhum encontrado no escopo ativo.

## 6) APIs com NOT_IMPLEMENTED explicito
1. Nenhuma rota com NOT_IMPLEMENTED explicito no escopo ativo.

## 7) Docs canonicos ausentes no read-order do 00_INDEX
1. Nenhum doc canonico fora do read-order.

## 8) Regras de governanca
1. Nao remover gate explicito para mascarar lacuna funcional.
2. Nao promover claim de mercado enquanto P0 acima estiver aberto.
3. Atualizar este registro em toda wave de freeze.
4. Evidencia `core_loop_drill` (e demais fontes de ensaio) conta apenas como `rehearsal`, nunca para promocao L4.
