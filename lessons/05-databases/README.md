# Module 5: Database Fundamentals

## Overview

Databases are the backbone of any application. This module covers PostgreSQL, SQL fundamentals, ORMs, migrations, and best practices used across our microservices platform. Each service has its own database following the database-per-service pattern.

## Learning Objectives

- ✅ Design normalized database schemas
- ✅ Write efficient SQL queries
- ✅ Use PostgreSQL features effectively
- ✅ Implement ORMs (TypeORM/Prisma)
- ✅ Manage database migrations
- ✅ Handle transactions and concurrency
- ✅ Optimize query performance
- ✅ Implement connection pooling

## PostgreSQL Basics

### Installation and Setup

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Linux
sudo apt-get install postgresql-15

# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ecommerce;

# Connect to database
\c ecommerce
```

### Basic SQL Operations

```sql
-- CREATE TABLE
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  age INTEGER CHECK (age >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INSERT
INSERT INTO users (email, name, age)
VALUES ('john@example.com', 'John Doe', 30);

-- SELECT
SELECT * FROM users;
SELECT id, name, email FROM users WHERE age > 25;

-- UPDATE
UPDATE users
SET name = 'John Updated', updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- DELETE
DELETE FROM users WHERE id = 1;
```

## Schema Design

### Normalization

**First Normal Form (1NF)**:
- Atomic values (no arrays in cells)
- Unique column names
- Each row is unique

**Second Normal Form (2NF)**:
- Must be in 1NF
- No partial dependencies

**Third Normal Form (3NF)**:
- Must be in 2NF
- No transitive dependencies

### Example Schema: E-Commerce

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table (many-to-many relationship)
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

## Relationships

### One-to-Many
```sql
-- One user has many orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  -- ...
);

-- Query with JOIN
SELECT u.name, o.id as order_id, o.total_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.id = 1;
```

### Many-to-Many
```sql
-- Products and orders (through order_items)
SELECT p.name, oi.quantity, oi.price
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.id = 1;
```

## Using ORMs

### TypeORM Example

```typescript
// entities/User.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Order } from './Order';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  age: number;

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Usage
import { AppDataSource } from './data-source';
import { User } from './entities/User';

const userRepository = AppDataSource.getRepository(User);

// Create
const user = userRepository.create({
  email: 'john@example.com',
  name: 'John Doe',
  age: 30
});
await userRepository.save(user);

// Find
const users = await userRepository.find();
const user = await userRepository.findOne({ where: { id: 1 } });

// Update
await userRepository.update(1, { name: 'John Updated' });

// Delete
await userRepository.delete(1);

// With relations
const userWithOrders = await userRepository.findOne({
  where: { id: 1 },
  relations: ['orders']
});
```

## Transactions

```typescript
// TypeORM transaction
await AppDataSource.transaction(async (manager) => {
  const user = await manager.save(User, { email: 'test@example.com', name: 'Test' });
  const order = await manager.save(Order, { userId: user.id, totalAmount: 100 });

  // If any operation fails, entire transaction rolls back
});

// Raw SQL transaction
await AppDataSource.query('BEGIN');
try {
  await AppDataSource.query('INSERT INTO users...');
  await AppDataSource.query('INSERT INTO orders...');
  await AppDataSource.query('COMMIT');
} catch (error) {
  await AppDataSource.query('ROLLBACK');
  throw error;
}
```

## Migrations

```typescript
// migrations/1234567890-CreateUsers.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsers1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment'
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true
          },
          {
            name: 'name',
            type: 'varchar'
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

## Performance Optimization

### Indexes
```sql
-- Create index
CREATE INDEX idx_users_email ON users(email);

-- Composite index
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Unique index
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'john@example.com';
```

### Connection Pooling
```typescript
// TypeORM connection pooling
const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'mydb',
  extra: {
    max: 20, // Maximum pool size
    min: 5,  // Minimum pool size
    idleTimeoutMillis: 30000
  }
});
```

## Best Practices

### 1. Use Prepared Statements
```typescript
// ✅ Safe from SQL injection
const users = await userRepository.find({
  where: { email: userInput }
});

// ❌ Vulnerable to SQL injection
const users = await manager.query(
  `SELECT * FROM users WHERE email = '${userInput}'`
);
```

### 2. Use Transactions for Multiple Operations
```typescript
await AppDataSource.transaction(async (manager) => {
  await manager.decrement(Product, { id: productId }, 'stock', quantity);
  await manager.save(Order, orderData);
  await manager.save(OrderItem, orderItemsData);
});
```

### 3. Index Frequently Queried Columns
```sql
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
```

### 4. Use Database Constraints
```sql
CREATE TABLE users (
  email VARCHAR(255) UNIQUE NOT NULL,
  age INTEGER CHECK (age >= 0 AND age <= 150),
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'suspended'))
);
```

## Summary

- ✅ PostgreSQL setup and basic SQL
- ✅ Database schema design and normalization
- ✅ Relationships (one-to-many, many-to-many)
- ✅ ORMs for type-safe database access
- ✅ Transactions for data consistency
- ✅ Migrations for schema versioning
- ✅ Performance optimization with indexes
- ✅ Security with prepared statements

## Next Steps

1. Complete exercises in [exercises/](./exercises/)
2. Study [schema-design.md](./schema-design.md)
3. Complete [assignment.md](./assignment.md)
4. Proceed to [Module 6: Authentication](../06-authentication/README.md)
