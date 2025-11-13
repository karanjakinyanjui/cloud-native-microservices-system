# Jaeger Tracing - Quick Start Guide

## Fast Deployment

### Option 1: All-in-One (Development) - 2 minutes

```bash
# Deploy
kubectl apply -f jaeger-all-in-one.yaml

# Wait for ready
kubectl wait --for=condition=ready pod -l app=jaeger --timeout=120s

# Access UI
kubectl port-forward svc/jaeger-query 16686:16686

# Open browser: http://localhost:16686
```

### Option 2: Production Setup - 10 minutes

```bash
# 1. Deploy Elasticsearch (storage backend)
kubectl apply -f elasticsearch/

# 2. Wait for Elasticsearch cluster
kubectl wait --for=condition=ready pod -l app=elasticsearch --timeout=600s

# 3. Deploy Jaeger components
kubectl apply -f jaeger-production/
kubectl apply -f configmap.yaml

# 4. Optional: Add monitoring
kubectl apply -f servicemonitor.yaml
kubectl apply -f hpa.yaml
kubectl apply -f networkpolicy.yaml

# 5. Access UI
kubectl port-forward svc/jaeger-query 80:80

# Open browser: http://localhost:80
```

### Option 3: Kustomize (Recommended) - 5 minutes

```bash
# Deploy everything
kubectl apply -k jaeger-production/

# Verify
kubectl get all -l app=jaeger
kubectl get statefulset elasticsearch
```

## Verify Installation

```bash
# Check all Jaeger pods
kubectl get pods -l app=jaeger

# Expected output:
# NAME                               READY   STATUS    RESTARTS
# jaeger-collector-xxx               1/1     Running   0
# jaeger-collector-xxx               1/1     Running   0
# jaeger-collector-xxx               1/1     Running   0
# jaeger-query-xxx                   1/1     Running   0
# jaeger-query-xxx                   1/1     Running   0
# jaeger-agent-xxx                   1/1     Running   0

# Check Elasticsearch
kubectl get pods -l app=elasticsearch

# Test trace submission
cd examples
chmod +x test-trace.sh
./test-trace.sh --k8s
```

## Access UI

```bash
# Port forward
kubectl port-forward svc/jaeger-query 16686:16686

# Or create ingress for production access
```

## Instrument Your Services

### 1. Add Environment Variables

```yaml
env:
- name: JAEGER_AGENT_HOST
  value: "jaeger-agent"
- name: JAEGER_AGENT_PORT
  value: "6831"
- name: JAEGER_SAMPLER_TYPE
  value: "probabilistic"
- name: JAEGER_SAMPLER_PARAM
  value: "0.5"  # 50% sampling
```

### 2. Add Jaeger Client Library

- Go: `go get github.com/uber/jaeger-client-go`
- Python: `pip install jaeger-client`
- Node.js: `npm install jaeger-client`
- Java: Add Maven dependency

See `examples/README.md` for code examples.

## Quick Test

```bash
# 1. Deploy test service
kubectl apply -f examples/service-instrumentation.yaml

# 2. Generate some traffic
kubectl run curl --image=curlimages/curl -it --rm -- \
  curl http://example-service:8080/api/test

# 3. View traces in UI
# Open: http://localhost:16686
# Select service: example-service
# Click "Find Traces"
```

## Monitor

```bash
# Collector metrics
kubectl port-forward svc/jaeger-collector 14269:14269
curl http://localhost:14269/metrics | grep spans_received

# Elasticsearch health
kubectl exec -it elasticsearch-0 -- \
  curl http://localhost:9200/_cluster/health?pretty

# View Prometheus alerts
kubectl get prometheusrule jaeger-alerts -o yaml
```

## Troubleshooting

### No traces appearing?

```bash
# Check agent
kubectl logs -l component=agent --tail=50

# Check collector
kubectl logs -l component=collector --tail=50

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nc -vz jaeger-agent 6831
```

### High memory usage?

```bash
# Reduce sampling rate in configmap.yaml
# Change param from 0.5 to 0.1

# Reduce collector queue size
kubectl set env deployment/jaeger-collector \
  COLLECTOR_QUEUE_SIZE=2000
```

### Storage full?

```bash
# Trigger manual cleanup
kubectl create job --from=cronjob/jaeger-es-index-cleaner manual-cleanup

# Or reduce retention in configmap.yaml
# Change unit_count from 7 to 3 days
```

## Next Steps

1. Read full documentation: `README.md`
2. Review examples: `examples/README.md`
3. Configure sampling: `configmap.yaml`
4. Set up Grafana integration
5. Configure alerts in Prometheus

## Get Help

- Check logs: `kubectl logs -l app=jaeger`
- View events: `kubectl get events --sort-by='.lastTimestamp'`
- Read docs: `README.md` and `examples/README.md`
- Jaeger docs: https://www.jaegertracing.io/docs/

## Success Criteria

- All pods running: `kubectl get pods -l app=jaeger`
- UI accessible: http://localhost:16686
- Elasticsearch healthy: Green cluster status
- Test trace visible in UI
- Services instrumented and sending traces
