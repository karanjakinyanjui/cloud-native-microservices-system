# Ingress Configuration for Cloud-Native Microservices

This directory contains comprehensive Ingress and cert-manager configurations for routing external traffic to your microservices with automatic SSL/TLS certificate management.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [DNS Configuration](#dns-configuration)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)
- [Custom Domain Configuration](#custom-domain-configuration)
- [Advanced Features](#advanced-features)

## Overview

This ingress configuration provides:

- **Nginx Ingress Controller**: High-performance ingress controller with advanced features
- **cert-manager**: Automated SSL/TLS certificate management with Let's Encrypt
- **Multi-domain Support**: Host-based and path-based routing for multiple domains
- **Automatic HTTPS**: Automatic SSL certificate provisioning and renewal
- **Rate Limiting**: Protection against abuse with configurable rate limits
- **Security Headers**: HSTS, CSP, and other security headers
- **WebSocket Support**: Full support for WebSocket connections
- **Custom Error Pages**: Branded error pages for better user experience
- **Monitoring Integration**: Prometheus metrics and Grafana dashboards

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet / Users                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS (443) / HTTP (80)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Load Balancer (Cloud Provider)                 │
│              External IP: xxx.xxx.xxx.xxx                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │
┌───────────────────────▼─────────────────────────────────────┐
│             Nginx Ingress Controller                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  - SSL Termination                                  │   │
│  │  - Rate Limiting                                    │   │
│  │  - Security Headers                                 │   │
│  │  - Load Balancing                                   │   │
│  │  - WebSocket Support                                │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼───────┐ ┌────▼─────┐ ┌──────▼──────┐
│   Frontend    │ │   API    │ │  Monitoring │
│   Service     │ │  Gateway │ │   Services  │
└───────────────┘ └──────────┘ └─────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼───────┐ ┌────▼─────┐ ┌──────▼──────┐
│ User Service  │ │ Product  │ │   Order     │
│               │ │ Service  │ │   Service   │
└───────────────┘ └──────────┘ └─────────────┘

                cert-manager
                     │
                     │ ACME Protocol
                     │
              Let's Encrypt
```

## Directory Structure

```
k8s/ingress/
├── README.md                           # This file
├── ingress.yaml                        # Main ingress resources
├── middleware.yaml                     # Middleware configurations
├── kustomization.yaml                  # Kustomize configuration
│
├── cert-manager/                       # cert-manager configurations
│   ├── README.md                       # cert-manager documentation
│   ├── cluster-issuer-staging.yaml     # Let's Encrypt staging issuer
│   ├── cluster-issuer-prod.yaml        # Let's Encrypt production issuer
│   └── certificate.yaml                # Certificate resources
│
├── nginx-ingress-controller/           # Nginx ingress controller
│   ├── deployment.yaml                 # Controller deployment
│   ├── service.yaml                    # LoadBalancer service
│   ├── configmap.yaml                  # Nginx configuration
│   └── rbac.yaml                       # RBAC resources
│
├── configs/                            # Configuration files
│   ├── custom-snippets.conf            # Custom Nginx snippets
│   └── proxy-headers.conf              # Proxy header configuration
│
└── certs/                              # Certificate placeholders
    ├── placeholder.crt                 # Placeholder certificate
    └── placeholder.key                 # Placeholder key
```

## Prerequisites

Before deploying the ingress configuration, ensure you have:

1. **Kubernetes Cluster**: Version 1.20 or higher
   ```bash
   kubectl version --short
   ```

2. **kubectl**: Kubernetes command-line tool
   ```bash
   kubectl version --client
   ```

3. **Helm** (optional, for easier installation): Version 3.x
   ```bash
   helm version
   ```

4. **Domain Names**: Registered domain(s) with DNS management access
   - example.com
   - api.example.com
   - www.example.com
   - etc.

5. **Cloud Provider Load Balancer**: Your cluster must support LoadBalancer services
   - AWS: Elastic Load Balancer (ELB/NLB/ALB)
   - GCP: Google Cloud Load Balancer
   - Azure: Azure Load Balancer
   - DigitalOcean: DigitalOcean Load Balancer
   - On-premise: MetalLB or similar

## Installation

### Step 1: Install Nginx Ingress Controller

#### Option A: Using kubectl (Recommended)

```bash
# Create namespace
kubectl create namespace ingress-nginx

# Apply RBAC resources
kubectl apply -f nginx-ingress-controller/rbac.yaml

# Apply ConfigMap
kubectl apply -f nginx-ingress-controller/configmap.yaml

# Apply Deployment
kubectl apply -f nginx-ingress-controller/deployment.yaml

# Apply Service
kubectl apply -f nginx-ingress-controller/service.yaml

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

#### Option B: Using Helm

```bash
# Add ingress-nginx repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=3 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set defaultBackend.nodeSelector."kubernetes\.io/os"=linux \
  --set controller.service.externalTrafficPolicy=Local \
  --set controller.metrics.enabled=true \
  --set controller.podAnnotations."prometheus\.io/scrape"=true \
  --set controller.podAnnotations."prometheus\.io/port"=10254
```

#### Option C: Using Kustomize

```bash
# Apply all resources using kustomize
kubectl apply -k .
```

### Step 2: Get LoadBalancer External IP

```bash
# Wait for external IP to be assigned
kubectl get svc nginx-ingress-controller -n ingress-nginx -w

# Example output:
# NAME                       TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)
# nginx-ingress-controller   LoadBalancer   10.0.12.34      203.0.113.10    80:30080/TCP,443:30443/TCP
```

**Important**: Note the EXTERNAL-IP address. You'll need this for DNS configuration.

### Step 3: Install cert-manager

```bash
# Add Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0 \
  --set installCRDs=true \
  --set global.leaderElection.namespace=cert-manager

# Or using kubectl
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager

# Expected output:
# NAME                                       READY   STATUS    RESTARTS   AGE
# cert-manager-xxxxx                         1/1     Running   0          1m
# cert-manager-cainjector-xxxxx              1/1     Running   0          1m
# cert-manager-webhook-xxxxx                 1/1     Running   0          1m
```

### Step 4: Configure cert-manager Issuers

**Important**: Before applying, update email addresses in the issuer files!

```bash
# Edit staging issuer
nano cert-manager/cluster-issuer-staging.yaml
# Change: email: admin@example.com
# To:     email: your-email@your-domain.com

# Edit production issuer
nano cert-manager/cluster-issuer-prod.yaml
# Change: email: admin@example.com
# To:     email: your-email@your-domain.com

# Apply staging issuer first (for testing)
kubectl apply -f cert-manager/cluster-issuer-staging.yaml

# Verify issuer is ready
kubectl get clusterissuer letsencrypt-staging
kubectl describe clusterissuer letsencrypt-staging

# After testing, apply production issuer
kubectl apply -f cert-manager/cluster-issuer-prod.yaml

# Verify production issuer
kubectl get clusterissuer letsencrypt-prod
```

### Step 5: Apply Middleware Configuration

```bash
# Apply middleware configurations
kubectl apply -f middleware.yaml

# Verify resources
kubectl get configmaps,secrets -n default | grep -E "rate-limit|cors|security|auth"
```

### Step 6: Update Domain Names

**Before applying ingress resources, update domain names!**

```bash
# Edit ingress.yaml
nano ingress.yaml

# Replace all instances of:
# - example.com
# - www.example.com
# - api.example.com
# - ws.example.com
# - monitoring.example.com
#
# With your actual domain names

# Edit certificate.yaml
nano cert-manager/certificate.yaml

# Update dnsNames with your domains
```

### Step 7: Apply Ingress Resources

```bash
# Apply certificate resources
kubectl apply -f cert-manager/certificate.yaml

# Apply ingress resources
kubectl apply -f ingress.yaml

# Verify ingress
kubectl get ingress
kubectl describe ingress main-ingress

# Verify certificates
kubectl get certificates
kubectl describe certificate example-com-cert

# Check certificate status
kubectl get certificate example-com-cert -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
```

## DNS Configuration

Configure DNS records to point to your LoadBalancer external IP:

### Step 1: Get External IP

```bash
kubectl get svc nginx-ingress-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
# Or for hostname-based load balancers (like AWS ELB):
kubectl get svc nginx-ingress-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### Step 2: Create DNS Records

Add the following DNS records in your domain registrar or DNS provider:

#### Option A: Using IP Address (most cloud providers)

| Type | Name              | Value           | TTL  |
|------|-------------------|-----------------|------|
| A    | @                 | 203.0.113.10    | 300  |
| A    | www               | 203.0.113.10    | 300  |
| A    | api               | 203.0.113.10    | 300  |
| A    | ws                | 203.0.113.10    | 300  |
| A    | monitoring        | 203.0.113.10    | 300  |

#### Option B: Using CNAME (AWS ELB)

| Type  | Name              | Value                                           | TTL  |
|-------|-------------------|-------------------------------------------------|------|
| CNAME | @                 | abc123.us-east-1.elb.amazonaws.com             | 300  |
| CNAME | www               | abc123.us-east-1.elb.amazonaws.com             | 300  |
| CNAME | api               | abc123.us-east-1.elb.amazonaws.com             | 300  |
| CNAME | ws                | abc123.us-east-1.elb.amazonaws.com             | 300  |
| CNAME | monitoring        | abc123.us-east-1.elb.amazonaws.com             | 300  |

### Step 3: Verify DNS Propagation

```bash
# Check DNS resolution
dig example.com +short
dig www.example.com +short
dig api.example.com +short

# Or using nslookup
nslookup example.com
nslookup api.example.com

# Test with curl (may show certificate errors until cert-manager provisions certificates)
curl -I http://example.com
curl -I http://api.example.com
```

**Note**: DNS propagation can take 5-60 minutes depending on TTL and DNS provider.

## SSL Certificate Setup

### Testing with Staging Environment

**Always test with staging first to avoid Let's Encrypt rate limits!**

```bash
# 1. Update certificate.yaml to use staging issuer
nano cert-manager/certificate.yaml
# Change: name: letsencrypt-prod
# To:     name: letsencrypt-staging

# 2. Apply certificate
kubectl apply -f cert-manager/certificate.yaml

# 3. Monitor certificate issuance
kubectl get certificate -w
kubectl describe certificate example-com-cert

# 4. Check for challenges
kubectl get challenges
kubectl describe challenge <challenge-name>

# 5. Verify certificate is issued
kubectl get certificate example-com-cert -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
# Should return: True

# 6. Test HTTPS endpoint (will show staging certificate warning - this is expected)
curl -v https://example.com
```

### Switching to Production

**Only switch to production after successful staging test!**

```bash
# 1. Delete staging certificate
kubectl delete certificate example-com-cert
kubectl delete secret example-com-tls

# 2. Update certificate.yaml to use production issuer
nano cert-manager/certificate.yaml
# Change: name: letsencrypt-staging
# To:     name: letsencrypt-prod

# 3. Apply production certificate
kubectl apply -f cert-manager/certificate.yaml

# 4. Monitor certificate issuance
kubectl get certificate -w

# 5. Verify production certificate
kubectl get certificate example-com-cert -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'

# 6. Test HTTPS endpoint (should show valid certificate)
curl -v https://example.com
openssl s_client -connect example.com:443 -servername example.com < /dev/null
```

### Troubleshooting Certificate Issues

See [cert-manager/README.md](cert-manager/README.md) for detailed troubleshooting steps.

## Monitoring

### Prometheus Metrics

The Nginx Ingress Controller exposes Prometheus metrics:

```bash
# Port-forward to metrics endpoint
kubectl port-forward -n ingress-nginx svc/nginx-ingress-controller-metrics 10254:10254

# Access metrics
curl http://localhost:10254/metrics
```

Key metrics to monitor:
- `nginx_ingress_controller_requests`: Total number of requests
- `nginx_ingress_controller_request_duration_seconds`: Request duration
- `nginx_ingress_controller_response_size`: Response size
- `nginx_ingress_controller_ssl_expire_time_seconds`: SSL certificate expiry time

### Grafana Dashboards

Import the official Nginx Ingress Controller dashboard:
- Dashboard ID: 9614
- URL: https://grafana.com/grafana/dashboards/9614

```bash
# Access Grafana (if deployed in monitoring namespace)
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Navigate to http://localhost:3000
# Import dashboard: 9614
```

### Logging

View ingress controller logs:

```bash
# Real-time logs
kubectl logs -n ingress-nginx deployment/nginx-ingress-controller -f

# Filter for errors
kubectl logs -n ingress-nginx deployment/nginx-ingress-controller | grep -i error

# Filter for specific domain
kubectl logs -n ingress-nginx deployment/nginx-ingress-controller | grep "example.com"

# View logs from all pods
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=100
```

### Health Checks

```bash
# Check ingress controller health
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx

# Test health endpoint
kubectl port-forward -n ingress-nginx svc/nginx-ingress-controller-metrics 10254:10254
curl http://localhost:10254/healthz

# Check certificate expiry
kubectl get certificates
kubectl get certificate example-com-cert -o jsonpath='{.status.notAfter}'
```

## Troubleshooting

### Common Issues

#### 1. LoadBalancer External IP Pending

**Symptom**: External IP shows `<pending>` indefinitely

```bash
kubectl get svc nginx-ingress-controller -n ingress-nginx
# NAME                       TYPE           CLUSTER-IP      EXTERNAL-IP
# nginx-ingress-controller   LoadBalancer   10.0.12.34      <pending>
```

**Solutions**:
- Check if your cluster supports LoadBalancer services
- For on-premise clusters, install MetalLB:
  ```bash
  kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.7/config/manifests/metallb-native.yaml
  ```
- For testing, change service type to NodePort:
  ```bash
  kubectl patch svc nginx-ingress-controller -n ingress-nginx -p '{"spec":{"type":"NodePort"}}'
  ```

#### 2. Certificate Not Issuing

**Symptom**: Certificate stuck in "Pending" or "False" ready state

```bash
kubectl get certificate
# NAME                READY   SECRET               AGE
# example-com-cert   False   example-com-tls      5m
```

**Debug steps**:
```bash
# 1. Check certificate details
kubectl describe certificate example-com-cert

# 2. Check certificate request
kubectl get certificaterequest
kubectl describe certificaterequest <name>

# 3. Check orders
kubectl get orders
kubectl describe order <name>

# 4. Check challenges
kubectl get challenges
kubectl describe challenge <name>

# 5. Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

**Common causes**:
- DNS not pointing to load balancer
- Port 80 not accessible (HTTP-01 challenge)
- Rate limit hit (use staging issuer)
- Invalid API credentials (DNS-01 challenge)

#### 3. 404 Not Found

**Symptom**: Accessing domain returns 404

**Debug steps**:
```bash
# 1. Check ingress exists
kubectl get ingress
kubectl describe ingress main-ingress

# 2. Check backend service exists
kubectl get svc frontend api-gateway

# 3. Check backend pods are running
kubectl get pods -l app=frontend
kubectl get pods -l app=api-gateway

# 4. Check ingress logs
kubectl logs -n ingress-nginx deployment/nginx-ingress-controller | grep "example.com"

# 5. Test backend directly
kubectl port-forward svc/frontend 8080:80
curl http://localhost:8080
```

#### 4. 502 Bad Gateway

**Symptom**: Accessing domain returns 502

**Common causes**:
- Backend service not running
- Backend service wrong port
- Backend pods not ready

**Debug steps**:
```bash
# 1. Check backend pods
kubectl get pods -l app=frontend
kubectl describe pod <pod-name>

# 2. Check backend service
kubectl get svc frontend
kubectl describe svc frontend

# 3. Check endpoints
kubectl get endpoints frontend

# 4. Test backend connectivity
kubectl run debug --image=curlimages/curl --rm -it -- sh
curl http://frontend:80
```

#### 5. WebSocket Connection Fails

**Symptom**: WebSocket upgrade fails

**Solutions**:
- Ensure WebSocket annotations are present:
  ```yaml
  nginx.ingress.kubernetes.io/websocket-services: "api-gateway"
  nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
  ```
- Check timeout settings:
  ```yaml
  nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
  ```

#### 6. Rate Limiting Too Aggressive

**Symptom**: 429 Too Many Requests errors

**Solutions**:
```bash
# Increase rate limits in ingress annotations
kubectl edit ingress main-ingress

# Update these annotations:
nginx.ingress.kubernetes.io/limit-rps: "200"  # Increase from 100
nginx.ingress.kubernetes.io/limit-rpm: "10000"  # Increase from 5000
```

## Security Best Practices

### 1. SSL/TLS Configuration

✅ **Do**:
- Use TLS 1.2 and 1.3 only
- Use strong cipher suites
- Enable HSTS with long max-age
- Use production certificates only

❌ **Don't**:
- Use self-signed certificates in production
- Allow TLS 1.0 or 1.1
- Disable SSL verification

### 2. Rate Limiting

✅ **Do**:
- Implement rate limiting on all public endpoints
- Use different limits for different tiers (public, authenticated, internal)
- Monitor rate limit violations

❌ **Don't**:
- Disable rate limiting
- Set limits too high
- Use same limits for all endpoints

### 3. Access Control

✅ **Do**:
- Require authentication for sensitive endpoints
- Use IP whitelisting for admin interfaces
- Implement proper RBAC

❌ **Don't**:
- Expose monitoring endpoints publicly
- Use default passwords
- Hardcode credentials

### 4. Headers

✅ **Do**:
- Enable all security headers (HSTS, CSP, etc.)
- Remove server identification headers
- Implement strict CORS policies

❌ **Don't**:
- Allow CORS from `*` in production
- Expose internal headers
- Disable security headers

### 5. Regular Maintenance

✅ **Do**:
- Keep ingress controller updated
- Monitor certificate expiry
- Review access logs regularly
- Test disaster recovery procedures

❌ **Don't**:
- Ignore security updates
- Let certificates expire
- Disable logging

## Custom Domain Configuration

### Adding a New Domain

1. **Update DNS records** to point to LoadBalancer IP

2. **Add domain to certificate.yaml**:
   ```yaml
   spec:
     dnsNames:
     - example.com
     - www.example.com
     - newdomain.com  # Add new domain
   ```

3. **Add ingress rule**:
   ```yaml
   spec:
     tls:
     - hosts:
       - newdomain.com
       secretName: example-com-tls
     rules:
     - host: newdomain.com
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: my-service
               port:
                 number: 80
   ```

4. **Apply changes**:
   ```bash
   kubectl apply -f cert-manager/certificate.yaml
   kubectl apply -f ingress.yaml
   ```

### Using Wildcard Certificates

Wildcard certificates require DNS-01 challenge (see cert-manager/README.md):

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-cert
spec:
  secretName: wildcard-tls
  dnsNames:
  - "*.example.com"
  - example.com
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
```

## Advanced Features

### 1. Custom Error Pages

Customize error pages by editing the custom-error-pages deployment:

```bash
kubectl edit deployment custom-error-pages -n default
```

Available themes: ghost, l7-light, l7-dark, shuffle, noise, hacker-terminal

### 2. Request Authentication

Enable basic auth for specific paths:

```yaml
nginx.ingress.kubernetes.io/auth-type: "basic"
nginx.ingress.kubernetes.io/auth-secret: "basic-auth-secret"
nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
```

### 3. Request Rewriting

Rewrite request paths:

```yaml
nginx.ingress.kubernetes.io/rewrite-target: /$2
```

Example:
```yaml
path: /api(/|$)(.*)  # Matches /api/foo
# Rewrites to: /foo (removes /api prefix)
```

### 4. Canary Deployments

Enable canary deployments with weighted traffic:

```yaml
nginx.ingress.kubernetes.io/canary: "true"
nginx.ingress.kubernetes.io/canary-weight: "20"  # 20% traffic to canary
```

### 5. Custom Nginx Configuration

Add custom Nginx directives:

```yaml
nginx.ingress.kubernetes.io/configuration-snippet: |
  more_set_headers "X-Custom-Header: value";
  rewrite ^/old-path(.*)$ /new-path$1 permanent;
```

### 6. External Authentication

Integrate with external auth services (OAuth2, OIDC):

```yaml
nginx.ingress.kubernetes.io/auth-url: "https://auth.example.com/verify"
nginx.ingress.kubernetes.io/auth-signin: "https://auth.example.com/start"
```

## Useful Commands

```bash
# View all ingress resources
kubectl get ingress --all-namespaces

# Describe ingress
kubectl describe ingress main-ingress

# Get ingress controller logs
kubectl logs -n ingress-nginx deployment/nginx-ingress-controller -f

# Get certificate status
kubectl get certificates
kubectl describe certificate example-com-cert

# Check certificate secret
kubectl get secret example-com-tls -o yaml

# Test ingress from inside cluster
kubectl run test --image=curlimages/curl --rm -it -- sh
curl http://nginx-ingress-controller.ingress-nginx.svc.cluster.local

# Reload ingress controller
kubectl rollout restart deployment/nginx-ingress-controller -n ingress-nginx

# Scale ingress controller
kubectl scale deployment/nginx-ingress-controller -n ingress-nginx --replicas=5

# Get ingress controller version
kubectl get deployment nginx-ingress-controller -n ingress-nginx -o jsonpath='{.spec.template.spec.containers[0].image}'

# Export ingress configuration
kubectl get ingress main-ingress -o yaml > ingress-backup.yaml

# Validate ingress syntax
kubectl apply --dry-run=client -f ingress.yaml
```

## Performance Tuning

### 1. Connection Pooling

```yaml
nginx.ingress.kubernetes.io/upstream-keepalive-connections: "100"
nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"
```

### 2. Buffer Sizes

```yaml
nginx.ingress.kubernetes.io/proxy-buffer-size: "8k"
nginx.ingress.kubernetes.io/proxy-buffers-number: "4"
```

### 3. Compression

```yaml
nginx.ingress.kubernetes.io/enable-brotli: "true"
nginx.ingress.kubernetes.io/use-gzip: "true"
nginx.ingress.kubernetes.io/gzip-level: "5"
```

### 4. Resource Limits

Adjust HPA settings for auto-scaling:

```bash
kubectl edit hpa nginx-ingress-controller-hpa -n ingress-nginx
```

## References

- [Nginx Ingress Controller Documentation](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Kubernetes Ingress Documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)

## Support

For issues and questions:
- Check logs: `kubectl logs -n ingress-nginx deployment/nginx-ingress-controller`
- Review ingress status: `kubectl describe ingress <name>`
- Check certificate status: `kubectl describe certificate <name>`
- Visit Kubernetes Slack: #ingress-nginx channel

## License

This configuration is provided as-is for the cloud-native microservices project.
