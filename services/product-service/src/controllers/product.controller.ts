import { Response, NextFunction } from 'express';
import Joi from 'joi';
import { Database } from '../database';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { productOperations, stockUpdates, activeProducts } from '../utils/metrics';

const db = Database.getInstance();

// Validation schemas
const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow('', null),
  price: Joi.number().positive().precision(2).required(),
  category_id: Joi.number().integer().positive().allow(null),
  stock_quantity: Joi.number().integer().min(0).default(0),
  images: Joi.array().items(Joi.string().uri()).default([]),
  metadata: Joi.object().default({}),
  is_active: Joi.boolean().default(true),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  description: Joi.string().allow('', null),
  price: Joi.number().positive().precision(2),
  category_id: Joi.number().integer().positive().allow(null),
  stock_quantity: Joi.number().integer().min(0),
  images: Joi.array().items(Joi.string().uri()),
  metadata: Joi.object(),
  is_active: Joi.boolean(),
}).min(1);

const updateStockSchema = Joi.object({
  quantity: Joi.number().integer().required(),
  operation: Joi.string().valid('add', 'subtract', 'set').required(),
});

// List products with pagination, filtering, and search
export const listProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const search = req.query.search as string;
    const category = req.query.category as string;
    const minPrice = parseFloat(req.query.minPrice as string);
    const maxPrice = parseFloat(req.query.maxPrice as string);
    const isActive = req.query.isActive as string;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) || 'DESC';

    let queryConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Search by name or description
    if (search) {
      queryConditions.push(
        `(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Filter by category
    if (category) {
      queryConditions.push(`c.slug = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    // Filter by price range
    if (!isNaN(minPrice)) {
      queryConditions.push(`p.price >= $${paramIndex}`);
      queryParams.push(minPrice);
      paramIndex++;
    }

    if (!isNaN(maxPrice)) {
      queryConditions.push(`p.price <= $${paramIndex}`);
      queryParams.push(maxPrice);
      paramIndex++;
    }

    // Filter by active status
    if (isActive !== undefined) {
      queryConditions.push(`p.is_active = $${paramIndex}`);
      queryParams.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause =
      queryConditions.length > 0 ? `WHERE ${queryConditions.join(' AND ')}` : '';

    // Validate sort column to prevent SQL injection
    const validSortColumns = ['name', 'price', 'created_at', 'stock_quantity'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total matching products
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Fetch products
    const productsQuery = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.category_id,
        c.name as category_name,
        c.slug as category_slug,
        p.stock_quantity,
        p.images,
        p.metadata,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.${sortColumn} ${sortDir}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await db.query(productsQuery, queryParams);

    productOperations.labels('list', 'success').inc();

    res.json({
      success: true,
      data: {
        products: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    productOperations.labels('list', 'error').inc();
    next(error);
  }
};

// Get single product
export const getProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.category_id,
        c.name as category_name,
        c.slug as category_slug,
        p.stock_quantity,
        p.images,
        p.metadata,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    productOperations.labels('get', 'success').inc();

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    productOperations.labels('get', 'error').inc();
    next(error);
  }
};

// Create product (admin only)
export const createProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error, value } = createProductSchema.validate(req.body);

    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    // Check if category exists
    if (value.category_id) {
      const categoryCheck = await db.query(
        'SELECT id FROM categories WHERE id = $1',
        [value.category_id]
      );

      if (categoryCheck.rows.length === 0) {
        throw new AppError('Category not found', 404);
      }
    }

    const query = `
      INSERT INTO products (
        name, description, price, category_id, stock_quantity,
        images, metadata, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(query, [
      value.name,
      value.description,
      value.price,
      value.category_id,
      value.stock_quantity,
      value.images,
      JSON.stringify(value.metadata),
      value.is_active,
    ]);

    // Update active products gauge
    const activeResult = await db.query(
      'SELECT COUNT(*) as count FROM products WHERE is_active = true'
    );
    activeProducts.set(parseInt(activeResult.rows[0].count));

    productOperations.labels('create', 'success').inc();

    logger.info('Product created', {
      productId: result.rows[0].id,
      userId: req.user?.id,
    });

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    productOperations.labels('create', 'error').inc();
    next(error);
  }
};

// Update product (admin only)
export const updateProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { error, value } = updateProductSchema.validate(req.body);

    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    // Check if product exists
    const existingProduct = await db.query('SELECT id FROM products WHERE id = $1', [
      id,
    ]);

    if (existingProduct.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    // Check if category exists (if updating category)
    if (value.category_id) {
      const categoryCheck = await db.query(
        'SELECT id FROM categories WHERE id = $1',
        [value.category_id]
      );

      if (categoryCheck.rows.length === 0) {
        throw new AppError('Category not found', 404);
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    Object.keys(value).forEach((key) => {
      if (key === 'metadata') {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(JSON.stringify(value[key]));
      } else {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value[key]);
      }
      paramIndex++;
    });

    updateValues.push(id);

    const query = `
      UPDATE products
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, updateValues);

    // Update active products gauge if is_active was changed
    if (value.is_active !== undefined) {
      const activeResult = await db.query(
        'SELECT COUNT(*) as count FROM products WHERE is_active = true'
      );
      activeProducts.set(parseInt(activeResult.rows[0].count));
    }

    productOperations.labels('update', 'success').inc();

    logger.info('Product updated', {
      productId: id,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    productOperations.labels('update', 'error').inc();
    next(error);
  }
};

// Delete product (admin only)
export const deleteProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [
      id,
    ]);

    if (result.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    // Update active products gauge
    const activeResult = await db.query(
      'SELECT COUNT(*) as count FROM products WHERE is_active = true'
    );
    activeProducts.set(parseInt(activeResult.rows[0].count));

    productOperations.labels('delete', 'success').inc();

    logger.info('Product deleted', {
      productId: id,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    productOperations.labels('delete', 'error').inc();
    next(error);
  }
};

// Update stock quantity
export const updateStock = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { error, value } = updateStockSchema.validate(req.body);

    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    // Get current stock
    const currentStock = await db.query(
      'SELECT stock_quantity FROM products WHERE id = $1',
      [id]
    );

    if (currentStock.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    let newStock: number;
    const current = currentStock.rows[0].stock_quantity;

    switch (value.operation) {
      case 'add':
        newStock = current + value.quantity;
        break;
      case 'subtract':
        newStock = Math.max(0, current - value.quantity);
        break;
      case 'set':
        newStock = Math.max(0, value.quantity);
        break;
      default:
        throw new AppError('Invalid operation', 400);
    }

    const result = await db.query(
      'UPDATE products SET stock_quantity = $1 WHERE id = $2 RETURNING *',
      [newStock, id]
    );

    stockUpdates.labels(id, 'success').inc();

    logger.info('Stock updated', {
      productId: id,
      operation: value.operation,
      quantity: value.quantity,
      newStock,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    stockUpdates.labels(req.params.id, 'error').inc();
    next(error);
  }
};

// List categories
export const listCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = `
      SELECT
        c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Get category
export const getCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      throw new AppError('Category not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
