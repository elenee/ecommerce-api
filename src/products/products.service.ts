import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/cretae-product-variant.dto';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: createProductDto,
    });
    return product;
  }

  async findAll(query: PaginationDto) {
    let {
      page = 1,
      limit = 10,
      search,
      category,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      order,
    } = query;
    let orderby = { [sortBy]: order };
    const where = {
      name: search
        ? { contains: search, mode: 'insensitive' as const }
        : undefined,
      category: category
        ? { name: { contains: category, mode: 'insensitive' as const } }
        : undefined,
      price: {
        gte: minPrice || undefined,
        lte: maxPrice || undefined,
      },
    };

    if (limit > 10) limit = 10;
    const skipIndex = (page - 1) * limit;

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        orderBy: [orderby],
        where,
        skip: skipIndex,
        take: limit,
        include: { images: true, variants: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.update({
      data: updateProductDto,
      where: { id },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async remove(id: string) {
    const product = await this.prisma.product.delete({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return 'product deleted successfully';
  }

  async addImages(
    productId: string,
    cretaeProductImageDto: CreateProductImageDto,
  ) {
    const image = await this.prisma.productImage.create({
      data: {
        ...cretaeProductImageDto,
        productId,
      },
    });
    return image;
  }

  async addVariants(
    productId: string,
    createProductVariantDto: CreateProductVariantDto,
  ) {
    const variant = await this.prisma.productVariant.create({
      data: {
        ...createProductVariantDto,
        productId,
      },
    });
    return variant;
  }
}
