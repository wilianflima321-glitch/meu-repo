# Browser IDE App (exemplo)

Este diretório contém um exemplo de IDE no browser com backend Node.js/TypeScript (Express + WebSocket), usado como alvo de integração para o fluxo de missões (Theia) e para validar o princípio **real-or-fail**.

Não há respostas “fake”: quando algo não está implementado ou não está configurado, a API retorna erros explícitos (`501 NOT_IMPLEMENTED`, `503 LLM_NOT_CONFIGURED`, `503 ORCHESTRATOR_NOT_READY`).

## Requisitos

- Node.js 18+
- npm

## Como executar

```bash
cd examples/browser-ide-app
npm install
npm start
```

Por padrão o servidor usa `PORT=3000` (ou o valor da env `PORT`).

Abra:

- `http://localhost:3000/`

## Endpoints úteis

- `GET /api/health`: status do servidor + readiness + estado do orquestrador (`initializing/ready/failed`).
- `GET /api/status`: status do orquestrador (pode retornar `503` enquanto inicializa).
- `POST /api/agent/:type`: execução real via LLMRouter (sem chaves retorna `503 LLM_NOT_CONFIGURED`).
- `POST /orchestrator/select`: hook para thin-client (Theia). Retorna `501` se `AETHEL_ORCHESTRATOR_SELECT_AGENT_ID` não estiver definido.
- `WS /ws`: stream de eventos (inclui `mission.update`, `mission.complete`, `mission.error`).

## Observações (real-or-fail)

- `ai-dream` e `character-memory` retornam `501 NOT_IMPLEMENTED` no backend real.
- Para habilitar execução de agentes (`architect`, `coder`, `research`), configure ao menos uma chave:
	- `OPENAI_API_KEY` ou `DEEPSEEK_API_KEY` ou `ANTHROPIC_API_KEY` ou `GOOGLE_API_KEY`

## Diagnóstico rápido (Windows / PowerShell)

```powershell
$env:PORT=3326
node .\server.js
```

Se você estiver rodando por um runner que interrompe processos long-running, valide a saúde com:

```powershell
Invoke-RestMethod -Uri "http://localhost:$env:PORT/api/health" -Method GET | ConvertTo-Json -Depth 6
```

### ✅ Backend funcional (real-or-fail)
- API REST + WS (eventos `mission.*`)
- Health check (`/api/health`) + status (`/api/status`)
- CORS habilitado

### ✅ Agentes suportados (quando LLM configurado)
- `architect`
- `coder`
- `research`

### 🚫 Recursos não implementados (retornam `501 NOT_IMPLEMENTED`)
- `ai-dream`
- `character-memory`

---

## 🚀 Próximos Passos

Para integrar com LLMs reais:

1. Configure API keys nos providers
2. Substitua simulações por chamadas reais
3. Implemente streaming real
4. Adicione autenticação
5. Deploy em produção

---

## 🐛 Troubleshooting

### Porta 3000 já em uso?

```bash
# Use outra porta
PORT=3001 npm start
```

### Erro ao instalar dependências?

```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

### Servidor não inicia?

```bash
# Verifique se Node.js está instalado
node --version

# Deve mostrar v18.0.0 ou superior
```

---

## 📞 Suporte

- **Documentação**: Veja os arquivos .md no diretório raiz
- **Issues**: Abra uma issue no GitHub
- **Email**: Consulte a documentação

---

## 🎉 Status Final

**Status: real-or-fail (sem mocks)**

- O backend expõe status real em `GET /api/health` e `GET /api/status`.
- Execução de agentes depende de configuração de LLM; sem chaves retorna `503 LLM_NOT_CONFIGURED`.
- Recursos não implementados retornam `501 NOT_IMPLEMENTED` (não simulamos capacidade).

---

## 📜 Licença

Apache 2.0

---

**Última Atualização**: 2025-12-25  
**Status**: Em evolução (real-or-fail)
