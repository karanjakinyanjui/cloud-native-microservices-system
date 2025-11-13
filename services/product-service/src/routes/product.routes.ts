import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  listCategories,
  getCategory,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public routes (require authentication)
router.get('/products', authenticate, listProducts);
router.get('/products/:id', authenticate, getProduct);
router.get('/categories', authenticate, listCategories);
router.get('/categories/:id', authenticate, getCategory);

// Admin routes (require authentication and admin role)
router.post('/products', authenticate, authorize('admin'), createProduct);
router.put('/products/:id', authenticate, authorize('admin'), updateProduct);
router.delete('/products/:id', authenticate, authorize('admin'), deleteProduct);
router.patch('/products/:id/stock', authenticate, authorize('admin'), updateStock);

export default router;
