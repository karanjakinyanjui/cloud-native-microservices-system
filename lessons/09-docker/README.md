# Module 9: Docker & Containerization

## Overview

Containers package applications with their dependencies, ensuring consistency across environments. This module covers Docker fundamentals, writing production-ready Dockerfiles, multi-stage builds, and Docker Compose for local development.

## Learning Objectives

- ✅ Understand containerization concepts
- ✅ Write optimized Dockerfiles
- ✅ Implement multi-stage builds
- ✅ Use Docker Compose for multi-container apps
- ✅ Apply container security best practices
- ✅ Optimize image sizes

## Docker Basics

### Key Concepts

**Image**: Read-only template with application code and dependencies
**Container**: Running instance of an image
**Dockerfile**: Instructions to build an image
**Registry**: Storage for images (Docker Hub, ECR, GCR)

### Architecture

```mermaid
graph TB
    DF[Dockerfile] -->|docker build| IMG[Image]
    IMG -->|docker push| REG[Registry]
    REG -->|docker pull| IMG2[Image]
    IMG2 -->|docker run| CONT[Container]
```

## Writing Dockerfiles

### Basic Dockerfile

```dockerfile
# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
```

### Multi-Stage Build (Recommended)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Use non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "dist/server.js"]
```

### Best Practices in Dockerfile

**1. Use Official Base Images**
```dockerfile
FROM node:20-alpine  # Official, minimal
```

**2. Multi-Stage Builds**
```dockerfile
FROM node:20 AS builder
# Build steps...

FROM node:20-alpine
# Copy artifacts from builder
```

**3. Order Layers by Change Frequency**
```dockerfile
# Changes rarely
COPY package*.json ./
RUN npm install

# Changes often
COPY src ./src
```

**4. Use .dockerignore**
```
# .dockerignore
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
dist
*.md
```

**5. Run as Non-Root User**
```dockerfile
RUN adduser -S appuser
USER appuser
```

**6. Use Specific Image Tags**
```dockerfile
FROM node:20.10.0-alpine3.18  # ✅ Specific
FROM node:latest              # ❌ Unpredictable
```

## Docker Commands

```bash
# Build image
docker build -t my-app:1.0.0 .

# Run container
docker run -p 3000:3000 my-app:1.0.0

# Run with environment variables
docker run -e NODE_ENV=production -p 3000:3000 my-app:1.0.0

# Run in detached mode
docker run -d -p 3000:3000 my-app:1.0.0

# View running containers
docker ps

# View all containers
docker ps -a

# View logs
docker logs <container-id>
docker logs -f <container-id>  # Follow logs

# Execute command in container
docker exec -it <container-id> sh

# Stop container
docker stop <container-id>

# Remove container
docker rm <container-id>

# Remove image
docker rmi my-app:1.0.0

# Clean up
docker system prune -a  # Remove all unused containers, images, networks
```

## Docker Compose

### docker-compose.yml

```yaml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - user-service
      - product-service
    networks:
      - microservices

  # User Service
  user-service:
    build: ./services/user-service
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - PORT=3002
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/users
    depends_on:
      - postgres
    networks:
      - microservices

  # Product Service
  product-service:
    build: ./services/product-service
    ports:
      - "3003:3003"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/products
    depends_on:
      - postgres
    networks:
      - microservices

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_MULTIPLE_DATABASES=users,products,orders
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh
    networks:
      - microservices

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - microservices

  # RabbitMQ Message Queue
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=password
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - microservices

volumes:
  postgres-data:
  redis-data:
  rabbitmq-data:

networks:
  microservices:
    driver: bridge
```

### Docker Compose Commands

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# Start specific services
docker-compose up api-gateway user-service

# Build and start
docker-compose up --build

# View logs
docker-compose logs
docker-compose logs -f api-gateway

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers, networks, volumes
docker-compose down -v

# Scale services
docker-compose up -d --scale user-service=3
```

## Image Optimization

### Reduce Image Size

```dockerfile
# ❌ Large image (~1GB)
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "server.js"]

# ✅ Optimized image (~150MB)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

### Layer Caching

```dockerfile
# ❌ Poor caching (code changes invalidate npm install)
COPY . .
RUN npm install

# ✅ Good caching (npm install cached when package.json unchanged)
COPY package*.json ./
RUN npm install
COPY . .
```

## Container Security

### Security Best Practices

**1. Use Official Images**
```dockerfile
FROM node:20-alpine  # Official Node.js image
```

**2. Scan Images for Vulnerabilities**
```bash
docker scan my-app:1.0.0
trivy image my-app:1.0.0
```

**3. Run as Non-Root**
```dockerfile
USER node  # Don't run as root
```

**4. Use Read-Only Filesystem**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY --chown=node:node . .
USER node
# Run with read-only root filesystem
# docker run --read-only my-app
```

**5. Don't Include Secrets**
```dockerfile
# ❌ Never do this
ENV API_KEY=secret123

# ✅ Use runtime environment variables
# docker run -e API_KEY=secret123 my-app
```

**6. Minimize Attack Surface**
```dockerfile
# Use minimal base images
FROM node:20-alpine  # 40MB
# vs
FROM node:20         # 900MB+
```

## Health Checks

```dockerfile
# In Dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Or using Node.js
HEALTHCHECK CMD node healthcheck.js
```

```typescript
// healthcheck.js
const http = require('http');

const options = {
  host: 'localhost',
  port: 3000,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

request.on('error', () => {
  process.exit(1);
});

request.end();
```

## Real-World Example: Our Services

### User Service Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

FROM node:20-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

USER nodejs
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/server.js"]
```

## Summary

- ✅ Container fundamentals
- ✅ Writing production-ready Dockerfiles
- ✅ Multi-stage builds for optimization
- ✅ Docker Compose for local development
- ✅ Container security best practices
- ✅ Image optimization techniques
- ✅ Health checks and monitoring

## Next Steps

1. Complete exercises in [exercises/](./exercises/)
2. Review [dockerfile-guide.md](./dockerfile-guide.md)
3. Complete [assignment.md](./assignment.md)
4. Proceed to [Module 10: Kubernetes](../10-kubernetes/README.md)
