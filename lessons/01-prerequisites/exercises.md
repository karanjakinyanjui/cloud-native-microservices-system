# Module 1: Exercises - Prerequisites Setup

## Exercise 1: Verify Node.js Installation

**Objective**: Confirm Node.js and npm are properly installed.

**Tasks**:
1. Check Node.js version
2. Check npm version
3. Create a simple JavaScript file
4. Run it with Node.js

**Steps**:
```bash
# Check versions
node --version
npm --version

# Create hello.js
echo 'console.log("Hello, Node.js!");' > hello.js

# Run the file
node hello.js

# Expected output: Hello, Node.js!
```

**Success Criteria**:
- ✅ Node.js version is 20.x or higher
- ✅ npm version is 10.x or higher
- ✅ JavaScript file runs successfully

---

## Exercise 2: TypeScript Setup and Configuration

**Objective**: Set up a TypeScript project and compile code.

**Tasks**:
1. Create a new project directory
2. Initialize npm project
3. Install TypeScript
4. Create tsconfig.json
5. Write and compile TypeScript code

**Steps**:
```bash
# Create project
mkdir typescript-exercise
cd typescript-exercise

# Initialize npm
npm init -y

# Install TypeScript
npm install -D typescript @types/node

# Create TypeScript config
npx tsc --init

# Create src directory
mkdir src

# Create TypeScript file
cat > src/index.ts << 'EOF'
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: "John Doe",
  email: "john@example.com"
};

console.log(`User: ${user.name} (${user.email})`);
EOF

# Compile TypeScript
npx tsc

# Run compiled JavaScript
node dist/index.js
```

**Success Criteria**:
- ✅ TypeScript compiles without errors
- ✅ Compiled JavaScript runs correctly
- ✅ Type safety is enforced

---

## Exercise 3: Docker Hello World

**Objective**: Run your first Docker container.

**Tasks**:
1. Verify Docker installation
2. Pull and run hello-world image
3. List Docker images and containers
4. Clean up containers

**Steps**:
```bash
# Check Docker
docker --version

# Run hello-world
docker run hello-world

# List images
docker images

# List all containers
docker ps -a

# Remove container
docker rm <container-id>

# Remove image
docker rmi hello-world
```

**Success Criteria**:
- ✅ Hello-world container runs successfully
- ✅ Can list and manage containers
- ✅ Can remove containers and images

---

## Exercise 4: Containerize a Node.js Application

**Objective**: Create a Dockerfile and build your first container.

**Tasks**:
1. Create a simple Express server
2. Write a Dockerfile
3. Build Docker image
4. Run container

**Steps**:
```bash
# Create project
mkdir docker-node-app
cd docker-node-app
npm init -y

# Install dependencies
npm install express

# Create server.js
cat > server.js << 'EOF'
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Docker!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
EOF

# Build image
docker build -t my-node-app .

# Run container
docker run -p 3000:3000 my-node-app

# Test
curl http://localhost:3000
```

**Success Criteria**:
- ✅ Docker image builds successfully
- ✅ Container runs without errors
- ✅ API responds correctly

---

## Exercise 5: Git Setup and Basic Workflow

**Objective**: Configure Git and practice basic commands.

**Tasks**:
1. Configure Git
2. Create a repository
3. Make commits
4. View history

**Steps**:
```bash
# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Create project
mkdir git-exercise
cd git-exercise

# Initialize Git
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
*.log
EOF

# Create README
echo "# My Project" > README.md

# Stage files
git add .

# Commit
git commit -m "Initial commit"

# View history
git log

# Create a new file
echo "console.log('test');" > test.js

# Check status
git status

# Add and commit
git add test.js
git commit -m "Add test file"

# View log
git log --oneline
```

**Success Criteria**:
- ✅ Git is configured
- ✅ Repository is initialized
- ✅ Commits are created
- ✅ Can view history

---

## Exercise 6: Complete TypeScript + Express Application

**Objective**: Build a complete typed Express application.

**Tasks**:
1. Set up TypeScript project
2. Install Express and types
3. Create a typed server
4. Add development scripts

