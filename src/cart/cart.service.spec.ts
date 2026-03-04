import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockProduct = {
  id: 'product-123',
  name: 'Headphones',
  price: 99.99,
  stock: 50,
  categoryId: 'category-123',
  description: null,
  createdAt: new Date(),
};

const mockCart = {
  id: 'cart-123',
  userId: 'user-123',
};

const mockCartItem = {
  id: 'cartitem-123',
  cartId: 'cart-123',
  productId: 'product-123',
  variantId: null,
  quantity: 2,
};

const mockCartWithItems = {
  ...mockCart,
  items: [{ ...mockCartItem, product: mockProduct }],
};

const mockPrismaService = {
  cart: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  cartItem: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
  },
};

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  // getCart 
  describe('getCart', () => {
    it('should return cart with items', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCartWithItems);

      const result = await service.getCart('user-123');

      expect(result).toEqual(mockCartWithItems);
      expect(mockPrismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: { items: { include: { product: true } } },
      });
    });

    it('should throw NotFoundException if cart does not exist', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      await expect(service.getCart('user-123')).rejects.toThrow(NotFoundException);
    });
  });

  // addItem
  describe('addItem', () => {
    it('should create cart if it does not exist and add item', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockCartWithItems);
      mockPrismaService.cart.create.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);
      mockPrismaService.cartItem.create.mockResolvedValue(mockCartItem);

      await service.addItem('user-123', { productId: 'product-123', quantity: 1 });

      expect(mockPrismaService.cart.create).toHaveBeenCalledWith({
        data: { userId: 'user-123' },
      });
      expect(mockPrismaService.cartItem.create).toHaveBeenCalledTimes(1);
    });

    it('should increment quantity if item already exists in cart', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce(mockCart)
        .mockResolvedValueOnce(mockCartWithItems);
      mockPrismaService.cartItem.findFirst.mockResolvedValue(mockCartItem);
      mockPrismaService.cartItem.update.mockResolvedValue(mockCartItem);

      await service.addItem('user-123', { productId: 'product-123', quantity: 1 });

      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        data: { quantity: mockCartItem.quantity + 1 },
        where: { id: mockCartItem.id },
      });
      expect(mockPrismaService.cartItem.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem('user-123', { productId: 'nonexistent', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({ ...mockProduct, stock: 1 });
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem('user-123', { productId: 'product-123', quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // removeItem
  describe('removeItem', () => {
    it('should decrement quantity if item quantity is greater than 1', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce(mockCart)
        .mockResolvedValueOnce(mockCartWithItems);
      mockPrismaService.cartItem.findFirst.mockResolvedValue(mockCartItem);
      mockPrismaService.cartItem.update.mockResolvedValue(mockCartItem);

      await service.removeItem('user-123', 'product-123');

      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: mockCartItem.id },
        data: { quantity: mockCartItem.quantity - 1 },
      });
    });

    it('should delete item if quantity is 1', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findUnique
        .mockResolvedValueOnce(mockCart)
        .mockResolvedValueOnce(mockCartWithItems);
      mockPrismaService.cartItem.findFirst.mockResolvedValue({ ...mockCartItem, quantity: 1 });
      mockPrismaService.cartItem.delete.mockResolvedValue(mockCartItem);

      await service.removeItem('user-123', 'product-123');

      expect(mockPrismaService.cartItem.delete).toHaveBeenCalledWith({
        where: { id: mockCartItem.id },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.removeItem('user-123', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if cart does not exist', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      await expect(service.removeItem('user-123', 'product-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if item not in cart', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem('user-123', 'product-123')).rejects.toThrow(NotFoundException);
    });
  });

  // clearCart
  describe('clearCart', () => {
    it('should delete all items from cart', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.findMany.mockResolvedValue([mockCartItem]);
      mockPrismaService.cartItem.deleteMany.mockResolvedValue({ count: 1 });

      await service.clearCart('user-123');

      expect(mockPrismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: mockCart.id },
      });
    });

    it('should not call deleteMany if cart is empty', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.findMany.mockResolvedValue([]);

      await service.clearCart('user-123');

      expect(mockPrismaService.cartItem.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if cart does not exist', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      await expect(service.clearCart('user-123')).rejects.toThrow(BadRequestException);
    });
  });
});