import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    productId: string,
    createReviewDto: CreateReviewDto,
  ) {
    const existingReview = await this.prisma.review.findFirst({
      where: { userId, productId },
    });
    if (existingReview)
      throw new BadRequestException('You have already reviewed this product');

    return await this.prisma.review.create({
      data: {
        ...createReviewDto,
        userId,
        productId,
      },
    });
  }

  findAll(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
    });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('review not found');
    return review;
  }

  async remove(userId: string, id: string, role: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });
    if (!review) throw new NotFoundException('review not found');
    if (review?.userId !== userId && role !== 'ADMIN')
      throw new ForbiddenException();
    await this.prisma.review.delete({ where: { id } });
    return 'review deleted successfully';
  }
}
