# E-Commerce Frontend

A production-ready React frontend application built with TypeScript, featuring a comprehensive e-commerce platform.

## Tech Stack

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **React Router v6** - Client-side routing
- **Axios** - HTTP client with interceptors
- **TanStack Query (React Query)** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Performant form validation
- **Zod** - Schema validation
- **Lucide Icons** - Beautiful icon library
- **Vite** - Fast build tool

## Features

- User authentication with JWT tokens
- Product browsing with search and filters
- Shopping cart functionality
- Checkout flow with order management
- Order history and tracking
- User profile management
- Responsive design for all devices
- Protected routes for authenticated users
- Optimistic UI updates
- Error handling and loading states

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update the API Gateway URL in .env
VITE_API_GATEWAY_URL=http://localhost:8080/api
```

### Development

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:3000
```

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

### Docker

```bash
# Build Docker image
docker build -t ecommerce-frontend .

# Run container
docker run -p 80:80 ecommerce-frontend
```

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API client and endpoint definitions
│   ├── components/       # Reusable React components
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── store/            # Zustand state stores
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Main app component with routing
│   ├── main.tsx          # Application entry point
│   ├── config.ts         # Configuration settings
│   └── index.css         # Global styles
├── public/               # Static assets
├── Dockerfile            # Multi-stage Docker build
├── nginx.conf            # Nginx configuration for SPA
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Environment Variables

- `VITE_API_GATEWAY_URL` - API Gateway base URL (default: http://localhost:8080/api)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code with ESLint

## API Integration

The frontend integrates with the following microservices through the API Gateway:

- **Auth Service** - User authentication and authorization
- **User Service** - User profile management
- **Product Service** - Product catalog and search
- **Order Service** - Order creation and management
- **Payment Service** - Payment processing

## State Management

- **Zustand** - Cart state, authentication state
- **TanStack Query** - Server data caching, mutations, and synchronization

## Production Deployment

The application is containerized with a multi-stage Docker build:

1. **Build stage** - Compiles TypeScript and bundles assets with Vite
2. **Production stage** - Serves static files with Nginx

Features:
- Gzip compression
- Security headers
- SPA routing support
- Static asset caching
- Health check endpoint
- Optimized for production performance

## License

MIT
