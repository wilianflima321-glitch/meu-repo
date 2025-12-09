# AI IDE Metrics Collection

Unified metrics collection for all AI IDE components in Prometheus format.

## Overview

The AI IDE exposes metrics for:
- **Workspace Executor**: Command execution statistics
- **AI Agents**: Request counts, error rates, latency percentiles
- **LLM Providers**: Provider-specific performance metrics
- **Voice Input**: Voice recognition statistics (placeholder)
- **System**: Memory usage, uptime

## Accessing Metrics

### Command Line

Export metrics to a file:

```bash
# From IDE command palette or terminal
ai-ide.metrics.export

# Or via Node.js
node -e "const { MetricsEndpoint } = require('./lib/node/metrics-endpoint'); console.log(new MetricsEndpoint().exportMetrics())"
```

### Programmatic Access

```typescript
import { MetricsEndpoint } from '@theia/ai-ide/lib/node/metrics-endpoint';

const endpoint = new MetricsEndpoint(observability, executor);

// Prometheus format
const prometheusMetrics = endpoint.exportMetrics();

// JSON format
const jsonMetrics = endpoint.exportJSON();
```

## Metrics Reference

### Executor Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `ai_executor_total` | counter | Total command executions |
| `ai_executor_success` | counter | Successful executions |
| `ai_executor_failed` | counter | Failed executions |
| `ai_executor_timed_out` | counter | Timed out executions |
| `ai_executor_truncated` | counter | Truncated output executions |
| `ai_executor_terminated` | counter | Terminated executions |
| `ai_executor_duration_p95` | gauge | 95th percentile duration (ms) |
| `ai_executor_duration_p99` | gauge | 99th percentile duration (ms) |

### Agent Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `ai_agent_requests_total` | counter | `agent` | Total requests per agent |
| `ai_agent_requests_success` | counter | `agent` | Successful requests |
| `ai_agent_requests_error` | counter | `agent` | Failed requests |
| `ai_agent_error_rate` | gauge | `agent` | Error rate percentage |
| `ai_agent_duration_p95` | gauge | `agent` | 95th percentile latency (ms) |
| `ai_agent_duration_p99` | gauge | `agent` | 99th percentile latency (ms) |

**Available agents**: `Orchestrator`, `Coder`, `Architect`, `Universal`, `Command`, `AppTester`

### Provider Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `ai_provider_requests_total` | counter | `provider` | Total requests per provider |
| `ai_provider_requests_success` | counter | `provider` | Successful requests |
| `ai_provider_requests_error` | counter | `provider` | Failed requests |
| `ai_provider_error_rate` | gauge | `provider` | Error rate percentage |
| `ai_provider_duration_p95` | gauge | `provider` | 95th percentile latency (ms) |
| `ai_provider_duration_p99` | gauge | `provider` | 99th percentile latency (ms) |

### System Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `ai_ide_uptime_seconds` | counter | AI IDE uptime in seconds |
| `ai_ide_memory_heap_used` | gauge | Heap memory used (bytes) |
| `ai_ide_memory_heap_total` | gauge | Total heap memory (bytes) |
| `ai_ide_memory_rss` | gauge | Resident set size (bytes) |

## Integration with External Monitoring

### Prometheus

1. **Expose metrics endpoint** (requires HTTP server setup):

```typescript
import express from 'express';
import { MetricsEndpoint } from '@theia/ai-ide/lib/node/metrics-endpoint';

const app = express();
const metricsEndpoint = new MetricsEndpoint(observability, executor);

app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metricsEndpoint.exportMetrics());
});

app.listen(9090);
```

2. **Configure Prometheus** (`prometheus.yml`):

```yaml
scrape_configs:
  - job_name: 'ai-ide'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 15s
```

3. **Query metrics**:

```promql
# Agent error rate
rate(ai_agent_requests_error[5m]) / rate(ai_agent_requests_total[5m]) * 100

# Executor P95 latency
ai_executor_duration_p95

# Provider success rate
rate(ai_provider_requests_success[5m]) / rate(ai_provider_requests_total[5m]) * 100
```

### Grafana

Import the provided dashboard template:

```bash
# Export current metrics for dashboard creation
curl http://localhost:9090/metrics > ai-ide-metrics.txt
```

**Recommended panels**:
- Agent request rate (time series)
- Error rate by agent (gauge)
- P95/P99 latency (heatmap)
- Executor success/failure ratio (pie chart)
- Memory usage trend (area chart)

### Datadog

Use the Prometheus integration:

```yaml
# datadog.yaml
prometheus_url: http://localhost:9090/metrics
namespace: ai_ide
metrics:
  - ai_executor_*
  - ai_agent_*
  - ai_provider_*
  - ai_ide_*
```

### Custom Monitoring

Export metrics periodically:

```bash
#!/bin/bash
# collect-metrics.sh

while true; do
    timestamp=$(date +%s)
    curl -s http://localhost:9090/metrics > "metrics-${timestamp}.txt"
    sleep 60
done
```

## Alerting Rules

### Prometheus Alerts

```yaml
groups:
  - name: ai_ide_alerts
    rules:
      - alert: HighAgentErrorRate
        expr: rate(ai_agent_requests_error[5m]) / rate(ai_agent_requests_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate for agent {{ $labels.agent }}"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: ExecutorHighLatency
        expr: ai_executor_duration_p95 > 5000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Executor P95 latency is high"
          description: "P95 latency is {{ $value }}ms"

      - alert: ProviderDown
        expr: rate(ai_provider_requests_total[5m]) == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Provider {{ $labels.provider }} is not receiving requests"
```

## Troubleshooting

### No metrics available

- Ensure components are initialized and have processed requests
- Check that ObservabilityService is properly injected
- Verify WorkspaceExecutorService is recording metrics

### Metrics not updating

- Metrics are computed on-demand when exported
- Ensure requests are being recorded via `recordAgentRequest()` and `recordProviderRequest()`
- Check that executor is calling `recordMetrics()` after each execution

### High memory usage

- Metrics service keeps last 1000 duration samples per component
- Clear old metrics: `observability.reset()`
- Monitor `ai_ide_memory_*` metrics

## Best Practices

1. **Export regularly**: Set up periodic exports (every 15-60 seconds)
2. **Monitor error rates**: Alert on error rates > 5%
3. **Track latency**: Watch P95/P99 for performance degradation
4. **Capacity planning**: Use memory and request rate metrics
5. **Retention**: Keep metrics for at least 30 days for trend analysis

## See Also

- [AI Health Panel](./src/browser/health/ai-health-widget.ts) - UI for viewing metrics
- [Observability Service](./src/common/observability-service.ts) - Core metrics collection
- [Workspace Executor](./src/node/workspace-executor-service.ts) - Command execution metrics
