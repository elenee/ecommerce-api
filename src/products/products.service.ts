import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductVariantDto } from './dto/cretae-product-variant.dto';
import { PaginationDto } from './dto/pagination.dto';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private awsService: AwsS3Service,
    private redisService: RedisService,
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

    await this.redisService.incr('products:version');

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

    const version = (await this.redisService.get('products:version')) ?? '1';
    const cacheKey = `products:v:${version}:${JSON.stringify(query)}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      console.log('returning all products from redis');
      return JSON.parse(cached);
    }

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
    const result = {
      products,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async findOne(id: string) {
    const cacheKey = `productId:${id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log('returning from redis');
      return JSON.parse(cached);
    }
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) throw new NotFoundException('Product not found');
    await this.redisService.set(cacheKey, JSON.stringify(product), 300);
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

    await this.redisService.delete(`productId:${id}`);
    await this.redisService.incr('products:version');
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

    await this.redisService.delete(`productId:${id}`);
    await this.redisService.incr('products:version');
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
    await this.redisService.incr('products:version');
    await this.redisService.delete(`productId:${productId}`);
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

    await this.redisService.incr('products:version');
    await this.redisService.delete(`productId:${id}`);

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
    await this.redisService.incr('products:version');
    await this.redisService.delete(`productId:${id}`);
    return 'image deleted successfully';
  }
}
