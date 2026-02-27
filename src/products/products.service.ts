import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/cretae-product-variant.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: createProductDto,
    });
    return product;
  }

  findAll() {
    return this.prisma.product.findMany({
      include: { images: true, variants: true },
    });
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
