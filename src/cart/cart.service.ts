import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (!cart) throw new NotFoundException('Cart is empty');
    return cart;
  }

  async addItem(userId: string, createCartItemDto: CreateCartItemDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: createCartItemDto.productId },
    });
    if (!product) throw new NotFoundException('product not found');

    const cart =
      (await this.prisma.cart.findUnique({ where: { userId } })) ??
      (await this.prisma.cart.create({ data: { userId } }));

    if (product.stock < createCartItemDto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart?.id,
        productId: product.id,
      },
    });

    if (existingItem) {
      await this.prisma.cartItem.update({
        data: {
          quantity: existingItem.quantity + createCartItemDto.quantity,
        },
        where: { id: existingItem.id },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          ...createCartItemDto,
          cartId: cart.id,
        },
      });
    }
    return this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });
  }

  async removeItem(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('product not found');

    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new BadRequestException('cart is empty');

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: product.id,
      },
    });

    if (existingItem) {
      if (existingItem.quantity > 1) {
        await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity - 1 },
        });
      } else {
        await this.prisma.cartItem.delete({
          where: { id: existingItem.id },
        });
      }
    } else {
      throw new NotFoundException();
    }

    return this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new BadRequestException('cart is empty');

    const cartItems = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
    });

    if (cartItems.length > 0) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }
  }
}
