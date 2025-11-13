# Istio Service Mesh Configuration

This directory contains the complete Istio service mesh configuration for the cloud-native microservices system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Deployment](#deployment)
- [Configuration Details](#configuration-details)
- [Traffic Management](#traffic-management)
- [Security](#security)
- [Observability](#observability)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

This service mesh configuration provides:

- **Traffic Management**: Advanced routing, load balancing, retries, timeouts, and circuit breaking
- **Security**: Mutual TLS, authorization policies, and secure service-to-service communication
- **Observability**: Distributed tracing, metrics collection, and access logging
- **Resilience**: Fault injection, circuit breakers, and outlier detection
- **Advanced Deployments**: Canary rollouts, A/B testing, and traffic mirroring

## Architecture

### Service Mesh Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Istio Control Plane                     │
│  (istiod: Pilot, Citadel, Galley)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├──────────────────────┐
                            ▼                      ▼
┌──────────────────────────────────┐   ┌──────────────────────┐
│   Istio Ingress Gateway          │   │  Istio Egress        │
│   (External Traffic Entry)       │   │  (External Services) │
└──────────────────────────────────┘   └──────────────────────┘
                │
                ├─────────────┬──────────────┬──────────────┐
                ▼             ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Frontend │  │   API    │  │  Auth    │  │  User    │
        │ + Sidecar│  │ Gateway  │  │ Service  │  │ Service  │
        └──────────┘  │+ Sidecar │  │+ Sidecar │  │+ Sidecar │
                      └──────────┘  └──────────┘  └──────────┘
```

### Directory Structure

```
k8s/service-mesh/
├── gateway.yaml                          # Istio Gateway (ingress)
├── virtualservices/                      # Traffic routing rules
│   ├── api-gateway-vs.yaml
│   ├── frontend-vs.yaml
│   ├── auth-service-vs.yaml
│   ├── user-service-vs.yaml
│   ├── product-service-vs.yaml
│   ├── order-service-vs.yaml
│   ├── payment-service-vs.yaml
│   └── notification-service-vs.yaml
├── destinationrules/                     # Traffic policies
│   ├── api-gateway-dr.yaml
│   ├── frontend-dr.yaml
│   └── [service]-dr.yaml
├── authorization-policy.yaml             # Access control
├── peer-authentication.yaml              # mTLS configuration
├── service-entry.yaml                    # External services
├── telemetry.yaml                        # Observability config
├── traffic-management/                   # Advanced patterns
│   ├── canary-rollout.yaml
│   ├── ab-testing.yaml
│   └── rate-limiting.yaml
├── kustomization.yaml                    # Kustomize config
└── README.md                             # This file
```

## Prerequisites

### Required Tools

- **Kubernetes cluster** (v1.24+)
- **kubectl** (v1.24+)
- **Istio** (v1.20+)
- **Helm** (v3.12+) - optional, for Istio installation

### Cluster Requirements

- Minimum 4 CPU cores
- Minimum 8 GB RAM
- LoadBalancer support (for ingress gateway)
- DNS resolution configured

## Installation

### Step 1: Install Istio

#### Option A: Using istioctl (Recommended)

```bash
# Download Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.20.0
export PATH=$PWD/bin:$PATH

# Install Istio with default profile
istioctl install --set profile=default -y

# Verify installation
istioctl verify-install
```

#### Option B: Using Helm

```bash
# Add Istio Helm repository
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update

# Create namespace
kubectl create namespace istio-system

# Install Istio base
helm install istio-base istio/base -n istio-system

# Install Istio discovery
helm install istiod istio/istiod -n istio-system --wait

# Install Istio ingress gateway
helm install istio-ingress istio/gateway -n istio-system --wait
```

### Step 2: Enable Istio Injection

```bash
# Label the namespace for automatic sidecar injection
kubectl label namespace default istio-injection=enabled

# Verify label
kubectl get namespace -L istio-injection
```

### Step 3: Install Observability Add-ons (Optional but Recommended)

```bash
# Install Prometheus for metrics
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml

# Install Grafana for visualization
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml

# Install Jaeger for distributed tracing
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml

# Install Kiali for service mesh visualization
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# Wait for deployments to be ready
kubectl rollout status deployment/prometheus -n istio-system
kubectl rollout status deployment/grafana -n istio-system
kubectl rollout status deployment/jaeger -n istio-system
kubectl rollout status deployment/kiali -n istio-system
```

## Deployment

### Deploy Service Mesh Configuration

```bash
# Navigate to service mesh directory
cd k8s/service-mesh

# Deploy using kubectl
kubectl apply -f gateway.yaml
kubectl apply -f virtualservices/
kubectl apply -f destinationrules/
kubectl apply -f authorization-policy.yaml
kubectl apply -f peer-authentication.yaml
kubectl apply -f service-entry.yaml
kubectl apply -f telemetry.yaml

# OR deploy using Kustomize
kubectl apply -k .

# Verify deployment
kubectl get gateway,virtualservice,destinationrule -n default
```

### Create TLS Certificate for Gateway

```bash
# Create self-signed certificate (for testing)
openssl req -x509 -newkey rsa:4096 -keyout tls.key -out tls.crt -days 365 -nodes \
  -subj "/CN=*.example.com"

# Create Kubernetes secret in istio-system namespace
kubectl create -n istio-system secret tls microservices-tls-secret \
  --key=tls.key \
  --cert=tls.crt

# Verify secret
kubectl get secret microservices-tls-secret -n istio-system
```

### Deploy Application Services

```bash
# Deploy your microservices (if not already deployed)
# Istio sidecars will be automatically injected if namespace is labeled

# Restart existing deployments to inject sidecars
kubectl rollout restart deployment -n default

# Verify sidecars are injected (should show 2/2 containers per pod)
kubectl get pods -n default
```

### Get Ingress Gateway Address

```bash
# Get external IP/hostname
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Or for cloud providers that use hostname
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Get ports
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway \
  -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
export SECURE_INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway \
  -o jsonpath='{.spec.ports[?(@.name=="https")].port}')

# Test access
curl -v http://$INGRESS_HOST:$INGRESS_PORT/health
```

## Configuration Details

### Gateway Configuration

The `gateway.yaml` defines ingress points:

- **HTTP** on port 80 (can redirect to HTTPS)
- **HTTPS** on port 443 with TLS termination
- **Internal gateway** for service-to-service communication

### VirtualService Configuration

Each service has a VirtualService defining:

- **Routing rules**: Path-based, header-based, weight-based
- **Timeouts**: Service-specific timeout values
- **Retries**: Configurable retry policies
- **Fault injection**: For testing resilience (disabled by default)

### DestinationRule Configuration

Each service has a DestinationRule defining:

- **Load balancing**: ROUND_ROBIN by default
- **Connection pooling**: TCP and HTTP connection limits
- **Circuit breaking**: Outlier detection and ejection
- **TLS settings**: ISTIO_MUTUAL for service-to-service mTLS
- **Subsets**: Version-based traffic splitting (v1, v2)

### Security Configuration

#### Mutual TLS (peer-authentication.yaml)

- **STRICT mode** for internal services
- **PERMISSIVE mode** for API Gateway and Frontend (allows external traffic)
- Automatic certificate rotation

#### Authorization Policies (authorization-policy.yaml)

- Allow mesh traffic between services
- Deny external access to internal services
- Allow specific service-to-service communication patterns
- Allow health checks from anywhere

## Traffic Management

### Canary Deployments

Deploy new versions gradually:

```bash
# Apply canary configuration
kubectl apply -f traffic-management/canary-rollout.yaml

# Monitor canary metrics
kubectl exec -it $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}') \
  -c istio-proxy -- curl localhost:15000/stats/prometheus | grep istio_requests_total

# Adjust traffic weights in canary-rollout.yaml and reapply
# Phase 1: 10% canary, 90% stable
# Phase 2: 25% canary, 75% stable
# Phase 3: 50% canary, 50% stable
# Phase 4: 75% canary, 25% stable
# Phase 5: 100% canary

# Complete rollout
kubectl apply -f traffic-management/canary-rollout.yaml
```

### A/B Testing

Route traffic based on user attributes:

```bash
# Apply A/B testing configuration
kubectl apply -f traffic-management/ab-testing.yaml

# Test version A (default)
curl http://$INGRESS_HOST/

# Test version B (with cookie)
curl -H "Cookie: experiment=version-b" http://$INGRESS_HOST/

# Test version B (with header)
curl -H "x-user-tier: premium" http://$INGRESS_HOST/
```

### Rate Limiting

Protect services from overload:

```bash
# Apply rate limiting configuration
kubectl apply -f traffic-management/rate-limiting.yaml

# Test rate limit
for i in {1..100}; do
  curl -H "x-user-id: user-123" http://$INGRESS_HOST/api/v1/products
  sleep 0.1
done

# Should receive HTTP 429 (Too Many Requests) when limit exceeded
```

### Traffic Mirroring

Mirror traffic to new version without affecting users:

```bash
# Create traffic mirroring VirtualService
cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service-mirror
spec:
  hosts:
  - product-service
  http:
  - route:
    - destination:
        host: product-service
        subset: v1
      weight: 100
    mirror:
      host: product-service
      subset: v2
    mirrorPercentage:
      value: 10.0
EOF
```

### Fault Injection

Test resilience with controlled failures:

```bash
# Inject delay (test timeout handling)
# Uncomment fault injection in virtualservices/api-gateway-vs.yaml
# - fault.delay.percentage.value: 0.1
# - fault.delay.fixedDelay: 5s

# Inject abort (test error handling)
# - fault.abort.percentage.value: 0.1
# - fault.abort.httpStatus: 500

kubectl apply -f virtualservices/api-gateway-vs.yaml
```

## Security

### Verify mTLS

```bash
# Check PeerAuthentication
kubectl get peerauthentication -n default

# Verify mTLS is enforced
istioctl authn tls-check $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}').default

# Should show "STRICT" for internal services
```

### Verify Authorization Policies

```bash
# Get authorization policies
kubectl get authorizationpolicy -n default

# Test authorization (should succeed)
kubectl exec $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}') \
  -c api-gateway -- curl -s http://user-service:8080/health

# Test unauthorized access (should fail if policies are strict)
```

### Update TLS Certificates

```bash
# Update TLS secret
kubectl create -n istio-system secret tls microservices-tls-secret \
  --key=new-tls.key \
  --cert=new-tls.crt \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart ingress gateway to pick up new certificate
kubectl rollout restart deployment istio-ingressgateway -n istio-system
```

## Observability

### Access Dashboards

#### Kiali (Service Mesh Visualization)

```bash
# Port forward Kiali
kubectl port-forward -n istio-system svc/kiali 20001:20001

# Access at http://localhost:20001
```

#### Grafana (Metrics Visualization)

```bash
# Port forward Grafana
kubectl port-forward -n istio-system svc/grafana 3000:3000

# Access at http://localhost:3000
# Default dashboards: Istio Mesh Dashboard, Istio Service Dashboard
```

#### Jaeger (Distributed Tracing)

```bash
# Port forward Jaeger
kubectl port-forward -n istio-system svc/jaeger-query 16686:16686

# Access at http://localhost:16686
```

#### Prometheus (Metrics)

```bash
# Port forward Prometheus
kubectl port-forward -n istio-system svc/prometheus 9090:9090

# Access at http://localhost:9090
```

### Query Metrics

```bash
# Get metrics from Envoy sidecar
kubectl exec -it $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}') \
  -c istio-proxy -- curl localhost:15000/stats/prometheus