**Steps**:
```bash
# Create project
mkdir typescript-express
cd typescript-express
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
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
EOF

# Create source structure
mkdir -p src/{routes,controllers}

# Create server
cat > src/server.ts << 'EOF'
import express, { Application, Request, Response } from 'express';

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users', (req: Request, res: Response) => {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ];
  res.json(users);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
EOF

# Add scripts
npm pkg set scripts.dev="nodemon --exec ts-node src/server.ts"
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/server.js"

# Run development server
npm run dev
```

**Success Criteria**:
- ✅ TypeScript compiles without errors
- ✅ Server runs in development mode
- ✅ API endpoints respond correctly
- ✅ Types are properly defined

---

## Exercise 7: Docker Compose Setup

**Objective**: Use Docker Compose to run multiple services.

**Tasks**:
1. Create a Node.js application
2. Add PostgreSQL database
3. Write docker-compose.yml
4. Run services together

**Steps**:
```bash
# Create project
mkdir compose-exercise
cd compose-exercise

# Create package.json
npm init -y
npm install express pg

# Create app
cat > server.js << 'EOF'
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'App with database' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/mydb

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
EOF

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Success Criteria**:
- ✅ Both services start successfully
- ✅ Application can connect to database
- ✅ Can view logs from both services
- ✅ Can stop and remove services

---

## Exercise 8: Environment Configuration

**Objective**: Set up environment variables properly.

**Tasks**:
1. Create .env file
2. Use dotenv package
3. Never commit secrets

**Steps**:
```bash
# Create project
mkdir env-exercise
cd env-exercise
npm init -y
npm install dotenv

# Create .env
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/mydb
JWT_SECRET=super-secret-key
API_KEY=test-api-key-123
EOF

# Create .env.example (safe to commit)
cat > .env.example << 'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=
JWT_SECRET=
API_KEY=
EOF

# Create config file
cat > config.js << 'EOF'
require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  database: {
    url: process.env.DATABASE_URL
  },
  jwt: {
    secret: process.env.JWT_SECRET
  },
  api: {
    key: process.env.API_KEY
  }
};
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
*.log
EOF

# Test config
node -e "const config = require('./config'); console.log(config);"
```

**Success Criteria**:
- ✅ Environment variables load correctly
- ✅ .env is in .gitignore
- ✅ .env.example shows required variables
- ✅ Config is type-safe

---

## Exercise 9: VS Code Workspace Setup

**Objective**: Configure VS Code for optimal development.

**Tasks**:
1. Create workspace settings
2. Install recommended extensions
3. Configure debugging

**Steps**:
```bash
# Create project
mkdir vscode-exercise
cd vscode-exercise
npm init -y

# Create .vscode directory
mkdir .vscode

# Create settings.json
cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
EOF

# Create launch.json for debugging
cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug TypeScript",
      "program": "${workspaceFolder}/src/server.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
EOF

# Create extensions.json
cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools"
  ]
}
EOF
```

**Success Criteria**:
- ✅ VS Code settings are applied
- ✅ Recommended extensions show up
- ✅ Debugging configuration works
- ✅ Format on save works

---

## Challenge Exercise: Complete Development Setup

**Objective**: Combine all concepts into a complete setup.

**Tasks**:
1. Create a TypeScript Express application
2. Add PostgreSQL database
3. Containerize with Docker
4. Set up development with Docker Compose
5. Configure environment variables
6. Initialize Git repository

**Requirements**:
- TypeScript with strict mode
- Express server with health check
- Database connection
- Docker multi-stage build
- Docker Compose for local dev
- Proper .gitignore
- Environment configuration
- README with setup instructions

**Success Criteria**:
- ✅ Application runs locally
- ✅ Application runs in Docker
- ✅ Database connection works
- ✅ TypeScript compiles without errors
- ✅ Git repository is clean
- ✅ Documentation is complete

---

## Solutions

Solutions are available in the [../solutions/01-prerequisites/](../solutions/01-prerequisites/) directory. Try to complete the exercises on your own first before checking the solutions.

## Next Steps

Once you've completed these exercises:
1. Review [resources.md](./resources.md) for additional learning materials
2. Proceed to [Module 2: Backend Fundamentals](../02-backend-fundamentals/README.md)
