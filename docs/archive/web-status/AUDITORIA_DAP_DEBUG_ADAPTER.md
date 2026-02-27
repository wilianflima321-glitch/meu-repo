# 🔍 Auditoria do Debug Adapter Protocol (DAP) - Aethel Engine

**Data:** 7 de janeiro de 2026  
**Auditor:** GitHub Copilot  
**Escopo:** `cloud-web-app/web/lib/dap/`, `cloud-web-app/web/lib/debug/`, APIs relacionadas

---

## 📁 1. Arquivos Encontrados

### 1.1 Core DAP (`lib/dap/`)
| Arquivo | Caminho Completo | Linhas |
|---------|------------------|--------|
| dap-adapter-base.ts | `cloud-web-app/web/lib/dap/dap-adapter-base.ts` | 468 |
| dap-client.ts | `cloud-web-app/web/lib/dap/dap-client.ts` | 407 |

### 1.2 Adaptadores por Linguagem (`lib/dap/adapters/`)
| Arquivo | Caminho Completo | Linhas |
|---------|------------------|--------|
| nodejs-dap.ts | `cloud-web-app/web/lib/dap/adapters/nodejs-dap.ts` | 402 |
| python-dap.ts | `cloud-web-app/web/lib/dap/adapters/python-dap.ts` | 442 |
| go-dap.ts | `cloud-web-app/web/lib/dap/adapters/go-dap.ts` | 412 |
| java-dap.ts | `cloud-web-app/web/lib/dap/adapters/java-dap.ts` | 478 |

### 1.3 Debug Core (`lib/debug/`)
| Arquivo | Caminho Completo | Linhas |
|---------|------------------|--------|
| debug-adapter.ts | `cloud-web-app/web/lib/debug/debug-adapter.ts` | 858 |
| real-debug-adapter.ts | `cloud-web-app/web/lib/debug/real-debug-adapter.ts` | 1074 |

### 1.4 Cliente DAP Principal (`lib/`)
| Arquivo | Caminho Completo | Linhas |
|---------|------------------|--------|
| dap-client.ts | `cloud-web-app/web/lib/dap-client.ts` | 721 |

### 1.5 Runtime Servidor (`lib/server/`)
| Arquivo | Caminho Completo | Linhas |
|---------|------------------|--------|
| dap-runtime.ts | `cloud-web-app/web/lib/server/dap-runtime.ts` | 273 |

### 1.6 APIs (`app/api/dap/`)
| Arquivo | Caminho Completo |
|---------|------------------|
| route.ts | `cloud-web-app/web/app/api/dap/request/route.ts` |
| route.ts | `cloud-web-app/web/app/api/dap/events/route.ts` |
| route.ts | `cloud-web-app/web/app/api/dap/session/start/route.ts` |
| route.ts | `cloud-web-app/web/app/api/dap/session/stop/route.ts` |

---

## 🔬 2. Análise: Mock vs Real

### ⚠️ VEREDICTO GERAL: SISTEMA HÍBRIDO (MOCK + REAL)

O sistema DAP possui **duas implementações paralelas**:
1. **Mock Client-side** (`lib/dap/`, `lib/debug/debug-adapter.ts`) - Retorna dados simulados
2. **Real Server-side** (`lib/server/dap-runtime.ts`) - Executa debuggers reais via spawn

---

## 🚨 3. Funções que Retornam Dados Mock/Hardcoded

### 3.1 `lib/dap/dap-adapter-base.ts` (MOCK)
```typescript
// Linha 339-363 - sendRequest usa mock interno
protected async sendRequest(command: string, args: any): Promise<any> {
  // Mock implementation - will be replaced with real communication
  setTimeout(() => {
    const mockResponse = this.getMockResponse(command, args); // ⚠️ MOCK
    this.handleResponse({...});
  }, 50);
}
```

