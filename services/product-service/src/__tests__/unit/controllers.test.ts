import { Response, NextFunction } from 'express';
import * as productController from '../../controllers/product.controller';
import { Database } from '../../database';
import { AuthRequest } from '../../middleware/auth.middleware';

jest.mock('../../database');
jest.mock('../../utils/logger');
jest.mock('../../utils/metrics', () => ({
  productOperations: { labels: jest.fn(() => ({ inc: jest.fn() })) },
  stockUpdates: { labels: jest.fn(() => ({ inc: jest.fn() })) },
  activeProducts: { set: jest.fn() },
}));

describe('Product Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockDatabase: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 1, email: 'admin@example.com', role: 'admin' },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    mockDatabase = { query: jest.fn() };
    (Database.getInstance as jest.Mock).mockReturnValue(mockDatabase);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listProducts', () => {
    it('should list products with pagination', async () => {
      mockRequest.query = { page: '1', limit: '20' };
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ total: '50' }] })
        .mockResolvedValueOnce({
          rows: Array(20).fill({
            id: 1,
            name: 'Test Product',
            price: 99.99,
            stock_quantity: 10,
          }),
        });

      await productController.listProducts(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            products: expect.any(Array),
            pagination: expect.objectContaining({
              page: 1,
              limit: 20,
              total: 50,
              totalPages: 3,
            }),
          }),
        })
      );
    });

    it('should filter products by search term', async () => {
      mockRequest.query = { search: 'laptop' };
      mockDatabase.query.mockResolvedValue({ rows: [{ total: '5' }] });

      await productController.listProducts(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      const query = mockDatabase.query.mock.calls[0][0];
      expect(query).toContain('ILIKE');
    });

    it('should filter by price range', async () => {
      mockRequest.query = { minPrice: '50', maxPrice: '100' };
      mockDatabase.query.mockResolvedValue({ rows: [{ total: '10' }] });

      await productController.listProducts(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      const params = mockDatabase.query.mock.calls[0][1];
      expect(params).toContain(50);
      expect(params).toContain(100);
    });
  });

  describe('getProduct', () => {
    it('should get product by id', async () => {
      mockRequest.params = { id: '1' };
      const mockProduct = { id: 1, name: 'Test Product', price: 99.99 };
      mockDatabase.query.mockResolvedValue({ rows: [mockProduct] });

      await productController.getProduct(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockProduct,
      });
    });

    it('should return 404 for non-existent product', async () => {
      mockRequest.params = { id: '999' };
      mockDatabase.query.mockResolvedValue({ rows: [] });

      await productController.getProduct(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Product not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('createProduct', () => {
    it('should create product successfully', async () => {
      mockRequest.body = {
        name: 'New Product',
        description: 'Test description',
        price: 99.99,
        stock_quantity: 10,
      };

      const newProduct = { id: 1, ...mockRequest.body };
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [newProduct] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      await productController.createProduct(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: newProduct,
      });
    });

    it('should validate product data', async () => {
      mockRequest.body = {
        name: '',
        price: -10,
      };

      await productController.createProduct(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should validate category exists', async () => {
      mockRequest.body = {
        name: 'Product',
        price: 99.99,
        category_id: 999,
      };

      mockDatabase.query.mockResolvedValueOnce({ rows: [] });

      await productController.createProduct(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Category not found',
        })
      );
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { price: 89.99 };

      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, price: 89.99 }] });

      await productController.updateProduct(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ price: 89.99 }),
      });
    });

    it('should return 404 for non-existent product', async () => {
      mockRequest.params = { id: '999' };
      mockRequest.body = { price: 89.99 };
      mockDatabase.query.mockResolvedValue({ rows: [] });

      await productController.updateProduct(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Product not found',
        })
      );
    });
  });

  describe('updateStock', () => {
    it('should add stock quantity', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { quantity: 10, operation: 'add' };

      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ stock_quantity: 20 }] })
        .mockResolvedValueOnce({ rows: [{ stock_quantity: 30 }] });

      await productController.updateStock(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ stock_quantity: 30 }),
      });
    });

    it('should subtract stock quantity', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { quantity: 5, operation: 'subtract' };

      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ stock_quantity: 20 }] })
        .mockResolvedValueOnce({ rows: [{ stock_quantity: 15 }] });

      await productController.updateStock(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([15, '1'])
      );
    });

    it('should prevent negative stock', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { quantity: 30, operation: 'subtract' };

      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ stock_quantity: 20 }] })
        .mockResolvedValueOnce({ rows: [{ stock_quantity: 0 }] });

      await productController.updateStock(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      // Stock should be capped at 0, not go negative
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([0, '1'])
      );
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      mockRequest.params = { id: '1' };
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await productController.deleteProduct(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product deleted successfully',
      });
    });
  });

  describe('listCategories', () => {
    it('should list all categories', async () => {
      const categories = [
        { id: 1, name: 'Electronics', product_count: '10' },
        { id: 2, name: 'Books', product_count: '5' },
      ];
      mockDatabase.query.mockResolvedValue({ rows: categories });

      await productController.listCategories(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: categories,
      });
    });
  });
});
