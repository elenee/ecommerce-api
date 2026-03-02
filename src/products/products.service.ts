import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductVariantDto } from './dto/cretae-product-variant.dto';
import { PaginationDto } from './dto/pagination.dto';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private awsService: AwsS3Service,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    coverImage: Express.Multer.File,
    images: Express.Multer.File[],
  ) {
    const product = await this.prisma.product.create({
      data: createProductDto,
    });

    const allFiles = [
      ...(coverImage ? [{ file: coverImage, isPrimary: true }] : []),
      ...images.map((file) => ({ file, isPrimary: false })),
    ];

    await Promise.all(
      allFiles.map(async ({ file, isPrimary }) => {
        const key = `products/${product.id}/${Date.now()}-${file.originalname}`;
        const url = await this.awsService.uploadFile(key, file.buffer);
        return this.prisma.productImage.create({
          data: { url, key, productId: product.id, isPrimary },
        });
      }),
    );

    return this.prisma.product.findUnique({
      where: { id: product.id },
      include: { images: true, variants: true },
    });
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

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    coverImage: Express.Multer.File,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (coverImage) {
      const key = `products/${product.id}/${Date.now()}-${coverImage.originalname}`;
      const url = await this.awsService.uploadFile(key, coverImage.buffer);

      const existingCover = await this.prisma.productImage.findFirst({
        where: { productId: product.id, isPrimary: true },
      });

      if (existingCover) {
        await this.prisma.productImage.update({
          where: { id: existingCover.id },
          data: { url, key },
        });
      } else {
        await this.prisma.productImage.create({
          data: { url, key, productId: product.id, isPrimary: true },
        });
      }
    }

    return await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: { images: true, variants: true },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    const productImages = await this.prisma.productImage.findMany({
      where: { productId: product.id },
    });

    await Promise.all(
      productImages.map((image) => this.awsService.deleteFile(image.key)),
    );
    await this.prisma.product.delete({ where: { id } });
    return 'product deleted successfully';
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

  async addImages(id: string, images: Express.Multer.File[]) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('product not found');
    await Promise.all(
      images.map(async (file) => {
        const key = `products/${product.id}/${Date.now()}-${file.originalname}`;
        const url = await this.awsService.uploadFile(key, file.buffer);
        return this.prisma.productImage.create({
          data: { url, key, productId: product.id, isPrimary: false },
        });
      }),
    );

    return this.prisma.product.findUnique({
      where: { id: product.id },
      include: { images: true, variants: true },
    });
  }

  async removeImages(id: string, imageId: string) {
    const productImage = await this.prisma.productImage.findFirst({
      where: { productId: id, id: imageId },
    });
    if (!productImage) throw new NotFoundException('image not found');
    await this.awsService.deleteFile(productImage.key);
    await this.prisma.productImage.delete({ where: { id: productImage.id } });
    return 'image deleted successfully';
  }
}
