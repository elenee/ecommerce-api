import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'hashed',
  role: 'CUSTOMER',
  phone: null,
  refreshToken: null,
  createdAt: new Date(),
};

const mockProduct = {
  id: 'product-123',
  name: 'Headphones',
  price: 99.99,
  stock: 50,
  categoryId: 'category-123',
  description: null,
  createdAt: new Date(),
};

const mockCartItem = {
  id: 'cartitem-123',
  cartId: 'cart-123',
  productId: 'product-123',
  variantId: null,
  quantity: 2,
};

const mockCart = {
  id: 'cart-123',
  userId: 'user-123',
  items: [{ ...mockCartItem, product: mockProduct }],
};

const mockOrder = {
  id: 'order-123',
  userId: 'user-123',
  addressId: 'address-123',
  status: 'PENDING',
  total: 199.98,
  createdAt: new Date(),
  items: [{ ...mockCartItem, product: mockProduct }],
  user: mockUser,
};

const mockPrismaService = {
  user: { findUnique: jest.fn() },
  cart: { findUnique: jest.fn() },
  cartItem: { findMany: jest.fn(), deleteMany: jest.fn() },
  product: { findMany: jest.fn(), update: jest.fn() },
  order: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  orderItem: { createMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID = 'd-confirmation';
    process.env.SENDGRID_ORDER_SHIPPED_TEMPLATE_ID = 'd-shipped';
    process.env.SENDGRID_ORDER_DELIVERED_TEMPLATE_ID = 'd-delivered';
    process.env.SENDGRID_ORDER_CANCELLED_TEMPLATE_ID = 'd-cancelled';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
    mockEmailService.sendEmail.mockResolvedValue(undefined);
  });

  // createOrder
  describe('createOrder', () => {
    it('should create order and send confirmation email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockResolvedValue(mockOrder);

      const result = await service.createOrder('user-123', {
        addressId: 'address-123',
      });

      expect(result).toEqual(mockOrder);
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        mockUser.email,
        'Order Confirmation',
        expect.any(String),
        expect.objectContaining({
          firstName: mockUser.firstName,
          orderId: mockOrder.id,
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrder('nonexistent-user', { addressId: 'address-123' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if transaction returns null', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockResolvedValue(null);

      await expect(
        service.createOrder('user-123', { addressId: 'address-123' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not send email if transaction fails', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockRejectedValue(
        new BadRequestException('cart is empty'),
      );

      await expect(
        service.createOrder('user-123', { addressId: 'address-123' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  // getOrders
  describe('getOrders', () => {
    it('should return all orders for a user', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getOrders('user-123');

      expect(result).toEqual([mockOrder]);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: { items: { include: { product: true } } },
      });
    });
  });

  // getOrder
  describe('getOrder', () => {
    it('should return a single order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrder('user-123', 'order-123');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrder('user-123', 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // updateStatus
  describe('updateStatus', () => {
    it('should update order status', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'SHIPPED',
      });

      const result = await service.updateStatus(
        'order-123',
        OrderStatus.SHIPPED,
      );

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { status: OrderStatus.SHIPPED },
      });
      expect(result.status).toBe('SHIPPED');
    });

    it('should send email for SHIPPED status', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'SHIPPED',
      });

      await service.updateStatus('order-123', OrderStatus.SHIPPED);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        mockUser.email,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ orderId: mockOrder.id }),
      );
    });

    it('should not send email for PENDING status', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(mockOrder);

      await service.updateStatus('order-123', OrderStatus.PENDING);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent-id', OrderStatus.SHIPPED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // cancelOrder
  describe('cancelOrder', () => {
    it('should cancel a pending order and restore stock', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockResolvedValue({
        ...mockOrder,
        status: 'CANCELLED',
      });

      const result = await service.cancelOrder('user-123', 'order-123');

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('CANCELLED');
    });

    it('should send cancellation email', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.$transaction.mockResolvedValue({
        ...mockOrder,
        status: 'CANCELLED',
      });

      await service.cancelOrder('user-123', 'order-123');

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        mockUser.email,
        'Order Cancelled',
        expect.any(String),
        expect.objectContaining({ firstName: mockUser.firstName }),
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelOrder('user-123', 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order is not PENDING', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: 'SHIPPED',
      });

      await expect(
        service.cancelOrder('user-123', 'order-123'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });
});