### 3.2 `lib/dap/adapters/nodejs-dap.ts` (MOCK)
| Função | Linha | Dados Hardcoded |
|--------|-------|-----------------|
| `getMockInitializeResponse()` | 76-103 | Capabilities estáticas |
| `getMockSetBreakpointsResponse()` | 105-117 | Breakpoints simulados sempre `verified: true` |
| `getMockStackTraceResponse()` | 119-150 | Stack trace hardcoded: `main`, `processData`, `fetchData` |
| `getMockScopesResponse()` | 152-170 | Scopes: Local(1000), Closure(2000), Global(3000) |
| `getMockVariablesResponse()` | 172+ | Variáveis estáticas |
| `getMockThreadsResponse()` | - | Thread mock "main" |
| `getMockEvaluateResponse()` | - | Avaliação simulada |

### 3.3 `lib/dap/adapters/python-dap.ts` (MOCK)
Estrutura idêntica ao Node.js, com:
- Stack trace: `main`, `process_data`, `fetch_data`
- Variáveis mock Python: `data`, `config`, `items`
- Scopes: `Locals(1000)`, `Globals(2000)`

### 3.4 `lib/dap/adapters/go-dap.ts` (MOCK)
Estrutura idêntica, com:
- Stack trace: `main.main`, `main.processData`, `main.fetchData`
- Variáveis Go: `map[string]interface{}`

### 3.5 `lib/dap/adapters/java-dap.ts` (MOCK)
Estrutura idêntica, com:
- Stack trace: `Main.main(String[])`, `DataProcessor.processData(Data)`
- Scopes: Local, Instance, Static

### 3.6 `lib/debug/debug-adapter.ts` (MOCK)
```typescript
// Linha 500-545 - getVariables retorna dados mock
async getVariables(...): Promise<Variable[]> {
  if (refData.type === 'locals') {
    return [
      { name: 'x', value: '42', type: 'number', variablesReference: 0 },
      { name: 'name', value: '"Aethel"', type: 'string', variablesReference: 0 },
      // ⚠️ HARDCODED
    ];
  }
}

// Linha 590-605 - evaluate é simulado
async evaluate(...): Promise<...> {
  result = `<evaluated: ${expression}>`; // ⚠️ SIMULADO
  type = 'string';
}
```

---

## ✅ 4. Componentes REAIS Implementados

### 4.1 `lib/server/dap-runtime.ts` (REAL ✅)
```typescript
// Linha 203-212 - Spawn real de processos debugger
const child = spawn(command, adapter.args, {
  cwd: workspaceRootAbs,
  env: { ...process.env, ...(opts.env || {}) },
  stdio: 'pipe',
});

// Linha 90-107 - Comunicação DAP real via STDIO
sendRequest(seq: number, command: string, args: any): Promise<any> {
  const payload: DapMessage = { type: 'request', seq, command, arguments: args };
  const json = JSON.stringify(payload);
  const frame = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
  this.child.stdin.write(frame, 'utf8', ...);
}
```

### 4.2 `lib/debug/real-debug-adapter.ts` (REAL ✅)
```typescript
// Linha 292-315 - Comunicação real via HTTP/fetch
async initialize(): Promise<Capabilities> {
  const response = await fetch('/api/dap/session/start', {...});
  const data = await response.json();
  this.sessionId = data.sessionId;
  // Usa API real do servidor
}

// Linha 840-860 - sendRequest real
private async sendRequest<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/dap/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: this.sessionId, command, arguments: args }),
  });
  return (data.body || {}) as T;
}
```

---

## 🔧 5. Recomendações de Implementação

### 5.1 ALTA PRIORIDADE - Conectar Clients ao Runtime Real

#### A) Remover mocks do `dap-adapter-base.ts`
```typescript
// ANTES (linha 339)
protected async sendRequest(command: string, args: any): Promise<any> {
  setTimeout(() => {
    const mockResponse = this.getMockResponse(command, args);
    ...
  }, 50);
}

// DEPOIS - Usar fetch para API real
protected async sendRequest(command: string, args: any): Promise<any> {
  const response = await fetch('/api/dap/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: this.sessionId, command, arguments: args })
  });
  const data = await response.json();
  return data.body;
}
```

