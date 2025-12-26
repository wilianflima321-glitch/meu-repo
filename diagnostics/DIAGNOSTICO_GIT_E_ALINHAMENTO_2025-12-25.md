# Diagnóstico Git e Alinhamento (2025-12-25)

## 1) Por que o VS Code mostra “~205 itens” no Controle de Código
No VS Code, o painel **Source Control** normalmente mostra **arquivos alterados** (modificados/staged/untracked), e **não** o total do repositório.

No repositório `meu-repo` eu medi:
- Arquivos rastreados (tracked): ~23k (`git ls-files`)
- Itens em mudança no momento: ~150+ (`git status --porcelain`)
- Arquivos não rastreados: ~150+ (`git ls-files -o --exclude-standard`)

Ou seja: o número “~205” é compatível com **mudanças pendentes**, não com “repo desconectado”.

## 2) Existe mais de um Git na sua máquina (causa comum de confusão)
Você tem um Git “pai” em `C:/Users/omega/Desktop/aethel engine` que está **praticamente vazio** (0 arquivos rastreados) e só contém entradas não rastreadas como `.zencoder/` e `meu-repo/`.

O repositório real com o código é `C:/Users/omega/Desktop/aethel engine/meu-repo`.

Recomendação prática:
- Abra **direto** a pasta `meu-repo` como workspace no VS Code (File → Open Folder) para evitar o Source Control “pegar” o repo errado.

## 3) “O Claude criou muita coisa e não aparece”
Confere: há um volume grande de arquivos **não rastreados** (ainda não adicionados ao Git) — em especial dentro de:
- `cloud-ide-desktop/aethel_theia_fork/packages/ai-ide/src/common/*`
- `src/common/trading/core/*`
- `src/common/credentials/*`

A lista completa (gerada automaticamente) está em:
- `diagnostics/UNTRACKED_MANIFEST_2025-12-25.txt`

## 4) Visão macro das pastas (o “mapa” do repo)
- `src/`: app/web principal (UI + serviços), incluindo Mission Control e serviços “Unreal-like”.
- `cloud-ide-desktop/`: fork do Theia + módulos IDE (onde ficam muitos agentes e integrações IDE).
- `cloud-web-app/`: web app (Next.js/rotas) para admin/dashboard/billing/etc.
- `examples/browser-ide-app/`: exemplo de IDE no browser com backend Express+WS (alvo de integração, real-or-fail).
- `shared/`: ferramentas/forks auxiliares.
- Muitos `.md` na raiz: documentação/relatórios/planos (alguns são gerados e estão como untracked).

Inventário (top-level) observado no workspace (arquivos/pastas recursivos):
- `node_modules/`: muito grande (dependências)
- `shared/`, `cloud-admin-ia/`, `examples/`, `cloud-web-app/`, `cloud-ide-desktop/`: concentram a maior parte do conteúdo
- `src/`: relativamente pequeno (UI/app principal)

## 5) Próximo passo recomendado (para alinhar de verdade)
1. Decidir se os arquivos do manifesto devem entrar no Git (commit) ou se são apenas artefatos/rascunhos.
2. Para os módulos novos grandes (ex.: `ai-ide/src/common/*`), validar **se estão realmente conectados ao runtime** (importados/instanciados) ou se são apenas stubs.
3. Remover/evitar o repo Git “pai” (`aethel engine`) se ele não for intencional — ele tende a confundir o VS Code.

### Correções aplicadas agora (real-or-fail)
- `ai-ide` Copilot: `runPlaytest` não retorna mais “simulação” como se fosse execução real; agora falha explicitamente quando não há integração com runtime.
- `ai-ide` TaskRunner: removido “marcar sucesso” sem executar processo; agora falha com `NOT_IMPLEMENTED`.
- `ai-ide` AssetManager: carregamento local sem `asset.url` agora falha explicitamente (sem retornar `null` “simulado”).
