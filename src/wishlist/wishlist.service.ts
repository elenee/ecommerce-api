import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async findOne(userId: string) {
    return await this.prisma.wishlist.findMany({
      where: { userId },
      include: { product: true },
    });
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('product not found');

    const existing = await this.prisma.wishlist.findFirst({
      where: { userId, productId },
    });
    if (existing)
      throw new BadRequestException('product is already in wishlist');

    return await this.prisma.wishlist.create({
      data: { userId, productId },
    });
  }

  async removeProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('product not found');

    const existing = await this.prisma.wishlist.findFirst({
      where: { userId, productId },
    });
    if (!existing) throw new BadRequestException();

    return await this.prisma.wishlist.delete({ where: { id: existing.id } });
  }
}
