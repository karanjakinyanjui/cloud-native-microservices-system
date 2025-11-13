# Jaeger Operator Installation Guide

The Jaeger Operator simplifies the deployment and management of Jaeger instances on Kubernetes using Custom Resources.

## Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured
- cert-manager (for webhook certificates)

## Installation Steps

### 1. Install cert-manager (if not already installed)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

Wait for cert-manager to be ready:

```bash
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-webhook -n cert-manager
```

### 2. Install Jaeger Operator

```bash
# Create namespace
kubectl create namespace observability

# Install Jaeger Operator
kubectl create -n observability -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.51.0/jaeger-operator.yaml
```

### 3. Verify Operator Installation

```bash
kubectl get deployment jaeger-operator -n observability
kubectl get pods -n observability
```

### 4. Deploy Jaeger Instance

For production setup with Elasticsearch:

```bash
# First, deploy Elasticsearch
kubectl apply -f ../elasticsearch/

# Wait for Elasticsearch to be ready
kubectl wait --for=condition=ready pod -l app=elasticsearch --timeout=300s

# Deploy production Jaeger instance
kubectl apply -f jaeger-cr.yaml
```

For simple all-in-one setup (development):

```bash
kubectl apply -f jaeger-cr.yaml
```

The operator will automatically create the production Jaeger instance using the CR specification.

### 5. Verify Jaeger Deployment

```bash
# Check Jaeger custom resource
kubectl get jaegers

# Check Jaeger pods
kubectl get pods -l app.kubernetes.io/instance=jaeger-production

# Check services
kubectl get svc -l app.kubernetes.io/instance=jaeger-production
```

## Custom Resource Options

The Jaeger CR supports two main strategies:

### 1. AllInOne (Development)
- Single pod with collector, query, and agent
- In-memory storage
- Not suitable for production

```yaml
spec:
  strategy: allInOne
  storage:
    type: memory
```

### 2. Production (Scalable)
- Separate components (collector, query, agent)
- Elasticsearch backend
- Horizontal scaling support
- High availability

```yaml
spec:
  strategy: production
  storage:
    type: elasticsearch
```

## Configuration Options

### Collector Configuration

```yaml
collector:
  replicas: 3
  maxReplicas: 5
  autoscale: true
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  options:
    collector:
      num-workers: 100
      queue-size: 5000
```

### Query Configuration

```yaml
query:
  replicas: 2
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
  metricsStorage:
    type: prometheus
  ingress:
    enabled: true
    hosts:
    - jaeger.example.com
```

### Agent Configuration

```yaml
agent:
  strategy: DaemonSet  # or Sidecar
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
```

### Sampling Configuration

```yaml
sampling:
  options:
    default_strategy:
      type: probabilistic
      param: 0.5
    service_strategies:
    - service: critical-service
      type: probabilistic
      param: 1.0
```

## Storage Backends

### Elasticsearch (Recommended for Production)

```yaml
storage:
  type: elasticsearch
  options:
    es:
      server-urls: http://elasticsearch:9200
      index-prefix: jaeger
      username: elastic
      password: changeme
  esIndexCleaner:
    enabled: true
    numberOfDays: 7
    schedule: "55 23 * * *"
```

### Cassandra

```yaml
storage:
  type: cassandra
  options:
    cassandra:
      servers: cassandra
      keyspace: jaeger_v1_dc1
```

### Kafka (for streaming)

```yaml
storage:
  type: kafka
  options:
    kafka:
      brokers: kafka:9092
      topic: jaeger-spans
```

## Monitoring with Prometheus

The operator automatically adds Prometheus annotations:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "14269"
```

## Upgrading Jaeger

To upgrade Jaeger version, update the operator:

```bash
kubectl apply -n observability -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.51.0/jaeger-operator.yaml
```

The operator will handle the upgrade of Jaeger instances.

## Uninstalling

To remove a Jaeger instance:

```bash
kubectl delete jaeger jaeger-production
```

To remove the operator:

```bash
kubectl delete -n observability -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.51.0/jaeger-operator.yaml
```

## Troubleshooting

### Check Operator Logs

```bash
kubectl logs -n observability deployment/jaeger-operator
```

### Check Jaeger Instance Status

```bash
kubectl describe jaeger jaeger-production
```

### Common Issues

1. **Webhook certificate issues**: Ensure cert-manager is running
2. **Storage connection issues**: Verify Elasticsearch is accessible
3. **Resource limits**: Adjust resource requests/limits based on load

## Additional Resources

- [Jaeger Operator Documentation](https://github.com/jaegertracing/jaeger-operator)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [API Reference](https://github.com/jaegertracing/jaeger-operator/blob/main/apis/v1/jaeger_types.go)