#### B) Excluir funções mock dos adapters
| Arquivo | Funções a Remover |
|---------|-------------------|
| `nodejs-dap.ts` | `getMockResponse`, `getMockInitializeResponse`, `getMockSetBreakpointsResponse`, `getMockStackTraceResponse`, `getMockScopesResponse`, `getMockVariablesResponse`, `getMockEvaluateResponse`, `getMockThreadsResponse` |
| `python-dap.ts` | Idem |
| `go-dap.ts` | Idem |
| `java-dap.ts` | Idem |

### 5.2 MÉDIA PRIORIDADE - Expandir Runtime do Servidor

#### A) Adicionar suporte para Go (Delve)
```typescript
// lib/server/dap-runtime.ts - resolveAdapterForType()
if (t === 'go') {
  const cmd = String(process.env.AETHEL_DAP_GO_CMD || 'dlv').trim();
  const args = ['dap', '--listen=127.0.0.1:0'];
  return { command: cmd, args };
}
```

#### B) Adicionar suporte para Java
```typescript
if (t === 'java') {
  const cmd = String(process.env.AETHEL_DAP_JAVA_CMD || '').trim();
  if (!cmd) return null;
  return { command: cmd, args: process.env.AETHEL_DAP_JAVA_ARGS?.split(' ') || [] };
}
```

#### C) Adicionar suporte para C++/LLDB
```typescript
if (t === 'cpp' || t === 'c' || t === 'lldb') {
  const cmd = String(process.env.AETHEL_DAP_LLDB_CMD || 'lldb-vscode').trim();
  return { command: cmd, args: [] };
}
```

### 5.3 BAIXA PRIORIDADE - Consolidar Implementações

O projeto tem **3 clientes DAP** paralelos:
1. `lib/dap/dap-client.ts` - Cliente com fetch
2. `lib/dap-client.ts` - Cliente alternativo
3. `lib/debug/real-debug-adapter.ts` - Cliente mais completo

**Recomendação:** Unificar em `lib/debug/real-debug-adapter.ts` e deprecar os outros.

---

## 📊 6. Resumo do Status

| Componente | Status | Notas |
|------------|--------|-------|
| **Runtime Servidor** | ✅ REAL | Funcional via spawn + stdio |
| **API HTTP** | ✅ REAL | Endpoints funcionais |
| **Python DAP** | ✅ REAL | debugpy configurado |
| **Node.js DAP** | ⚠️ MOCK | Precisa configurar `AETHEL_DAP_NODE_CMD` |
| **Go DAP** | ❌ MOCK | Não implementado no runtime |
| **Java DAP** | ❌ MOCK | Não implementado no runtime |
| **Client-side Adapters** | ⚠️ MOCK | Todos usam getMockResponse() |
| **RealDebugAdapter** | ✅ REAL | Usa APIs reais |

---

## 🎯 7. Próximos Passos

1. **Imediato:** Configurar variável `AETHEL_DAP_NODE_CMD` com caminho para js-debug ou similar
2. **Curto prazo:** Migrar todos os usos de adapters mock para `RealDebugAdapter`
3. **Médio prazo:** Implementar suporte Go/Java no runtime do servidor
4. **Longo prazo:** Remover código mock e consolidar em uma única implementação

---

## 📝 Conclusão

O Debug Adapter Protocol está **parcialmente implementado**:
- **Backend (servidor):** Runtime real funcional para Python; Node.js precisa de configuração
- **Frontend (cliente):** Maioria usa mocks; apenas `RealDebugAdapter` é real
- **APIs:** Completamente funcionais

**Esforço estimado para implementação completa:** ~16-24 horas de desenvolvimento
