# Implementações de Infraestrutura - Aethel Engine

## Data: 2025-01-28

## Resumo das Implementações

Este documento descreve as implementações críticas de infraestrutura alinhadas com o plano de negócio e estratégia de custos do Aethel Engine.

---

## 1. Storage Quota Circuit Breaker ✅

**Arquivo:** [lib/storage-quota.ts](lib/storage-quota.ts)

### Funcionalidade
- Verifica quota de storage ANTES de permitir uploads
- Bloqueia uploads quando quota do plano é excedida
- Sugere plano adequado para upgrade

### Limites por Plano
| Plano | Storage |
|-------|---------|
| starter_trial | 500MB |
| starter | 2GB |
| basic | 10GB |
| pro | 50GB |
| studio | 200GB |
| enterprise | 1TB+ |

### Uso
```typescript
import { checkStorageQuota, createQuotaExceededResponse } from '@/lib/storage-quota';

const quotaCheck = await checkStorageQuota({
  userId: user.userId,
  additionalBytes: fileSize,
});

if (!quotaCheck.allowed) {
  return NextResponse.json(createQuotaExceededResponse(quotaCheck), { status: 402 });
}
```

### Integração
- ✅ Integrado no endpoint `/api/assets/presign`
- ✅ Retorna HTTP 402 com detalhes da quota
- ✅ Inclui sugestão de plano para upgrade

---

## 2. PremiumLock UI Component ✅

**Arquivo:** [components/billing/PremiumLock.tsx](components/billing/PremiumLock.tsx)

### Funcionalidade
- Wrapper React para features premium
- Exibe paywall quando usuário não tem acesso
- Modal detalhado com benefícios da feature
- CTA direto para página de pricing

### Uso
```tsx
import { PremiumLock } from '@/components/billing/PremiumLock';

<PremiumLock feature="agents" requiredPlan="pro">
  <AIAgentPanel />
</PremiumLock>
```

### Features Suportadas
- `agents` - AI Agents (Pro+)
- `collaboration` - Colaboração Real-time (Pro+)
- `git` - Git Integration (Basic+)
- `terminal` - Terminal (Basic+)
- `build` - Cloud Builds (Pro+)
- `export` - Export Premium (Pro+)
- `api` - API Access (Studio+)
- `team-management` - Gestão de Equipe (Studio+)

---

## 3. StatusBar Pro com Métricas Reais ✅

**Arquivo:** [components/statusbar/StatusBarPro.tsx](components/statusbar/StatusBarPro.tsx)

### Métricas em Tempo Real
- **FPS**: Medido via requestAnimationFrame
- **VRAM**: Estimativa via WebGL context
- **Latência**: Ping real para /api/health
- **Conexão**: Status online/offline
- **Créditos de IA**: Integrado com /api/wallet/summary
- **Storage**: Integrado com /api/quotas
- **Git Branch**: Exibição do branch atual

### Indicadores Visuais
- 🟢 Verde: Normal
- 🟡 Amarelo: Atenção
- 🔴 Vermelho: Crítico

### Uso
```tsx
import { StatusBarPro } from '@/components/statusbar/StatusBarPro';

// No layout principal
<StatusBarPro />
```

---

## 4. Build Minutes/Tokens System ✅

**Arquivo:** [lib/build-minutes.ts](lib/build-minutes.ts)

### Funcionalidade
- Controla minutos de build por plano
- Reserva minutos antes de iniciar
- Ajusta uso real após conclusão
- Bloqueia quando quota é excedida

### Limites por Plano
| Plano | Build Minutes/mês |
|-------|-------------------|
| starter_trial | 10 |
| starter | 30 |
| basic | 100 |
| pro | 500 |
| studio | 2000 |
| enterprise | Ilimitado |

### Integração
- ✅ Integrado no endpoint `/api/build`
- ✅ Reserva otimista antes do build
- ✅ Ajuste após conclusão

---

## 5. AI Credit Wallet ✅

**Arquivo:** [lib/credit-wallet.ts](lib/credit-wallet.ts)

### Funcionalidade
- Sistema de créditos para chamadas de IA
- Reserva créditos antes da operação
- Ajusta baseado no uso real
- Integra com CreditLedgerEntry

### Custos por Operação
| Operação | Custo |
|----------|-------|
| Chat simples | 1 crédito/1K tokens |
| Chat avançado | 2 créditos/1K tokens |
| Geração de código | 3 créditos/1K tokens |
| Imagem | 10 créditos/imagem |
| Áudio | 5 créditos/minuto |
| 3D Asset | 20 créditos/asset |

### Uso
```typescript
import { withCreditControl } from '@/lib/credit-wallet';

const result = await withCreditControl(
  userId,
  'chat',
  estimatedCost,
  async () => {
    const response = await callAI();
    return { result: response, actualTokens: response.usage.total_tokens };
  }
);
```

---

## 6. Secure Upload Hook ✅

**Arquivo:** [hooks/useSecureUpload.ts](hooks/useSecureUpload.ts)

### Funcionalidade
- Verificação de quota client-side (otimista)
- Verificação server-side (autoritativa)
- Progress tracking em tempo real
- Abort handling
- Múltiplos uploads concorrentes

### Uso
```tsx
const { upload, uploadSingle, abort, isUploading, progress, quota } = useSecureUpload({
  onProgress: (p) => console.log(p.progress),
  onComplete: (r) => console.log('Done:', r),
  onQuotaExceeded: (q) => showUpgradeModal(),
});

// Upload único
await uploadSingle({ file, projectId: 'xxx', path: '/Content' });

// Upload múltiplo
await upload([{ file: file1, projectId }, { file: file2, projectId }]);
```

---

## Endpoints Atualizados

### `/api/assets/presign` (POST)
- ✅ Circuit breaker de storage quota
- Retorna 402 quando quota excedida

### `/api/build` (POST)
- ✅ Circuit breaker de build minutes
- Reserva e ajusta minutos automaticamente

---

## Próximos Passos

1. **Rate Limiting por Plano**
   - Implementar limites diferenciados de requests/minuto

2. **Hibernação de Projetos**
   - Cold storage para projetos inativos
   - Economia de custos de storage

3. **Alertas de Quota**
   - Notificações quando atinge 75%, 90%
   - Emails de warning

4. **Dashboard de Uso**
   - Visualização histórica
   - Previsão de consumo

---

## Estrutura de Arquivos Criados

```
lib/
├── storage-quota.ts      # Circuit breaker de storage
├── build-minutes.ts      # Sistema de build minutes
├── credit-wallet.ts      # Wallet de créditos de IA

components/
├── billing/
│   └── PremiumLock.tsx   # Paywall para features premium
├── statusbar/
│   └── StatusBarPro.tsx  # StatusBar com métricas reais

hooks/
└── useSecureUpload.ts    # Hook de upload seguro

app/api/
├── assets/presign/route.ts  # Atualizado com quota check
└── build/route.ts           # Atualizado com build minutes
```

---

## Considerações de Segurança

- Todas as verificações de quota são **server-side autoritativas**
- Client-side checks são apenas otimização de UX
- Logs de auditoria via CreditLedgerEntry
- Reservas com TTL para evitar locks permanentes