# Common metrics:
# - istio_requests_total
# - istio_request_duration_milliseconds
# - istio_tcp_connections_opened_total
# - istio_tcp_connections_closed_total
```

### View Access Logs

```bash
# View sidecar logs
kubectl logs -l app=api-gateway -c istio-proxy --tail=100 -f

# View service logs with request IDs
kubectl logs -l app=api-gateway -c api-gateway --tail=100 -f
```

## Troubleshooting

### Common Issues

#### 1. Sidecar Not Injected

**Symptoms**: Pods have 1/1 containers instead of 2/2

**Solution**:
```bash
# Verify namespace label
kubectl get namespace default --show-labels

# Add label if missing
kubectl label namespace default istio-injection=enabled

# Restart deployment
kubectl rollout restart deployment <deployment-name>
```

#### 2. Service Unreachable (503 errors)

**Symptoms**: HTTP 503 errors when accessing services

**Solution**:
```bash
# Check VirtualService and DestinationRule
kubectl get virtualservice,destinationrule

# Verify subset labels match pod labels
kubectl get pods --show-labels

# Check if service exists
kubectl get svc

# Verify endpoints
kubectl get endpoints

# Check Envoy configuration
istioctl proxy-config routes $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')
```

#### 3. mTLS Connection Issues

**Symptoms**: Connection refused or TLS handshake errors

**Solution**:
```bash
# Check PeerAuthentication
kubectl get peerauthentication -A

