# Kubernetes Cheat Sheet

## Common Commands

### Cluster Info
```bash
kubectl cluster-info
kubectl version
kubectl get nodes
kubectl describe node <node-name>
```

### Pods
```bash
# List pods
kubectl get pods
kubectl get pods -o wide
kubectl get pods -n <namespace>
kubectl get pods --all-namespaces

# Describe pod
kubectl describe pod <pod-name>

# Create pod
kubectl run nginx --image=nginx

# Delete pod
kubectl delete pod <pod-name>

# Logs
kubectl logs <pod-name>
kubectl logs -f <pod-name>
kubectl logs <pod-name> --previous

# Execute command
kubectl exec -it <pod-name> -- bash
kubectl exec <pod-name> -- env
```

### Deployments
```bash
# Create deployment
kubectl create deployment nginx --image=nginx
kubectl apply -f deployment.yaml

# List deployments
kubectl get deployments
kubectl describe deployment <name>

# Scale deployment
kubectl scale deployment <name> --replicas=5

# Update image
kubectl set image deployment/<name> <container>=<image>

# Rollout
kubectl rollout status deployment/<name>
kubectl rollout history deployment/<name>
kubectl rollout undo deployment/<name>

# Delete deployment
kubectl delete deployment <name>
```

### Services
```bash
# Create service
kubectl expose deployment <name> --port=80 --target-port=8080
kubectl apply -f service.yaml

# List services
kubectl get services
kubectl get svc

# Describe service
kubectl describe service <name>

# Delete service
kubectl delete service <name>
```

### ConfigMaps & Secrets
```bash
# ConfigMap
kubectl create configmap <name> --from-literal=key=value
kubectl create configmap <name> --from-file=config.txt
kubectl get configmaps
kubectl describe configmap <name>

# Secrets
kubectl create secret generic <name> --from-literal=password=secret
kubectl create secret generic <name> --from-file=ssh-key=~/.ssh/id_rsa
kubectl get secrets
kubectl describe secret <name>
```

### Namespaces
```bash
kubectl get namespaces
kubectl create namespace <name>
kubectl delete namespace <name>
kubectl config set-context --current --namespace=<name>
```

### Apply & Delete
```bash
# Apply
kubectl apply -f <file>
kubectl apply -f <directory>
kubectl apply -k <directory>  # Kustomize

# Delete
kubectl delete -f <file>
kubectl delete pod <name>
kubectl delete deployment <name>
```

### Port Forwarding
```bash
kubectl port-forward pod/<name> 8080:80
kubectl port-forward service/<name> 8080:80
kubectl port-forward deployment/<name> 8080:80
```

### Labels & Selectors
```bash
# Show labels
kubectl get pods --show-labels

# Label resources
kubectl label pod <name> env=prod

# Select by label
kubectl get pods -l env=prod
kubectl get pods -l 'env in (prod,staging)'
```

### Resource Management
```bash
# Get all resources
kubectl get all
kubectl get all -n <namespace>

# Resource usage
kubectl top nodes
kubectl top pods
kubectl top pods -n <namespace>

# Events
kubectl get events
kubectl get events --sort-by='.lastTimestamp'
```

## YAML Manifests

### Pod
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
```

### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
```

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_url: "postgres://localhost:5432/db"
  log_level: "info"
```

### Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
stringData:
  password: "my-secret-password"
```

### Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

## kubectl Tips

### Aliases
```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kgd='kubectl get deployments'
alias kdp='kubectl describe pod'
alias kdd='kubectl describe deployment'
```

### Auto-completion
```bash
# Bash
source <(kubectl completion bash)
echo "source <(kubectl completion bash)" >> ~/.bashrc

# Zsh
source <(kubectl completion zsh)
echo "source <(kubectl completion zsh)" >> ~/.zshrc
```

### Useful Flags
```bash
-n <namespace>    # Specify namespace
--all-namespaces  # All namespaces
-o wide           # More details
-o yaml           # YAML output
-o json           # JSON output
--watch           # Watch for changes
--dry-run=client  # Dry run
```

## Debugging

```bash
# Check pod status
kubectl get pods
kubectl describe pod <name>
kubectl logs <name>

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Check node issues
kubectl describe node <name>

# Resource usage
kubectl top nodes
kubectl top pods

# Network debugging
kubectl run debug --image=nicolaka/netshoot -it --rm
```

## Quick Reference

| Resource | Short Name |
|----------|------------|
| pods | po |
| services | svc |
| deployments | deploy |
| replicasets | rs |
| statefulsets | sts |
| daemonsets | ds |
| configmaps | cm |
| secrets | secret |
| namespaces | ns |
| nodes | no |
| persistentvolumes | pv |
| persistentvolumeclaims | pvc |
