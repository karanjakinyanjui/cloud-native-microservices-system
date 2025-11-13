# GitHub Actions CI/CD Pipeline Documentation

This directory contains the complete CI/CD pipeline configuration for the Cloud-Native Microservices Platform.

## Overview

Our pipeline implements a comprehensive DevOps workflow with:
- Continuous Integration (CI)
- Continuous Deployment (CD)
- Automated testing
- Security scanning
- Release management
- Resource cleanup

## Workflows

### 1. Continuous Integration (`ci.yml`)

**Trigger:** Push to `main`/`develop` branches and pull requests

**Purpose:** Validates code quality and builds artifacts

**Features:**
- Change detection (only builds affected services)
- Matrix builds for all 7 microservices + frontend
- Code linting with ESLint
- TypeScript compilation checks
- Unit testing with coverage reporting
- Docker image building
- Security scanning with Trivy
- Push images to GitHub Container Registry (ghcr.io)
- Dependency caching for faster builds

**Status Badge:**
```markdown
![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)
```

**Key Jobs:**
- `detect-changes`: Identifies which services have changed
- `lint-and-test-services`: Runs linting and tests for each service
- `build-and-scan-services`: Builds Docker images and scans for vulnerabilities
- `ci-success`: Final status check

### 2. Continuous Deployment (`cd.yml`)

**Trigger:** Push to `main` (production) or `develop` (staging), or manual dispatch

**Purpose:** Deploys services to Kubernetes environments

**Features:**
- Environment-specific deployments (staging/production)
- Version tagging with date and commit SHA
- Docker image building and pushing
- Kubernetes manifest updates
- Progressive rollout with health checks
- Smoke tests after deployment
- Automatic rollback on failure
- Slack/Discord notifications

**Environments:**
- `staging`: Automatically deployed from `develop` branch
- `production`: Automatically deployed from `main` branch

**Key Jobs:**
- `setup`: Determines environment and generates version
- `build-and-push`: Builds and pushes versioned Docker images
- `update-manifests`: Updates K8s manifests with new image tags
- `deploy-to-kubernetes`: Deploys to target cluster
- `smoke-tests`: Validates deployment
- `rollback`: Reverts on failure

### 3. Pull Request Checks (`pr-checks.yml`)

**Trigger:** PR creation, synchronization, or reopening

**Purpose:** Ensures PR quality before merging

**Features:**
- Changed file detection
- Code linting with annotations
- Unit tests with coverage thresholds (80% minimum)
- Docker build verification
- Security vulnerability scanning
- Dependency auditing
- Kubernetes manifest validation
- Breaking change detection
- PR size checking
- Automated status comments

**Key Jobs:**
- `detect-changes`: Identifies affected components
- `lint-services`: Lints code and annotates results
- `test-services`: Runs tests and checks coverage
- `docker-build-check`: Verifies Docker builds
- `security-scan`: Scans for vulnerabilities
- `pr-comment`: Posts summary to PR

### 4. Release Workflow (`release.yml`)

**Trigger:** Git tags matching `v*.*.*` pattern (e.g., `v1.0.0`)

**Purpose:** Creates production releases with proper versioning

**Features:**
- Semantic version validation
- Full test suite execution
- Multi-tag Docker images (major, minor, full, stable, latest)
- Automatic changelog generation
- GitHub release creation
- Production deployment
- Rollback point creation
- Release notifications

**Usage:**
```bash
# Create and push a release tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

**Key Jobs:**
- `validate-release`: Validates version format
- `run-tests`: Executes full test suite
- `build-and-push-release`: Builds versioned images
- `generate-changelog`: Creates release notes
- `create-github-release`: Publishes GitHub release
- `deploy-to-production`: Deploys to production
- `post-release-tests`: Validates production deployment

### 5. Security Scanning (`security-scan.yml`)

**Trigger:** Daily schedule (2 AM UTC), push to main/develop, or manual

**Purpose:** Identifies security vulnerabilities

**Features:**
- NPM dependency auditing
- Snyk vulnerability scanning
- CodeQL SAST analysis
- Docker image scanning with Trivy
- Secret scanning with TruffleHog
- OSV vulnerability database scanning
- License compliance checking
- Automated issue creation for vulnerabilities
- Security team notifications

**Schedule:** Daily at 2:00 AM UTC

**Key Jobs:**
- `dependency-scan`: NPM audit for all services
- `snyk-scan`: Snyk security analysis
- `codeql-analysis`: Static application security testing
- `docker-image-scan`: Container vulnerability scanning
- `secret-scan`: Detects leaked secrets
- `license-check`: Validates license compliance
- `security-report`: Aggregates findings and creates issues

### 6. Cleanup (`cleanup.yml`)

**Trigger:** Weekly schedule (Sunday 3 AM UTC) or manual

**Purpose:** Removes old artifacts and saves storage costs

**Features:**
- Old Docker image cleanup (keeps 30 days + minimum 5)
- Workflow run cleanup (keeps 90 days)
- Artifact cleanup (keeps 30 days)
- GitHub Actions cache cleanup (keeps 7 days)
- Test namespace cleanup (keeps 7 days)
- Closed PR environment cleanup
- Cleanup reports

**Schedule:** Weekly on Sundays at 3:00 AM UTC

**Key Jobs:**
- `cleanup-old-packages`: Removes old container images
- `cleanup-workflow-runs`: Deletes old workflow runs
- `cleanup-artifacts`: Removes old artifacts
- `cleanup-cache`: Clears old cache entries
- `cleanup-test-namespaces`: Removes test environments
- `cleanup-report`: Generates cleanup summary

### 7. End-to-End Tests (`e2e-tests.yml`)

**Trigger:** Daily schedule (6 AM UTC) or manual

**Purpose:** Validates complete system functionality

**Features:**
- Dedicated test environment creation
- Full service deployment
- Smoke tests (health checks, basic flows)
- Integration tests (complete user journeys)
- Performance tests with k6
- Load testing
- Automated cleanup
- Test reports and notifications

**Schedule:** Daily at 6:00 AM UTC

**Test Suites:**
- **Smoke**: Basic health checks and critical paths
- **Integration**: Complete user workflows
- **Performance**: Load and stress testing

**Key Jobs:**
- `setup-test-environment`: Creates isolated test namespace
- `smoke-tests`: Basic functionality validation
- `integration-tests`: End-to-end user journeys
- `performance-tests`: Load testing with k6
- `test-report`: Aggregates results
- `cleanup-test-environment`: Removes test infrastructure

## Secrets and Variables

### Required Secrets

Configure these in GitHub Settings > Secrets and Variables > Actions:

```yaml
# Container Registry
GITHUB_TOKEN: # Automatically provided by GitHub Actions

