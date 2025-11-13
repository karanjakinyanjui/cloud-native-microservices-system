# cert-manager Configuration

This directory contains cert-manager configurations for automated SSL/TLS certificate management using Let's Encrypt.

## Overview

cert-manager is a Kubernetes add-on that automates the management and issuance of TLS certificates from various issuing sources. It ensures certificates are valid and up-to-date, and attempts to renew certificates at a configured time before expiry.

## Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured to access your cluster
- Domain names with DNS properly configured
- Helm 3.x (for installation)

## Installation

### 1. Install cert-manager

```bash
# Add the Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0 \
  --set installCRDs=true \
  --set global.leaderElection.namespace=cert-manager

# Or install using kubectl
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### 2. Verify Installation

```bash
# Check cert-manager pods are running
kubectl get pods -n cert-manager

# Expected output:
# NAME                                       READY   STATUS    RESTARTS   AGE
# cert-manager-5d7f97b46d-xxxxx             1/1     Running   0          1m
# cert-manager-cainjector-69d885bf55-xxxxx  1/1     Running   0          1m
# cert-manager-webhook-8d7495f4-xxxxx       1/1     Running   0          1m

# Check cert-manager CRDs are installed
kubectl get crds | grep cert-manager
```

### 3. Configure ClusterIssuers

**Important: Start with staging issuer to avoid rate limits!**

```bash
# Apply staging issuer first (for testing)
kubectl apply -f cluster-issuer-staging.yaml

# Verify staging issuer is ready
kubectl get clusterissuer letsencrypt-staging
kubectl describe clusterissuer letsencrypt-staging

# After successful testing, apply production issuer
kubectl apply -f cluster-issuer-prod.yaml

# Verify production issuer is ready
kubectl get clusterissuer letsencrypt-prod
```

### 4. Update Email Address

**Before applying, edit the issuer files and replace `admin@example.com` with your actual email address!**

```bash
# Edit staging issuer
nano cluster-issuer-staging.yaml
# Change: email: admin@example.com
# To:     email: your-email@your-domain.com

# Edit production issuer
nano cluster-issuer-prod.yaml
# Change: email: admin@example.com
# To:     email: your-email@your-domain.com
```

## Configuration

### ClusterIssuer vs Issuer

- **ClusterIssuer**: Cluster-wide resource, can issue certificates for any namespace
- **Issuer**: Namespace-scoped, can only issue certificates within its namespace

We use ClusterIssuer for flexibility across namespaces.

### HTTP-01 Challenge

Best for most use cases:
- Simple setup, no DNS provider configuration needed
- Works with standard domain names
- Requires port 80 accessible from the internet

```yaml
solvers:
- http01:
    ingress:
      class: nginx
```

### DNS-01 Challenge

Required for wildcard certificates:
- More complex setup, requires DNS provider API credentials
- Works with wildcard domains (*.example.com)
- Can issue certificates for internal domains

#### CloudFlare Example

```yaml
solvers:
- dns01:
    cloudflare:
      email: admin@example.com
      apiTokenSecretRef:
        name: cloudflare-api-token
        key: api-token
```

Create the API token secret:

```bash
# Create CloudFlare API token with Zone:DNS:Edit permissions
kubectl create secret generic cloudflare-api-token \
  --namespace=cert-manager \
  --from-literal=api-token=YOUR_CLOUDFLARE_API_TOKEN
```

#### AWS Route53 Example

```yaml
solvers:
- dns01:
    route53:
      region: us-east-1
      accessKeyID: YOUR_ACCESS_KEY_ID
      secretAccessKeySecretRef:
        name: route53-credentials
        key: secret-access-key
```

Create the credentials secret:

```bash
kubectl create secret generic route53-credentials \
  --namespace=cert-manager \
  --from-literal=secret-access-key=YOUR_AWS_SECRET_ACCESS_KEY
```

## Certificate Management

### Creating Certificates

#### Option 1: Using Certificate Resource (Recommended)

```bash
# Apply certificate configuration
kubectl apply -f certificate.yaml

# Check certificate status
kubectl get certificate
kubectl describe certificate example-com-cert

# View certificate details
kubectl get secret example-com-tls -o yaml
```

#### Option 2: Using Ingress Annotations (Automatic)

Add annotation to your Ingress resource:

```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

cert-manager will automatically create a Certificate resource and manage it.

### Monitoring Certificates

```bash
# List all certificates
kubectl get certificates --all-namespaces

# Check certificate status
kubectl describe certificate example-com-cert

# View certificate events
kubectl get events --field-selector involvedObject.kind=Certificate

# Check certificate ready condition
kubectl get certificate example-com-cert -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'

# View the actual TLS secret
kubectl get secret example-com-tls
kubectl describe secret example-com-tls
```

### Certificate Renewal

cert-manager automatically renews certificates before they expire:
- Default renewal: 15 days before expiry (configurable via `renewBefore`)
- Renewal process is automatic, no manual intervention needed
- Monitor renewal events in certificate status

```bash
# Check renewal time
kubectl get certificate example-com-cert -o jsonpath='{.status.renewalTime}'

# Force renewal (if needed)
kubectl annotate certificate example-com-cert cert-manager.io/issue-temporary-certificate="true" --overwrite
```

## Troubleshooting

### Check cert-manager Logs

```bash
# cert-manager controller logs
kubectl logs -n cert-manager deployment/cert-manager

# cert-manager webhook logs
kubectl logs -n cert-manager deployment/cert-manager-webhook

# cert-manager cainjector logs
kubectl logs -n cert-manager deployment/cert-manager-cainjector
```

### Common Issues

