import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(createCouponDto: CreateCouponDto) {
    return await this.prisma.coupon.create({ data: createCouponDto });
  }

  findAll() {
    return this.prisma.coupon.findMany();
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('coupon not found');
    return coupon;
  }

  async update(id: string, updateCouponDto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('coupon not found');
    await this.prisma.coupon.update({
      where: { id },
      data: updateCouponDto,
    });
    return coupon;
  }

  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('coupon not found');
    await this.prisma.coupon.delete({ where: { id } });
  }

  async applyCoupon(
    userId: string,
    orderId: string,
    applyCouponDto: ApplyCouponDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: applyCouponDto.code },
    });

    if (!coupon) throw new NotFoundException('Coupon not found');

    if (coupon.expiresAt < new Date()) {
      throw new BadRequestException('coupon expired');
    }
    if (coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException();
    }

    if (coupon.discountType === 'PERCENTAGE') {
      const discount =
        (Number(order?.total) * Number(coupon.discountValue)) / 100;
      const newTotal = Number(order?.total) - discount;
      await this.prisma.order.update({
        where: { id: orderId },
        data: { total: newTotal },
      });
    } else if (coupon.discountType === 'FIXED') {
      const discount = Number(order?.total) - Number(coupon.discountValue);
      await this.prisma.order.update({
        where: { id: orderId },
        data: { total: discount },
      });
    }

    await this.prisma.coupon.update({
      where: { id: coupon.id },
      data: { usageCount: { increment: 1 } },
    });

    return await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
  }
}
