# 32_GLOBAL_GAP_REGISTER_2026-03-01
Status: ACTIVE GAP REGISTER
Date: 2026-03-01
Owner: Platform + PM Tecnico

## 1) Objetivo
Publicar uma varredura factual unica de lacunas tecnicas/ux ainda abertas no estado atual do repositorio.

## 2) Snapshot factual
1. Markdown total no repo: `3671`
2. Markdown canonico (`docs/master`): `57`
3. Markdown fora do canonico: `3614`
4. Arquivos grandes (`>=1200` linhas) em `cloud-web-app/web`: `3`
5. Uso de dialogs bloqueantes (ativo): `0`
6. Uso de dialogs bloqueantes (deprecated): `0`
7. APIs com gate `NOT_IMPLEMENTED` explicito: `0`
8. Docs canonicos sem referencia no read-order do `00_INDEX`: `0`
9. Top origens de markdown nao-canonico:
   - `docs/archive`: 3504
   - `cloud-web-app/web`: 25
   - `docs/gaps`: 7
   - `src/common`: 3
   - `cloud-web-app/docs`: 2
   - `tools/ci`: 2
   - `tools/llm-mock`: 2
   - `.github/BRANCH_PROTECTION_POLICY.md`: 1
   - `.github/PR_BODY.md`: 1
   - `.github/PULL_REQUEST_TEMPLATE`: 1

## 3) Lacunas abertas (prioridade)
### P0
1. Continuar decomposicao dos hotspots acima de 1200 linhas fora do shell principal.
2. Manter `0` dialogs bloqueantes ativos (`window.confirm/alert/prompt`) e bloquear regressao.
3. Manter gates `NOT_IMPLEMENTED` explicitos apenas onde a capacidade realmente nao existe.
4. Manter `00_INDEX` com read-order canonico completo (sem drift).

### P1
1. Consolidar markdown nao-canonico e reduzir volume consultivo fora de `docs/master`.
2. Fechar evidencias de colaboracao (carga/conflito) para promocao de `PARTIAL` -> `IMPLEMENTED`.
3. Fechar varredura runtime de acessibilidade (axe/lighthouse) para claim de cobertura completa.

## 4) Top hotspots >=1200 linhas
1. `cloud-web-app/web/styles/globals.css` (`1296` linhas)
2. `cloud-web-app/web/components/audio/SoundCueEditor.tsx` (`1244` linhas)
3. `cloud-web-app/web/components/engine/LevelEditor.tsx` (`1211` linhas)

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