# Verify TLS status
istioctl authn tls-check $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')

# Check DestinationRule TLS mode
kubectl get destinationrule -o yaml | grep -A 5 "tls:"

# Set to PERMISSIVE temporarily for debugging
```

#### 4. Gateway Not Accessible

**Symptoms**: Cannot reach ingress gateway

**Solution**:
```bash
# Check gateway status
kubectl get gateway

# Check ingress gateway service
kubectl get svc istio-ingressgateway -n istio-system

# Verify gateway logs
kubectl logs -l app=istio-ingressgateway -n istio-system

# Check if LoadBalancer has external IP
kubectl get svc istio-ingressgateway -n istio-system -o wide
```

#### 5. High Latency

**Symptoms**: Slow response times

**Solution**:
```bash
# Check circuit breaker status
istioctl proxy-config clusters $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')

# Review timeout and retry settings in VirtualServices
kubectl get virtualservice -o yaml | grep -A 5 "timeout\|retries"

# Check resource limits on sidecars
kubectl get pods -o yaml | grep -A 10 "istio-proxy" | grep -A 5 "resources"

# Increase sidecar resources if needed
```

### Debug Commands

```bash
# Get Istio version
istioctl version

# Analyze configuration issues
istioctl analyze -n default

# Get proxy status
istioctl proxy-status

