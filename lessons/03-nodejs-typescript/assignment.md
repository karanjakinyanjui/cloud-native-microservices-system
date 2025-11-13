# Module 3: Assignment - Build a Typed Express Server

## Objective

Build a fully typed Express.js server using TypeScript with proper type definitions, interfaces, and error handling. This will demonstrate your understanding of TypeScript's type system and asynchronous programming.

## Requirements

Build a **User Management API** with full TypeScript types:

### Features

1. User CRUD operations
2. Input validation with types
3. Async/await for all operations
4. Error handling with custom error types
5. Type-safe Express middleware
6. Repository pattern with generics

### Endpoints

```typescript
POST   /api/users          # Create user
GET    /api/users          # List users
GET    /api/users/:id      # Get user
PUT    /api/users/:id      # Update user
DELETE /api/users/:id      # Delete user
```

## Project Setup

```bash
mkdir typescript-user-api
cd typescript-user-api
npm init -y

# Install dependencies
npm install express
npm install -D typescript @types/node @types/express ts-node nodemon

# Create TypeScript config
npx tsc --init
```

## Implementation Guide

### 1. Type Definitions

```typescript
// src/types/user.types.ts
export interface User {
  id: number;
  email: string;
  name: string;
  age: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  name: string;
  age: number;
}

export interface UpdateUserDTO {
  email?: string;
  name?: string;
  age?: number;
}

export type UserWithoutDates = Omit<User, 'createdAt' | 'updatedAt'>;
```

### 2. Custom Error Types

```typescript
// src/types/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(400, message);
  }
}
```

### 3. Generic Repository

```typescript
// src/repositories/base.repository.ts
export interface IRepository<T> {
  create(data: Partial<T>): Promise<T>;
  findById(id: number): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}

export class InMemoryRepository<T extends { id: number }> implements IRepository<T> {
  protected items: T[] = [];
  protected nextId = 1;

  async create(data: Partial<T>): Promise<T> {
    const item = {
      ...data,
      id: this.nextId++,
    } as T;
    this.items.push(item);
    return item;
  }

  async findById(id: number): Promise<T | null> {
    return this.items.find(item => item.id === id) || null;
  }

  async findAll(): Promise<T[]> {
    return this.items;
  }

  async update(id: number, data: Partial<T>): Promise<T> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) throw new NotFoundError('Item not found');

    this.items[index] = { ...this.items[index], ...data };
    return this.items[index];
  }

  async delete(id: number): Promise<void> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) throw new NotFoundError('Item not found');
    this.items.splice(index, 1);
  }
}
```

## Complete all sections and submit your working TypeScript server!
