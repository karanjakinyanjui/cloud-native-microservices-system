.PHONY: help install build test lint clean docker-build docker-up docker-down k8s-deploy k8s-destroy

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo '${BLUE}Cloud-Native Microservices E-Commerce Platform${NC}'
	@echo ''
	@echo 'Usage:'
	@echo '  ${GREEN}make${NC} ${YELLOW}<target>${NC}'
	@echo ''
	@echo 'Targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  ${GREEN}%-20s${NC} %s\n", $$1, $$2}'

install: ## Install dependencies for all services
	@echo "${BLUE}Installing dependencies...${NC}"
	@for service in services/*/; do \
		if [ -f $$service/package.json ]; then \
			echo "${GREEN}Installing $$service...${NC}"; \
			cd $$service && npm install && cd ../..; \
		fi \
	done
	@cd frontend && npm install && cd ..
	@echo "${GREEN}✓ Dependencies installed${NC}"

build: ## Build all services
	@echo "${BLUE}Building all services...${NC}"
	@for service in services/*/; do \
		if [ -f $$service/package.json ]; then \
			echo "${GREEN}Building $$service...${NC}"; \
			cd $$service && npm run build && cd ../..; \
		fi \
	done
	@cd frontend && npm run build && cd ..
	@echo "${GREEN}✓ All services built${NC}"

test: ## Run tests for all services
	@echo "${BLUE}Running tests...${NC}"
	@for service in services/*/; do \
		if [ -f $$service/package.json ]; then \
			echo "${GREEN}Testing $$service...${NC}"; \
			cd $$service && npm test && cd ../..; \
		fi \
	done
	@cd frontend && npm test && cd ..
	@echo "${GREEN}✓ All tests passed${NC}"

test-coverage: ## Run tests with coverage
	@echo "${BLUE}Running tests with coverage...${NC}"
	@for service in services/*/; do \
		if [ -f $$service/package.json ]; then \
			echo "${GREEN}Testing $$service with coverage...${NC}"; \
			cd $$service && npm run test:coverage && cd ../..; \
		fi \
	done
	@echo "${GREEN}✓ Coverage reports generated${NC}"

lint: ## Lint all services
	@echo "${BLUE}Linting code...${NC}"
	@for service in services/*/; do \
		if [ -f $$service/package.json ]; then \
			echo "${GREEN}Linting $$service...${NC}"; \
			cd $$service && npm run lint && cd ../..; \
		fi \
	done
	@echo "${GREEN}✓ Linting complete${NC}"

clean: ## Clean build artifacts and dependencies
	@echo "${BLUE}Cleaning...${NC}"
	@find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
	@find . -name "dist" -type d -prune -exec rm -rf '{}' +
	@find . -name "build" -type d -prune -exec rm -rf '{}' +
	@find . -name "coverage" -type d -prune -exec rm -rf '{}' +
	@echo "${GREEN}✓ Cleaned${NC}"

docker-build: ## Build Docker images for all services
	@echo "${BLUE}Building Docker images...${NC}"
	@docker-compose build
	@echo "${GREEN}✓ Docker images built${NC}"

docker-up: ## Start all services with Docker Compose
	@echo "${BLUE}Starting services...${NC}"
	@docker-compose up -d
	@echo "${GREEN}✓ Services started${NC}"
	@echo "${YELLOW}API Gateway: http://localhost:3000${NC}"
	@echo "${YELLOW}Frontend: http://localhost:80${NC}"
	@echo "${YELLOW}Jaeger UI: http://localhost:16686${NC}"

docker-down: ## Stop all services
	@echo "${BLUE}Stopping services...${NC}"
	@docker-compose down
	@echo "${GREEN}✓ Services stopped${NC}"

docker-logs: ## Show logs for all services
	@docker-compose logs -f

docker-ps: ## Show running containers
	@docker-compose ps

k8s-deploy: ## Deploy to Kubernetes
	@echo "${BLUE}Deploying to Kubernetes...${NC}"
	@kubectl apply -k k8s/base/
	@kubectl apply -k k8s/databases/
	@kubectl apply -k k8s/monitoring/
	@kubectl apply -k k8s/tracing/
	@kubectl apply -k k8s/service-mesh/
	@kubectl apply -k k8s/ingress/
	@echo "${GREEN}✓ Deployed to Kubernetes${NC}"

k8s-destroy: ## Destroy Kubernetes resources
	@echo "${RED}Destroying Kubernetes resources...${NC}"
	@kubectl delete -k k8s/base/ || true
	@kubectl delete -k k8s/databases/ || true
	@kubectl delete -k k8s/monitoring/ || true
	@kubectl delete -k k8s/tracing/ || true
	@kubectl delete -k k8s/service-mesh/ || true
	@kubectl delete -k k8s/ingress/ || true
	@echo "${GREEN}✓ Resources destroyed${NC}"

k8s-status: ## Check Kubernetes deployment status
	@echo "${BLUE}Checking Kubernetes status...${NC}"
	@kubectl get all -n ecommerce
	@kubectl get all -n monitoring
	@kubectl get all -n tracing

k8s-logs: ## Show logs from Kubernetes pods
	@kubectl logs -n ecommerce -l app=$(SERVICE) --tail=100 -f

dev: ## Start development environment
	@echo "${BLUE}Starting development environment...${NC}"
	@docker-compose up -d auth-db user-db product-db order-db payment-db notification-db jaeger
	@echo "${GREEN}✓ Development environment started${NC}"
	@echo "${YELLOW}Run services individually with 'npm run dev' in each service directory${NC}"

dev-stop: ## Stop development environment
	@docker-compose down

setup: install ## Complete setup for first-time users
	@echo "${BLUE}Setting up project...${NC}"
	@cp services/auth-service/.env.example services/auth-service/.env || true
	@cp services/user-service/.env.example services/user-service/.env || true
	@cp services/product-service/.env.example services/product-service/.env || true
	@cp services/order-service/.env.example services/order-service/.env || true
	@cp services/payment-service/.env.example services/payment-service/.env || true
	@cp services/notification-service/.env.example services/notification-service/.env || true
	@cp services/api-gateway/.env.example services/api-gateway/.env || true
	@cp frontend/.env.example frontend/.env || true
	@echo "${GREEN}✓ Setup complete${NC}"
	@echo "${YELLOW}Edit .env files with your configuration${NC}"

demo: ## Run full demo environment
	@$(MAKE) docker-down
	@$(MAKE) docker-build
	@$(MAKE) docker-up
	@echo ""
	@echo "${GREEN}✓ Demo environment is running!${NC}"
	@echo ""
	@echo "Access the application:"
	@echo "  ${YELLOW}Frontend:     ${NC}http://localhost:80"
	@echo "  ${YELLOW}API Gateway:  ${NC}http://localhost:3000"
	@echo "  ${YELLOW}Jaeger UI:    ${NC}http://localhost:16686"
	@echo "  ${YELLOW}Auth Service: ${NC}http://localhost:3001/health"
	@echo ""
	@echo "To view logs: ${GREEN}make docker-logs${NC}"
	@echo "To stop:      ${GREEN}make docker-down${NC}"