# Get proxy configuration
istioctl proxy-config all $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')

# Get specific proxy config (routes, clusters, listeners, endpoints)
istioctl proxy-config routes $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')

# Enable debug logging for Envoy
istioctl proxy-config log $(kubectl get pod -l app=api-gateway -o jsonpath='{.items[0].metadata.name}') --level debug

# Describe virtual service issues
kubectl describe virtualservice api-gateway

# Check Istio pilot logs
kubectl logs -n istio-system -l app=istiod
```

### Validation

```bash
# Validate Istio installation
istioctl verify-install

# Validate mesh configuration
istioctl validate -f gateway.yaml
istioctl validate -f virtualservices/
istioctl validate -f destinationrules/

# Check configuration sync status
istioctl proxy-status
```

## Best Practices

### Traffic Management

1. **Always define timeouts**: Prevent cascading failures
2. **Use retries wisely**: Avoid retry storms; use exponential backoff
3. **Implement circuit breakers**: Protect downstream services
4. **Test with fault injection**: Validate resilience before production
5. **Use canary deployments**: Gradually roll out changes
6. **Monitor golden signals**: Latency, traffic, errors, saturation

### Security

1. **Enable mTLS**: Use STRICT mode for internal services
2. **Implement least privilege**: Only allow necessary service-to-service communication
3. **Rotate certificates**: Use short-lived certificates
4. **Secure external traffic**: Use HTTPS with valid certificates
5. **Apply authorization policies**: Control access at service level
6. **Audit regularly**: Review and update policies

### Observability

1. **Enable distributed tracing**: Track requests across services
2. **Collect metrics**: Monitor service health and performance
3. **Centralize logs**: Aggregate logs for analysis
4. **Set up alerts**: Proactive incident detection
5. **Use dashboards**: Visualize service mesh health
6. **Reduce noise**: Filter health check logs

### Performance

1. **Optimize sidecar resources**: Balance overhead vs functionality
2. **Use local rate limiting**: Reduce dependency on external rate limit service
3. **Tune connection pools**: Match expected load
4. **Minimize retries**: Prevent amplification of failures
5. **Cache when possible**: Reduce backend load
6. **Monitor sidecar overhead**: Aim for <5% latency increase

### Operations

1. **Version resources**: Track changes over time
2. **Use GitOps**: Store configurations in version control
3. **Test in staging**: Validate changes before production
4. **Automate deployments**: Use CI/CD pipelines
5. **Document changes**: Maintain runbooks
6. **Plan rollbacks**: Have escape hatches ready

## Additional Resources

- [Istio Documentation](https://istio.io/latest/docs/)
- [Istio Best Practices](https://istio.io/latest/docs/ops/best-practices/)
- [Envoy Documentation](https://www.envoyproxy.io/docs/envoy/latest/)
- [Service Mesh Patterns](https://www.oreilly.com/library/view/istio-up-and/9781492043775/)

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Istio logs: `kubectl logs -n istio-system -l app=istiod`
3. Use `istioctl analyze` for configuration validation
4. Consult the [Istio Community](https://discuss.istio.io/)

## License

This configuration is part of the cloud-native microservices system.
