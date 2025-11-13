# Module 1: Prerequisites & Development Environment Setup

## Overview

Welcome to the first module of the Cloud-Native Microservices course! Before diving into backend development and microservices architecture, we need to establish a solid foundation by setting up your development environment with all the necessary tools and software.

This module will guide you through installing and configuring Node.js, TypeScript, Docker, Git, and other essential tools. By the end of this module, you'll have a fully functional development environment ready for building production-grade microservices.

## Learning Objectives

By the end of this module, you will be able to:

- ✅ Install and configure Node.js 20.x and npm
- ✅ Set up TypeScript for development
- ✅ Install and use Docker for containerization
- ✅ Configure Git for version control
- ✅ Set up a modern code editor (VS Code) with essential extensions
- ✅ Verify all installations through practical exercises
- ✅ Understand the role of each tool in the development workflow

## Why These Tools?

### Node.js
Node.js is a JavaScript runtime built on Chrome's V8 engine. It allows us to run JavaScript on the server side, making it perfect for building scalable network applications. Our entire microservices platform is built with Node.js because of its:

- **Event-driven architecture**: Perfect for handling concurrent connections
- **Non-blocking I/O**: Efficient for microservices that need to handle many requests
- **Large ecosystem**: npm provides millions of packages
- **JavaScript everywhere**: Use the same language for frontend and backend

### TypeScript
TypeScript is a superset of JavaScript that adds static typing. It helps us:

- **Catch errors early**: Type checking during development
- **Better IDE support**: Autocomplete and refactoring
- **Improved code quality**: Self-documenting code with types
- **Easier refactoring**: Confidence when changing code

All our microservices use TypeScript for production-grade code quality.

### Docker
Docker enables containerization, which packages applications with their dependencies. Benefits include:

- **Consistency**: "Works on my machine" becomes "works everywhere"
- **Isolation**: Each service runs in its own container
- **Portability**: Easy to move between environments
- **Scalability**: Containers can be replicated easily

### Git
Git is the industry-standard version control system for:

- **Collaboration**: Multiple developers working together
- **History**: Track all changes to your code
- **Branching**: Work on features independently
- **Backup**: Your code is safely versioned

## Tools Overview

Here's what we'll install and why:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.x LTS | JavaScript runtime for backend |
| **npm** | 10.x | Package manager |
| **TypeScript** | 5.x | Type safety for JavaScript |
| **Docker** | Latest | Containerization platform |
| **Git** | 2.x | Version control |
| **VS Code** | Latest | Code editor |
| **PostgreSQL** | 15.x | Database (optional for local) |

## Installation Guide

### 1. Node.js and npm

Node.js includes npm (Node Package Manager) by default.

#### Windows
```bash
# Download installer from https://nodejs.org/
# Choose LTS version (20.x)
# Run installer and follow prompts
```

#### macOS
```bash
# Using Homebrew
brew install node@20

# Or download from https://nodejs.org/
```

#### Linux (Ubuntu/Debian)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

### 2. TypeScript

Install TypeScript globally:

```bash
npm install -g typescript

# Verify installation
tsc --version  # Should show version 5.x
```

### 3. Docker

#### Windows
```bash
# Download Docker Desktop from https://www.docker.com/products/docker-desktop/
# Install and restart
# Enable WSL2 backend if prompted
```

#### macOS
```bash
# Download Docker Desktop from https://www.docker.com/products/docker-desktop/
# Install and start Docker

# Or using Homebrew
brew install --cask docker
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Add user to docker group (avoid using sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

### 4. Git

#### Windows
```bash
# Download Git from https://git-scm.com/download/win
# Install with default options
```

#### macOS
```bash
# Usually pre-installed, or:
brew install git
```

#### Linux
```bash
sudo apt-get install git
```

#### Git Configuration
```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# Enable color output
git config --global color.ui auto

# Verify configuration
git config --list
```

### 5. VS Code (Recommended)

Download from https://code.visualstudio.com/

#### Essential Extensions

Install these extensions for optimal development experience:

1. **ESLint** - JavaScript/TypeScript linting
2. **Prettier** - Code formatting
3. **Docker** - Docker file support
4. **Kubernetes** - K8s manifest support
5. **GitLens** - Enhanced Git integration
6. **Thunder Client** - API testing
7. **Error Lens** - Inline error display
8. **Path Intellisense** - File path autocomplete
9. **npm Intellisense** - npm package autocomplete
10. **Todo Tree** - TODO comment highlighting

Install extensions:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-azuretools.vscode-docker
code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
```

### 6. Optional Tools

#### PostgreSQL (for local database)
```bash
# macOS
brew install postgresql@15

# Linux
sudo apt-get install postgresql-15

# Windows - Download from https://www.postgresql.org/download/
```

#### Postman or Insomnia
For API testing: https://www.postman.com/ or https://insomnia.rest/

#### kubectl (for later modules)
```bash
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

## Verification Steps

Let's verify everything is installed correctly:

### 1. Check Node.js and npm
```bash
node --version
# Expected: v20.x.x

npm --version
# Expected: 10.x.x

