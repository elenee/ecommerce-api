import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('user not found');

    const order = await this.prisma.$transaction(async (tx) => {
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

    if (!order) {
      throw new NotFoundException('order not found');
    }

    await this.emailService.sendEmail(
      user.email,
      'Order Confirmation',
      process.env.SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID!,
      {
        firstName: user.firstName,
        orderId: order.id,
        total: Number(order.total).toFixed(2),
      },
    );
    return order;
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
      include: { user: true },
    });
    if (!order) throw new NotFoundException('order not found');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    const templateMap = {
      SHIPPED: process.env.SENDGRID_ORDER_SHIPPED_TEMPLATE_ID!,
      DELIVERED: process.env.SENDGRID_ORDER_DELIVERED_TEMPLATE_ID!,
      CANCELLED: process.env.SENDGRID_ORDER_CANCELLED_TEMPLATE_ID!,
    };

    const templateId = templateMap[status];
    if (templateId) {
      await this.emailService.sendEmail(
        order.user.email,
        `Order ${status.charAt(0) + status.slice(1).toLowerCase()}`,
        templateId,
        {
          firstName: order.user.firstName,
          orderId: order.id,
          total: Number(order.total).toFixed(2),
        },
      );
    }

    return updated;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
      include: { items: true, user: true },
    });
    if (!order) throw new NotFoundException('order not found');
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Only pending orders can be canceled');
    }

    const canceledOrder = await this.prisma.$transaction(async (tx) => {
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

    await this.emailService.sendEmail(
      order.user.email,
      'Order Cancelled',
      process.env.SENDGRID_ORDER_CANCELLED_TEMPLATE_ID!,
      {
        firstName: order.user.firstName,
        orderId: order.id,
        total: Number(order.total).toFixed(2),
      },
    );

    return canceledOrder;
  }
}