# Kubernetes
KUBE_CONFIG: # Base64-encoded kubeconfig file

# Security Scanning (Optional)
CODECOV_TOKEN: # For coverage reporting
SNYK_TOKEN: # For Snyk scanning

# Notifications (Optional)
SLACK_WEBHOOK_URL: # For Slack notifications
SLACK_SECURITY_WEBHOOK_URL: # For security alerts
DISCORD_WEBHOOK_URL: # For Discord notifications
```

### Setting up Secrets

```bash
# Example: Add Kubernetes config
kubectl config view --raw | base64 | gh secret set KUBE_CONFIG

# Example: Add Slack webhook
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

## Environment Configuration

### Staging Environment
- Branch: `develop`
- Namespace: `staging`
- URL: `https://staging.app.example.com`
- Auto-deploy: Yes

### Production Environment
- Branch: `main`
- Namespace: `production`
- URL: `https://app.example.com`
- Auto-deploy: Yes (with manual approval option)
- Protection rules: Required

## Caching Strategy

We use multiple caching layers:

1. **NPM Dependencies**: Cached by service and package-lock.json hash
2. **Docker Layers**: GitHub Actions cache for build layers
3. **Test Results**: Cached for faster reruns

Cache invalidation occurs when:
- Dependencies change (package-lock.json)
- Dockerfile is modified
- Cache is older than 7 days (automatic cleanup)

## Best Practices

### Workflow Development

1. **Test locally first**: Use `act` to test workflows locally
   ```bash
   act -j ci
   ```

2. **Use matrix strategies**: Parallelize jobs when possible
   ```yaml
   strategy:
     matrix:
       service: [api-gateway, auth-service, ...]
   ```

3. **Fail fast when appropriate**: Use `fail-fast: true` for critical checks

4. **Add status checks**: Protect branches with required status checks

### Performance Optimization

1. **Change detection**: Only build affected services
2. **Parallel execution**: Run independent jobs concurrently
3. **Caching**: Cache dependencies and build layers
4. **Artifact reuse**: Share artifacts between jobs

### Security Best Practices

1. **Minimal permissions**: Use least-privilege GITHUB_TOKEN permissions
2. **Secret scanning**: Never commit secrets
3. **Dependabot**: Enable for automated dependency updates
4. **Security scanning**: Run regularly on schedule
5. **SBOM generation**: Track software bill of materials

## Monitoring and Alerting

### Workflow Monitoring

- Check workflow status: https://github.com/<owner>/<repo>/actions
- View workflow runs: Filter by workflow, branch, status
- Download logs and artifacts

### Alerting

Notifications are sent to:
- Slack (general updates)
- Discord (alternative channel)
- GitHub Issues (security vulnerabilities)
- Email (workflow failures - configure in GitHub settings)

## Troubleshooting

### Common Issues

**Build failures:**
```bash
# Check logs in GitHub Actions UI
# Re-run failed jobs
# Verify secrets are set correctly
```

**Docker image push failures:**
```bash
# Verify GITHUB_TOKEN has packages:write permission
# Check image tag format
# Verify registry URL
```

**Deployment failures:**
```bash
# Verify KUBE_CONFIG secret
# Check cluster connectivity
# Validate manifest syntax: kubeval k8s/**/*.yaml
```

**Cache issues:**
```bash
# Clear cache manually in Actions settings
# Or wait for automatic 7-day expiration
```

### Debug Mode

Enable debug logging:
```yaml
env:
  ACTIONS_RUNNER_DEBUG: true
  ACTIONS_STEP_DEBUG: true
```

## Metrics and KPIs

Track these key metrics:

- **Build time**: Average time from commit to deployment
- **Success rate**: Percentage of successful deployments
- **MTTR**: Mean time to recovery from failures
- **Test coverage**: Code coverage percentage
- **Security vulnerabilities**: Number and severity
- **Deployment frequency**: Deployments per day/week

## Status Badges

Add to your README:

```markdown
![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)
![CD](https://github.com/<owner>/<repo>/actions/workflows/cd.yml/badge.svg)
![Security](https://github.com/<owner>/<repo>/actions/workflows/security-scan.yml/badge.svg)
![E2E Tests](https://github.com/<owner>/<repo>/actions/workflows/e2e-tests.yml/badge.svg)
```

## Contributing

When modifying workflows:

1. Test locally with `act` when possible
2. Update this documentation
3. Test in a feature branch first
4. Use workflow_dispatch for manual testing
5. Monitor first few runs after changes

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes CI/CD](https://kubernetes.io/docs/tasks/configure-pod-container/)
- [Security Best Practices](https://docs.github.com/en/actions/security-guides)

## Support

For issues or questions:
- Create an issue in this repository
- Contact the DevOps team
- Check workflow logs for error details
