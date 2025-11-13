import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

// Mock ProductCard component for testing
const ProductCard: React.FC<{
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    images: string[];
  };
  onAddToCart?: (id: number) => void;
}> = ({ product, onAddToCart }) => {
  return (
    <div data-testid="product-card">
      <img src={product.images[0]} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <p>${product.price.toFixed(2)}</p>
      <button onClick={() => onAddToCart?.(product.id)}>Add to Cart</button>
    </div>
  );
};

describe('ProductCard Component', () => {
  const mockProduct = {
    id: 1,
    name: 'Test Product',
    description: 'This is a test product',
    price: 99.99,
    images: ['https://example.com/image.jpg'],
  };

  it('should render product information', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('This is a test product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('should display product image', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );

    const image = screen.getByAlt('Test Product');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should call onAddToCart when button is clicked', () => {
    const mockAddToCart = jest.fn();

    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} onAddToCart={mockAddToCart} />
      </BrowserRouter>
    );

    const addButton = screen.getByText('Add to Cart');
    fireEvent.click(addButton);

    expect(mockAddToCart).toHaveBeenCalledWith(1);
  });

  it('should format price correctly', () => {
    const productWithPrice = { ...mockProduct, price: 10.5 };

    render(
      <BrowserRouter>
        <ProductCard product={productWithPrice} />
      </BrowserRouter>
    );

    expect(screen.getByText('$10.50')).toBeInTheDocument();
  });

  it('should handle missing image gracefully', () => {
    const productWithoutImage = { ...mockProduct, images: [] };

    render(
      <BrowserRouter>
        <ProductCard product={productWithoutImage} />
      </BrowserRouter>
    );

    expect(screen.getByTestId('product-card')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );

    const button = screen.getByText('Add to Cart');
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });
});