# Test Node.js
node -e "console.log('Node.js is working!')"
# Expected: Node.js is working!
```

### 2. Check TypeScript
```bash
tsc --version
# Expected: Version 5.x.x

# Create a simple TypeScript file
echo 'const message: string = "TypeScript works!"; console.log(message);' > test.ts
tsc test.ts
node test.js
# Expected: TypeScript works!

# Clean up
rm test.ts test.js
```

### 3. Check Docker
```bash
docker --version
# Expected: Docker version 24.x.x or later

docker-compose --version
# Expected: Docker Compose version 2.x.x or later

# Test Docker
docker run hello-world
# Expected: Hello from Docker! (with additional output)
```

### 4. Check Git
```bash
git --version
# Expected: git version 2.x.x

git config user.name
# Expected: Your Name

git config user.email
# Expected: your.email@example.com
```

### 5. Create a Test Project

Let's create a complete test project to verify everything works together:

```bash
# Create project directory
mkdir test-microservice
cd test-microservice

# Initialize npm project
npm init -y

# Install dependencies
npm install express
npm install -D typescript @types/node @types/express ts-node nodemon

# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
EOF

# Create source directory
mkdir src

# Create a simple server
cat > src/server.ts << 'EOF'
import express, { Request, Response } from 'express';

const app = express();
const PORT = 3000;

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from TypeScript + Node.js!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
EOF

# Add scripts to package.json
npm pkg set scripts.dev="nodemon --exec ts-node src/server.ts"
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/server.js"

# Run the server
npm run dev
# Visit http://localhost:3000 in your browser
# Expected: {"message":"Hello from TypeScript + Node.js!"}
```

## Environment Configuration

### Setting Up Environment Variables

Create a `.env` file for configuration:

```bash
# .env file structure
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
LOG_LEVEL=debug
```

Install dotenv for environment management:
```bash
npm install dotenv
```

### Project Structure Best Practices

```
your-microservice/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── middleware/     # Custom middleware
│   ├── utils/          # Utility functions
│   └── server.ts       # Entry point
├── tests/
│   ├── unit/
│   └── integration/
├── dist/               # Compiled JavaScript (gitignored)
├── node_modules/       # Dependencies (gitignored)
├── .env                # Environment variables (gitignored)
├── .gitignore
├── tsconfig.json       # TypeScript configuration
├── package.json        # Project metadata
└── README.md           # Documentation
```

## Troubleshooting

### Common Issues

#### Node.js not found
```bash
# Check if Node.js is in PATH
which node  # macOS/Linux
where node  # Windows

# Reinstall Node.js if needed
```

#### Docker permission denied
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

#### TypeScript not compiling
```bash
# Check tsconfig.json is valid
tsc --showConfig

# Install missing type definitions
npm install -D @types/node
```

#### Port already in use
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

## Best Practices

### 1. Version Management
- Use Node Version Manager (nvm) for managing Node.js versions
- Lock dependency versions in package.json

### 2. Git Workflow
```bash
# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
*.log
.DS_Store
coverage/
EOF

# Initialize repository
git init
git add .
git commit -m "Initial commit"
```

### 3. Code Quality
- Enable ESLint for code linting
- Use Prettier for consistent formatting
- Set up pre-commit hooks with Husky

### 4. Security
- Never commit `.env` files
- Use strong secrets
- Keep dependencies updated: `npm audit` and `npm update`

## Development Workflow

Here's your typical development workflow:

```mermaid
graph LR
    A[Write Code] --> B[Git Commit]
    B --> C[Run Tests]
    C --> D[Build Docker Image]
    D --> E[Deploy to Dev]
    E --> F[Test]
    F --> G{Pass?}
    G -->|Yes| H[Push to Repo]
    G -->|No| A
```

## Next Steps

Now that your environment is set up:

1. ✅ Complete the exercises in [exercises.md](./exercises.md)
2. ✅ Explore the resources in [resources.md](./resources.md)
3. ✅ Verify all tools are working correctly
4. ✅ Clone the main repository and explore the codebase

Once you're confident with your setup, proceed to [Module 2: Backend Development Fundamentals](../02-backend-fundamentals/README.md).

## Quick Reference Commands

```bash
# Node.js
node --version
npm --version
npm init -y
npm install <package>
npm run <script>

# TypeScript
tsc --init
tsc --watch
tsc <file>.ts

# Docker
docker --version
docker images
docker ps
docker run <image>
docker build -t <name> .
docker-compose up

# Git
git init
git status
git add .
git commit -m "message"
git push origin main
git pull
```

## Summary

In this module, you've learned:

- ✅ Why each tool is essential for microservices development
- ✅ How to install Node.js, TypeScript, Docker, and Git
- ✅ How to configure your development environment
- ✅ How to create and run a simple TypeScript project
- ✅ Best practices for project structure and workflow
- ✅ Troubleshooting common issues

With your environment ready, you're now prepared to dive into backend development fundamentals!

## Additional Resources

- [Node.js Official Documentation](https://nodejs.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Docker Getting Started](https://docs.docker.com/get-started/)
- [Git Book](https://git-scm.com/book/en/v2)
- [VS Code Tips and Tricks](https://code.visualstudio.com/docs/getstarted/tips-and-tricks)
