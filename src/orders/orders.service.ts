import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    return await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true } } },
      });
      if (!cart) {
        throw new BadRequestException('cart is empty');
      }

      const cartItems = await tx.cartItem.findMany({
        where: { cartId: cart.id },
      });
      const productIds = cartItems.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      for (const item of cartItems) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new NotFoundException('product not found');
        if (product.stock < item.quantity) {
          throw new BadRequestException('insufficient stock');
        }
      }

      const total = cartItems.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return sum + item.quantity * Number(product?.price);
      }, 0);

      const order = await tx.order.create({
        data: {
          ...createOrderDto,
          userId,
          total,
          status: 'PENDING',
        },
      });

      await tx.orderItem.createMany({
        data: cartItems.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return {
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            priceAtPurchase: product!.price,
          };
        }),
      });

      await Promise.all(
        cartItems.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          }),
        ),
      );

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return tx.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { product: true } } },
      });
    });
  }

  async getAllOrders() {
    return await this.prisma.order.findMany({
      include: { items: { include: { product: true } } },
    });
  }

  async getOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    return orders;
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
        userId,
      },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });
    if (!order) throw new NotFoundException('order not found');
    return await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('order not found');
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Only pending orders can be canceled');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  }
}
