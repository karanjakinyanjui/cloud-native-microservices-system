# Jaeger Distributed Tracing

This directory contains comprehensive Jaeger distributed tracing setup for the cloud-native microservices system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Deployment Options](#deployment-options)
- [Installation](#installation)
- [Service Instrumentation](#service-instrumentation)
- [Query Examples](#query-examples)
- [Integration with Grafana](#integration-with-grafana)
- [Production Considerations](#production-considerations)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

Jaeger is an open-source, end-to-end distributed tracing system that helps monitor and troubleshoot microservices-based architectures. It provides:

- **Distributed context propagation**: Track requests across service boundaries
- **Performance optimization**: Identify bottlenecks and latency issues
- **Root cause analysis**: Debug complex distributed transactions
- **Service dependency analysis**: Understand service relationships
- **Adaptive sampling**: Reduce overhead while maintaining visibility

## Architecture

```
┌─────────────────┐
│  Microservices  │
│   (Instrumented)│
└────────┬────────┘
         │ UDP/gRPC
         ▼
┌─────────────────┐
│  Jaeger Agent   │  (DaemonSet on each node)
│   Port: 6831    │
└────────┬────────┘
         │ gRPC
         ▼
┌─────────────────┐
│Jaeger Collector │  (3 replicas)
│   Port: 14250   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  Elasticsearch  │────▶│ Jaeger Query │  (UI/API)
│   (3 nodes)     │     │  Port: 16686 │
└─────────────────┘     └──────────────┘
```

## Deployment Options

### 1. All-in-One (Development/Testing)

Single pod deployment with all Jaeger components:

```bash
kubectl apply -f jaeger-all-in-one.yaml
```

**Features:**
- Collector, Query, and Agent in one pod
- Badger embedded storage (20Gi PVC)
- 7-day trace retention
- Prometheus metrics integration
- Quick setup for development

**Access UI:**
```bash
kubectl port-forward svc/jaeger-query 16686:16686
# Open: http://localhost:16686
```

### 2. Production Setup (Scalable)

Separate components with Elasticsearch backend:

```bash
# Deploy Elasticsearch cluster
kubectl apply -f elasticsearch/

# Wait for Elasticsearch to be ready
kubectl wait --for=condition=ready pod -l app=elasticsearch --timeout=300s

# Deploy Jaeger production components
kubectl apply -f jaeger-production/
kubectl apply -f configmap.yaml
```

**Components:**
- **Collector**: 3 replicas, auto-scaling capable
- **Query**: 2 replicas with load balancing
- **Agent**: DaemonSet on every node
- **Elasticsearch**: 3-node cluster with 100Gi per node

### 3. Operator-Based (Advanced)

Use Jaeger Operator for declarative management:

```bash
# See jaeger-operator/README.md for detailed instructions
kubectl apply -f jaeger-operator/jaeger-cr.yaml
```

## Installation

### Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured
- 300Gi total storage for production Elasticsearch
- Prometheus for metrics (optional)

### Quick Start (All-in-One)

```bash
# Deploy all-in-one Jaeger
kubectl apply -f jaeger-all-in-one.yaml

# Check status
kubectl get pods -l app=jaeger
kubectl get svc -l app=jaeger

# Access UI
kubectl port-forward svc/jaeger-query 16686:16686
```

### Production Deployment

```bash
# 1. Deploy Elasticsearch
kubectl apply -f elasticsearch/configmap.yaml
kubectl apply -f elasticsearch/service.yaml
kubectl apply -f elasticsearch/statefulset.yaml

# 2. Verify Elasticsearch
kubectl get statefulset elasticsearch
kubectl get pods -l app=elasticsearch

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod -l app=elasticsearch --timeout=600s

# 3. Deploy Jaeger components
kubectl apply -f configmap.yaml
kubectl apply -f jaeger-production/

# 4. Verify Jaeger deployment
kubectl get deployments -l app=jaeger
kubectl get daemonset jaeger-agent
kubectl get svc -l app=jaeger

# 5. Access UI via ingress or port-forward
kubectl port-forward svc/jaeger-query 80:80
```

### Verify Installation

```bash
# Check all components
kubectl get all -l app=jaeger

# Check collector logs
kubectl logs -l app=jaeger,component=collector --tail=50

# Check query logs
kubectl logs -l app=jaeger,component=query --tail=50

# Check agent on specific node
kubectl get pods -l app=jaeger,component=agent -o wide

# Test Elasticsearch connection
kubectl exec -it elasticsearch-0 -- curl -s http://localhost:9200/_cat/indices?v | grep jaeger
```

## Service Instrumentation

### Jaeger Client Configuration

All microservices should be instrumented with Jaeger client libraries:

#### Go Services

```go
import (
    "github.com/uber/jaeger-client-go"
    "github.com/uber/jaeger-client-go/config"
)

func InitJaeger(serviceName string) (opentracing.Tracer, io.Closer) {
    cfg := &config.Configuration{
        ServiceName: serviceName,
        Sampler: &config.SamplerConfig{
            Type:  "probabilistic",
            Param: 0.5,
        },
        Reporter: &config.ReporterConfig{
            LogSpans:           true,
            LocalAgentHostPort: "jaeger-agent:6831",
        },
    }

    tracer, closer, err := cfg.NewTracer(
        config.Logger(jaeger.StdLogger),
    )
    if err != nil {
        panic(fmt.Sprintf("ERROR: cannot init Jaeger: %v\n", err))
    }

    return tracer, closer
}
```

#### Node.js Services

```javascript
const initJaeger = require('jaeger-client').initTracer;

function initTracer(serviceName) {
  const config = {
    serviceName: serviceName,
    sampler: {
      type: 'probabilistic',
      param: 0.5,
    },
    reporter: {
      agentHost: 'jaeger-agent',
      agentPort: 6831,
    },
  };

  const options = {
    logger: {
      info: msg => console.log('INFO', msg),
      error: msg => console.log('ERROR', msg),
    },
  };

  return initJaeger(config, options);
}
```

#### Python Services

```python
from jaeger_client import Config

def init_tracer(service_name):
    config = Config(
        config={
            'sampler': {
                'type': 'probabilistic',
                'param': 0.5,
            },
            'local_agent': {
                'reporting_host': 'jaeger-agent',
                'reporting_port': 6831,
            },
            'logging': True,
        },
        service_name=service_name,
        validate=True,
    )

    return config.initialize_tracer()
```

### Environment Variables for Services

Add these environment variables to your service deployments:

```yaml
env:
- name: JAEGER_AGENT_HOST
  value: "jaeger-agent"
- name: JAEGER_AGENT_PORT
  value: "6831"
- name: JAEGER_SAMPLER_TYPE
  value: "probabilistic"
- name: JAEGER_SAMPLER_PARAM
  value: "0.5"
- name: JAEGER_REPORTER_LOG_SPANS
  value: "true"
- name: JAEGER_TAGS
  value: "deployment.environment=production,version=1.0.0"
```

### Sampling Configuration

Adjust sampling rates per service in `configmap.yaml`:

```json
{
  "service_strategies": [
    {
      "service": "user-service",
      "type": "probabilistic",
      "param": 0.5
    },
    {
      "service": "payment-service",
      "type": "probabilistic",
      "param": 1.0
    }
  ]
}
```

**Sampling Types:**
- **probabilistic**: Sample X% of traces (param: 0.0-1.0)
- **ratelimiting**: Sample max X traces per second
- **const**: Always sample (param: 1) or never sample (param: 0)
- **adaptive**: Dynamic sampling based on traffic (operator only)

## Query Examples

### Using Jaeger UI

Access the UI at: `http://localhost:16686` or your ingress domain.

**Common Queries:**

1. **Find traces for a service:**
   - Service: `order-service`
   - Lookback: Last hour
   - Min Duration: 100ms

2. **Find slow traces:**
   - Min Duration: 1s
   - Max Duration: 10s
   - Tags: `error=true`

3. **Find traces with errors:**
   - Tags: `http.status_code=500`
   - Or: `error=true`

4. **Trace by ID:**
   - Direct URL: `/trace/{trace-id}`

### Using Jaeger API

```bash
# Search traces
curl -G http://jaeger-query/api/traces \
  --data-urlencode "service=user-service" \
  --data-urlencode "start=$(date -u -d '1 hour ago' +%s)000000" \
  --data-urlencode "end=$(date -u +%s)000000" \
  --data-urlencode "limit=20"

# Get specific trace
curl http://jaeger-query/api/traces/{trace-id}

# Get service dependencies
curl http://jaeger-query/api/dependencies?endTs=$(date +%s)000&lookback=86400000

# Get service operations
curl http://jaeger-query/api/services/user-service/operations
```

### Query with kubectl

```bash
# Get recent traces via Elasticsearch
kubectl exec -it elasticsearch-0 -- curl -s "http://localhost:9200/jaeger-span-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"term": {"process.serviceName": "order-service"}},
        {"range": {"startTime": {"gte": "now-1h"}}}
      ]
    }
  },
  "size": 10,
  "sort": [{"startTime": "desc"}]
}'
```

## Integration with Grafana

### Configure Jaeger Data Source in Grafana

1. **Add Data Source:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
data:
  jaeger.yaml: |
    apiVersion: 1
    datasources:
    - name: Jaeger
      type: jaeger
      access: proxy
      url: http://jaeger-query:16686
      isDefault: false
      editable: true
```

2. **Explore Traces in Grafana:**
   - Navigate to Explore
   - Select Jaeger data source
   - Search by Service, Operation, Tags
   - View trace details with span timings

3. **Create Trace Dashboard:**

```json
{
  "dashboard": {
    "title": "Distributed Tracing Overview",
    "panels": [
      {
        "title": "Trace Rate by Service",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(traces_received_total[5m])"
          }
        ]
      },
      {
        "title": "P99 Latency by Operation",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(duration_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

### Linking Traces with Logs

Configure Loki to include trace IDs:

```yaml
# In your application
logger.info("Processing order", {
  "trace_id": span.context().traceID,
  "span_id": span.context().spanID,
  "order_id": orderId
});
```

Link from Jaeger UI to Grafana Explore:
- Configured in `configmap.yaml` → `jaeger-ui-configuration`
- Click "View Logs in Grafana" button in trace view

### Metrics from Traces

Jaeger can export span metrics to Prometheus:

```yaml
# Prometheus scrape config
- job_name: 'jaeger'
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    target_label: __address__
    regex: ([^:]+)(?::\d+)?
    replacement: $1:14269
```

**Available Metrics:**
- `jaeger_collector_traces_received_total`
- `jaeger_collector_spans_received_total`
- `jaeger_collector_spans_rejected_total`
- `jaeger_query_requests_total`
- `jaeger_query_request_duration_seconds`

## Production Considerations

### Resource Sizing

**Collector:**
- CPU: 500m-2000m per replica
- Memory: 1Gi-4Gi per replica
- Replicas: 3-5 for high availability

**Query:**
- CPU: 200m-1000m per replica
- Memory: 512Mi-2Gi per replica
- Replicas: 2-3 for high availability

**Agent:**
- CPU: 100m-500m per node
- Memory: 128Mi-512Mi per node

**Elasticsearch:**
- CPU: 1000m-2000m per node
- Memory: 4Gi-8Gi per node (50% for JVM heap)
- Storage: 100Gi-500Gi per node
- Nodes: 3 minimum for HA

### High Availability

```yaml
# Collector anti-affinity
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: component
          operator: In
          values:
          - collector
      topologyKey: kubernetes.io/hostname
```

### Auto-scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: jaeger-collector
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: jaeger-collector
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Retention and Storage

**Elasticsearch Index Management:**
- Daily index rotation
- 7-day retention (configurable)
- Automated cleanup with Curator CronJob

```bash
# Manual cleanup
kubectl create job --from=cronjob/jaeger-es-index-cleaner manual-cleanup-$(date +%s)
```

**Adjust retention:**
Edit `configmap.yaml` → `jaeger-curator-config`:
```yaml
unit_count: 14  # Change from 7 to 14 days
```

### Security

**1. Enable Authentication:**

```yaml
# Create basic auth secret for Jaeger UI
htpasswd -c auth admin
kubectl create secret generic jaeger-basic-auth --from-file=auth
```

**2. TLS for Elasticsearch:**

```yaml
env:
- name: ES_SERVER_URLS
  value: https://elasticsearch:9200
- name: ES_TLS_ENABLED
  value: "true"
- name: ES_TLS_CA
  value: /tls/ca.crt
```

**3. Network Policies:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: jaeger-collector
spec:
  podSelector:
    matchLabels:
      component: collector
  ingress:
  - from:
    - podSelector:
        matchLabels:
          component: agent
    ports:
    - protocol: TCP
      port: 14250
```

## Troubleshooting

### Common Issues

#### 1. No traces appearing in UI

**Check agent connectivity:**
```bash
# Test UDP connectivity to agent
kubectl run -it --rm debug --image=busybox --restart=Never -- nc -u jaeger-agent 6831

# Check agent logs
kubectl logs -l component=agent --tail=50

# Verify agent is receiving spans
kubectl exec -it $(kubectl get pod -l component=agent -o jsonpath='{.items[0].metadata.name}') -- wget -qO- http://localhost:14271/metrics | grep received
```

**Check collector:**
```bash
# Collector logs
kubectl logs -l component=collector --tail=50 | grep -i error

# Collector metrics
kubectl port-forward svc/jaeger-collector 14269:14269
curl http://localhost:14269/metrics | grep spans_received
```

#### 2. High memory usage

**Adjust collector queue size:**
```yaml
env:
- name: COLLECTOR_QUEUE_SIZE
  value: "2000"  # Reduce from 5000
- name: COLLECTOR_NUM_WORKERS
  value: "50"    # Reduce from 100
```

**Enable adaptive sampling:**
```json
{
  "default_strategy": {
    "type": "probabilistic",
    "param": 0.1
  }
}
```

#### 3. Elasticsearch connection issues

**Verify Elasticsearch health:**
```bash
kubectl exec -it elasticsearch-0 -- curl http://localhost:9200/_cluster/health?pretty
```

**Check credentials:**
```bash
kubectl get secret elasticsearch-credentials -o yaml
```

**Test connection from collector:**
```bash
kubectl exec -it $(kubectl get pod -l component=collector -o jsonpath='{.items[0].metadata.name}') -- curl http://elasticsearch:9200
```

#### 4. Storage full

**Check Elasticsearch disk usage:**
```bash
kubectl exec -it elasticsearch-0 -- curl http://localhost:9200/_cat/allocation?v
```

**Manually trigger cleanup:**
```bash
kubectl create job --from=cronjob/jaeger-es-index-cleaner manual-cleanup
```

**Reduce retention:**
```bash
kubectl edit configmap jaeger-curator-config
# Change unit_count to a smaller value
```

### Debug Commands

```bash
# Get all Jaeger resources
kubectl get all,pvc,configmap,secret -l app=jaeger

# Describe problematic pod
kubectl describe pod <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp' | grep -i jaeger

# Check resource usage
kubectl top pods -l app=jaeger

# View collector configuration
kubectl exec -it <collector-pod> -- env | grep -i jaeger

# Test trace submission
curl -X POST http://jaeger-collector:14268/api/traces \
  -H "Content-Type: application/json" \
  -d @test-trace.json
```

## Best Practices

### 1. Sampling Strategy

- **Development**: 100% sampling for full visibility
- **Staging**: 50% sampling for testing
- **Production**: 10-50% adaptive sampling
- **Critical paths**: 100% sampling for payment, auth flows

### 2. Span Naming

```go
// Good: Specific and hierarchical
span := tracer.StartSpan("order-service: POST /orders")
span.SetTag("order.id", orderId)
span.SetTag("customer.id", customerId)

// Bad: Generic
span := tracer.StartSpan("handle request")
```

### 3. Tag Best Practices

**Standard tags:**
- `http.method`: GET, POST, etc.
- `http.url`: Request URL
- `http.status_code`: Response status
- `error`: Boolean (true for errors)
- `span.kind`: client, server, producer, consumer

**Custom tags:**
- `user.id`: User identifier
- `order.id`: Business entity ID
- `db.statement`: SQL query (sanitized)
- `cache.hit`: Boolean

### 4. Error Handling

```go
if err != nil {
    span.SetTag("error", true)
    span.LogFields(
        log.String("event", "error"),
        log.String("message", err.Error()),
        log.String("stack", debug.Stack()),
    )
}
```

### 5. Context Propagation

```go
// HTTP propagation
carrier := opentracing.HTTPHeadersCarrier(httpReq.Header)
tracer.Inject(span.Context(), opentracing.HTTPHeaders, carrier)

// gRPC propagation
md := metadata.Pairs("trace-id", span.Context().TraceID())
ctx = metadata.NewOutgoingContext(ctx, md)
```

### 6. Monitoring Tracing System

**Key metrics to alert on:**
- Collector span drop rate > 1%
- Query latency > 500ms
- Elasticsearch disk usage > 80%
- Agent memory usage > 400Mi
- Trace ingestion lag > 5 minutes

### 7. Performance Optimization

- Use UDP for agent communication (lower overhead)
- Enable gRPC batching in reporter
- Implement client-side throttling
- Use sampling strategies effectively
- Monitor collector queue depth

### 8. Data Governance

- Sanitize sensitive data in spans
- Implement PII redaction
- Set appropriate retention periods
- Regular data exports for compliance
- Access control for UI

## Additional Resources

- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTracing Specification](https://opentracing.io/specification/)
- [OpenTelemetry](https://opentelemetry.io/) - Next generation tracing
- [Jaeger Performance Tuning](https://www.jaegertracing.io/docs/latest/performance-tuning/)
- [Sampling Strategies](https://www.jaegertracing.io/docs/latest/sampling/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Jaeger logs: `kubectl logs -l app=jaeger`
3. Check Elasticsearch health: `kubectl exec elasticsearch-0 -- curl localhost:9200/_cluster/health?pretty`
4. Review [Jaeger GitHub Issues](https://github.com/jaegertracing/jaeger/issues)
