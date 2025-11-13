## Description

<!-- Provide a clear and concise description of the changes in this PR -->

### Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)
- [ ] Documentation update
- [ ] Configuration change
- [ ] Dependency update
- [ ] Infrastructure/DevOps change

## Related Issues

<!-- Link to related issues using #issue_number -->

Fixes #
Closes #
Related to #

## Changes Made

<!-- Provide a detailed list of changes -->

### Services/Components Modified

- [ ] API Gateway
- [ ] Auth Service
- [ ] User Service
- [ ] Product Service
- [ ] Order Service
- [ ] Payment Service
- [ ] Notification Service
- [ ] Frontend
- [ ] Infrastructure/K8s
- [ ] CI/CD Workflows
- [ ] Documentation

### Key Changes

<!-- List the main changes made in this PR -->

1.
2.
3.

## Testing

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] All existing tests pass
- [ ] Test coverage maintained or improved (>80%)

### Manual Testing

<!-- Describe the manual testing you've performed -->

**Test Environment:** <!-- staging/local/other -->

**Test Steps:**
1.
2.
3.

**Test Results:**
<!-- Describe what you tested and the results -->

### Screenshots/Videos

<!-- If applicable, add screenshots or videos to help explain your changes -->

## Security Considerations

<!-- Address any security implications -->

- [ ] No security implications
- [ ] Security review required
- [ ] Secrets/credentials properly managed
- [ ] Input validation implemented
- [ ] Authentication/authorization checks added
- [ ] Security scanning passed

**Security Notes:**
<!-- Add any security-related notes -->

## Database Changes

<!-- If applicable, describe database changes -->

- [ ] No database changes
- [ ] Migration scripts included
- [ ] Rollback plan documented
- [ ] Data migration tested

**Migration Details:**
<!-- Describe database schema changes, data migrations, etc. -->

## Breaking Changes

<!-- If this PR introduces breaking changes, list them here -->

- [ ] No breaking changes
- [ ] API contract changes
- [ ] Configuration changes required
- [ ] Database schema changes
- [ ] Deployment order requirements

**Breaking Changes Details:**
<!-- Describe what breaks and how to migrate -->

## Deployment Notes

<!-- Special deployment instructions or considerations -->

### Deployment Order

- [ ] Standard deployment (all services can deploy in parallel)
- [ ] Specific order required (describe below)

### Configuration Changes

- [ ] No configuration changes required
- [ ] Environment variables updated (update .env.example)
- [ ] Secrets need to be added/updated
- [ ] ConfigMaps/Secrets need updating in K8s

**Configuration Instructions:**
<!-- Provide step-by-step configuration instructions -->

### Rollback Plan

<!-- Describe how to rollback if issues occur -->

## Performance Impact

<!-- Describe any performance implications -->

- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance degradation (explained and acceptable)
- [ ] Load testing performed

**Performance Notes:**
<!-- Add performance-related details -->

## Documentation

<!-- Ensure documentation is up to date -->

- [ ] README updated
- [ ] API documentation updated
- [ ] Architecture diagrams updated (if applicable)
- [ ] Deployment documentation updated
- [ ] CHANGELOG updated
- [ ] Inline code comments added/updated

## Dependencies

<!-- List new dependencies or dependency updates -->

### Added Dependencies

<!-- List any new dependencies and justify their inclusion -->

### Updated Dependencies

<!-- List dependency updates and reason for update -->

### Removed Dependencies

<!-- List removed dependencies -->

## Checklist

<!-- Ensure all items are completed before requesting review -->

### Code Quality

- [ ] Code follows project style guidelines
- [ ] Self-review performed
- [ ] Code is well-commented
- [ ] No console.log or debug code left
- [ ] No commented-out code (unless necessary with explanation)
- [ ] TypeScript types properly defined (no `any` unless justified)
- [ ] Error handling implemented
- [ ] Logging added for important operations

### Testing & CI

- [ ] All CI checks pass
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run build`)
- [ ] Tests pass locally
- [ ] Docker build succeeds
- [ ] Security scanning shows no critical issues

### Review

- [ ] PR is linked to relevant issue(s)
- [ ] PR has appropriate labels
- [ ] PR has clear title and description
- [ ] Reviewers assigned
- [ ] Target branch is correct (develop/main)
- [ ] PR size is reasonable (<500 lines preferred)

### Kubernetes/Infrastructure (if applicable)

- [ ] K8s manifests validated with kubeval
- [ ] Resource limits/requests defined
- [ ] Health checks configured
- [ ] Secrets properly managed
- [ ] Networking/service mesh configured
- [ ] Monitoring/logging configured

## Additional Context

<!-- Add any other context about the PR here -->

## Reviewer Notes

<!-- Any specific areas you'd like reviewers to focus on -->

### Areas of Concern

<!-- Highlight any areas where you'd like extra attention -->

### Questions for Reviewers

<!-- List any specific questions you have for reviewers -->

---

## For Reviewers

### Review Checklist

- [ ] Code logic is sound and efficient
- [ ] Security considerations addressed
- [ ] Error handling is appropriate
- [ ] Tests are comprehensive
- [ ] Documentation is clear and accurate
- [ ] No obvious performance issues
- [ ] Follows architectural patterns
- [ ] No unnecessary complexity
- [ ] Backward compatibility maintained (or breaking changes justified)

### Approval Criteria

- All CI checks must pass
- At least one approval from code owners
- Security review for sensitive changes
- No unresolved conversations

---

**By submitting this PR, I confirm that:**
- I have read and followed the [Contributing Guidelines](../CONTRIBUTING.md)
- My code follows the project's code style and conventions
- I have performed a self-review of my code
- I have tested my changes thoroughly
- I have updated relevant documentation
