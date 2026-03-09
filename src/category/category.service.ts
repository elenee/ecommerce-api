import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import sharp from 'sharp';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    private awsService: AwsS3Service,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    image: Express.Multer.File,
  ) {
    const category = await this.prisma.category.create({
      data: createCategoryDto,
    });

    let resizedBuffer = await sharp(image.buffer)
      .resize(800, 600, {
        fit: 'cover',
        position: 'center',
      })
      .toBuffer();

    resizedBuffer = await sharp(resizedBuffer).jpeg({ quality: 80 }).toBuffer();

    const key = `categories/${category.id}/${Date.now()}-${image.originalname}`;
    const url = await this.awsService.uploadFile(key, resizedBuffer);
    await this.prisma.categoryImage.create({
      data: { url, key, categoryId: category.id },
    });

    return this.prisma.category.findUnique({
      where: { id: category.id },
      include: { images: true },
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      where: {
        parentCategoryId: null,
        isActive: true,
      },
      include: { images: true },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    image: Express.Multer.File,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (image) {
      let resizedBuffer = await sharp(image.buffer)
        .resize(800, 600, {
          fit: 'cover',
          position: 'center',
        })
        .toBuffer();

      resizedBuffer = await sharp(resizedBuffer)
        .jpeg({ quality: 80 })
        .toBuffer();
      const key = `categories/${category.id}/${Date.now()}-${image.originalname}`;
      const url = await this.awsService.uploadFile(key, resizedBuffer);

      const existingCover = await this.prisma.categoryImage.findFirst({
        where: { categoryId: category.id },
      });

      if (existingCover) {
        await this.prisma.categoryImage.update({
          where: { id: existingCover.id },
          data: { url, key },
        });
      } else {
        await this.prisma.categoryImage.create({
          data: { url, key, categoryId: category.id },
        });
      }
    }
    return await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: { images: true },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
    return 'category deleted successfully';
  }
}
