---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: 'bug, needs-triage'
assignees: ''
---

## Bug Description

<!-- A clear and concise description of what the bug is -->

## Affected Service/Component

<!-- Mark the affected service(s) with an "x" -->

- [ ] API Gateway
- [ ] Auth Service
- [ ] User Service
- [ ] Product Service
- [ ] Order Service
- [ ] Payment Service
- [ ] Notification Service
- [ ] Frontend
- [ ] Infrastructure/K8s
- [ ] CI/CD
- [ ] Documentation
- [ ] Other (specify below)

**Other:** <!-- If Other, specify here -->

## Severity

<!-- Mark one -->

- [ ] Critical (system down, data loss, security issue)
- [ ] High (major feature broken, no workaround)
- [ ] Medium (feature partially broken, workaround exists)
- [ ] Low (minor issue, cosmetic)

## Environment

**Environment:**
- [ ] Production
- [ ] Staging
- [ ] Development
- [ ] Local

**Details:**
- OS: <!-- e.g., Ubuntu 22.04, macOS 13.0 -->
- Browser: <!-- e.g., Chrome 120, Firefox 121, Safari 17 (if applicable) -->
- Node.js Version: <!-- e.g., 20.10.0 -->
- Kubernetes Version: <!-- e.g., 1.28.3 (if applicable) -->
- Deployment Version/Commit: <!-- e.g., v1.2.3 or commit SHA -->

## Steps to Reproduce

<!-- Provide detailed steps to reproduce the bug -->

1. Go to '...'
2. Click on '...'
3. Execute command '...'
4. See error

## Expected Behavior

<!-- A clear description of what you expected to happen -->

## Actual Behavior

<!-- A clear description of what actually happened -->

## Error Messages

<!-- Include any error messages, stack traces, or logs -->

```
Paste error messages here
```

## Screenshots/Videos

<!-- If applicable, add screenshots or videos to help explain the problem -->

## Logs

<!-- Include relevant log excerpts from affected services -->

<details>
<summary>Service Logs</summary>

```
Paste logs here
```

</details>

<details>
<summary>Browser Console Logs (if applicable)</summary>

```
Paste browser console output here
```

</details>

## Network Requests

<!-- If applicable, include relevant network request/response details -->

<details>
<summary>Network Details</summary>

**Request:**
```
Method: GET/POST/etc
URL: /api/...
Headers: ...
Body: ...
```

**Response:**
```
Status: 500
Headers: ...
Body: ...
```

</details>

## Database State

<!-- If relevant, describe database state or include queries that show the issue -->

## Recent Changes

<!-- List any recent deployments, configuration changes, or code changes that might be related -->

- Deployment: <!-- e.g., v1.2.3 deployed on 2024-01-15 -->
- Configuration: <!-- e.g., Updated environment variables -->
- Infrastructure: <!-- e.g., Scaled up pods -->

## Frequency

<!-- How often does this occur? -->

- [ ] Always (100%)
- [ ] Often (>50%)
- [ ] Sometimes (10-50%)
- [ ] Rarely (<10%)
- [ ] Once

## Impact

<!-- Describe the impact of this bug -->

**Users Affected:** <!-- e.g., All users, Premium users, Admin users only -->
**Business Impact:** <!-- e.g., Cannot process orders, Cannot login -->
**Workaround Available:** <!-- Yes/No - if yes, describe -->

## Possible Cause

<!-- If you have any idea what might be causing this, describe it here -->

## Suggested Fix

<!-- If you have suggestions for how to fix this, describe them here -->

## Additional Context

<!-- Add any other context about the problem here -->

## Related Issues

<!-- Link to related issues -->

Related to #
Duplicate of #
Blocks #

## Checklist

<!-- Before submitting, ensure: -->

- [ ] I have searched existing issues to avoid duplicates
- [ ] I have included all relevant information
- [ ] I have provided steps to reproduce
- [ ] I have included error messages and logs
- [ ] I have specified the environment
- [ ] I have added appropriate labels
- [ ] I have provided screenshots/videos if applicable

---

## For Maintainers

<!-- Maintainers will fill this section -->

**Priority:** <!-- P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low) -->

**Assigned To:** @

**Sprint:** <!-- Sprint number or N/A -->

**Root Cause Analysis:**
<!-- To be filled after investigation -->

**Fix Plan:**
<!-- To be filled by assigned developer -->

**Testing Plan:**
<!-- How will the fix be tested? -->