#### 1. Certificate in "Pending" State

```bash
kubectl describe certificate example-com-cert
kubectl describe certificaterequest -n default
kubectl describe order -n default
kubectl describe challenge -n default
```

Common causes:
- DNS not properly configured
- Port 80 not accessible (for HTTP-01)
- Invalid API credentials (for DNS-01)
- Rate limit hit (switch to staging)

#### 2. HTTP-01 Challenge Fails

```bash
# Check challenge details
kubectl get challenges
kubectl describe challenge <challenge-name>

# Verify DNS points to your ingress controller
dig example.com
nslookup example.com

# Test HTTP-01 endpoint accessibility
curl -v http://example.com/.well-known/acme-challenge/test
```

Requirements:
- Domain must resolve to your ingress controller's external IP
- Port 80 must be accessible from the internet
- Ingress controller must be properly configured

#### 3. DNS-01 Challenge Fails

```bash
# Check challenge details
kubectl describe challenge <challenge-name>

# Verify DNS provider credentials
kubectl get secret cloudflare-api-token -n cert-manager
kubectl get secret cloudflare-api-token -n cert-manager -o yaml
```

Common causes:
- Invalid API credentials
- Insufficient API permissions
- DNS provider rate limiting
- Incorrect zone configuration

#### 4. Let's Encrypt Rate Limits

Let's Encrypt production has strict rate limits:
- 50 certificates per registered domain per week
- 5 duplicate certificates per week

Solutions:
- Use staging environment for testing: `letsencrypt-staging`
- Check your rate limit status: https://crt.sh/ (search your domain)
- Wait for rate limit window to reset
- Consider using DNS-01 with wildcard certificates

#### 5. Webhook Connection Issues

```bash
# Check webhook service
kubectl get svc -n cert-manager cert-manager-webhook

# Test webhook connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v https://cert-manager-webhook.cert-manager.svc:443/
```

## Testing with Staging

Always test with staging issuer first:

```bash
# 1. Create ingress with staging annotation
kubectl annotate ingress main-ingress \
  cert-manager.io/cluster-issuer=letsencrypt-staging \
  --overwrite

# 2. Delete existing certificate (if any)
kubectl delete certificate example-com-cert

# 3. Wait for new certificate
kubectl get certificate -w

# 4. Verify certificate (will show staging issuer)
kubectl get secret example-com-tls -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout

# 5. If successful, switch to production
kubectl annotate ingress main-ingress \
  cert-manager.io/cluster-issuer=letsencrypt-prod \
  --overwrite

kubectl delete certificate example-com-cert
kubectl delete secret example-com-tls
```

## Security Best Practices

1. **Protect Private Keys**
   - Never expose private key secrets
   - Use RBAC to restrict access to certificate secrets
   - Enable secret encryption at rest

2. **Use Strong Algorithms**
   - RSA 2048-bit minimum (4096-bit for high security)
   - Consider ECDSA for better performance

3. **Monitor Certificate Expiry**
   - Set up alerts for certificate expiry
   - Monitor cert-manager logs for renewal failures
   - Use Prometheus metrics for monitoring

4. **Rotate Credentials**
   - Regularly rotate DNS provider API tokens
   - Use IAM roles instead of static credentials when possible

5. **Limit Permissions**
   - Grant minimum required permissions to DNS provider credentials
   - Use namespace-scoped Issuers when possible
   - Implement network policies

## Integration with Monitoring

### Prometheus Metrics

cert-manager exposes Prometheus metrics:

```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: cert-manager
  endpoints:
  - port: tcp-prometheus-servicemonitor
    interval: 60s
```

Key metrics:
- `certmanager_certificate_expiration_timestamp_seconds`: Certificate expiry time
- `certmanager_certificate_ready_status`: Certificate ready status
- `certmanager_acme_client_request_count`: ACME API request count

### Alerting Rules

```yaml
# Alert if certificate expires in less than 7 days
- alert: CertificateExpiringSoon
  expr: certmanager_certificate_expiration_timestamp_seconds - time() < 604800
  labels:
    severity: warning
  annotations:
    summary: "Certificate {{ $labels.name }} expiring soon"

# Alert if certificate renewal fails
- alert: CertificateRenewalFailed
  expr: certmanager_certificate_ready_status == 0
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "Certificate {{ $labels.name }} renewal failed"
```

## Useful Commands

```bash
# List all cert-manager resources
kubectl get certificates,certificaterequests,orders,challenges --all-namespaces

# Describe certificate (shows detailed status)
kubectl describe certificate <certificate-name>

# Check certificate secret
kubectl get secret <secret-name> -o yaml

# View certificate details
kubectl get secret <secret-name> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout

# Check certificate expiry
kubectl get secret <secret-name> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates

# Manually trigger certificate renewal
cmctl renew <certificate-name>
# Or using kubectl
kubectl cert-manager renew <certificate-name>

# Check cert-manager version
kubectl get deployment cert-manager -n cert-manager -o jsonpath='{.spec.template.spec.containers[0].image}'

# Approve certificate request manually (if needed)
kubectl certificate approve <certificaterequest-name>
```

## References

- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [cert-manager GitHub](https://github.com/cert-manager/cert-manager)
- [ACME Protocol](https://tools.ietf.org/html/rfc8555)

## Support

For issues and questions:
- Check cert-manager logs: `kubectl logs -n cert-manager deployment/cert-manager`
- Review certificate status: `kubectl describe certificate <name>`
- Visit cert-manager Slack: https://cert-manager.io/docs/contributing/
- GitHub Issues: https://github.com/cert-manager/cert-manager/issues
