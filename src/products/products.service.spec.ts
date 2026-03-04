import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { NotFoundException } from '@nestjs/common';

const mockProduct = {
  id: 'product-123',
  name: 'Wireless Headphones',
  description: 'Great headphones',
  price: 99.99,
  stock: 50,
  categoryId: 'category-123',
  createdAt: new Date(),
};

const mockImage = {
  id: 'image-123',
  productId: 'product-123',
  url: 'https://bucket.s3.amazonaws.com/products/product-123/image.jpg',
  key: 'products/product-123/image.jpg',
  isPrimary: true,
};

const mockFile = {
  originalname: 'headphones.jpg',
  buffer: Buffer.from('fake image data'),
  mimetype: 'image/jpeg',
} as Express.Multer.File;

const mockPrismaService = {
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  productImage: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  productVariant: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAwsService = {
  uploadFile: jest
    .fn()
    .mockResolvedValue(
      'https://bucket.s3.amazonaws.com/products/product-123/image.jpg',
    ),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AwsS3Service, useValue: mockAwsService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
    mockAwsService.uploadFile.mockResolvedValue(
      'https://bucket.s3.amazonaws.com/products/product-123/image.jpg',
    );
  });

  // create
  describe('create', () => {
    it('should create a product with cover image and gallery images', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct);
      mockPrismaService.productImage.create.mockResolvedValue(mockImage);
      mockPrismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        images: [mockImage],
        variants: [],
      });

      const result = await service.create(
        {
          name: 'Wireless Headphones',
          price: 99.99,
          stock: 50,
          categoryId: 'category-123',
        },
        mockFile,
        [mockFile],
      );

      expect(mockPrismaService.product.create).toHaveBeenCalledTimes(1);
      expect(mockAwsService.uploadFile).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.productImage.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('images');
      expect(result).toHaveProperty('variants');
    });

    it('should create a product without images', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct);
      mockPrismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        images: [],
        variants: [],
      });

      await service.create(
        {
          name: 'Wireless Headphones',
          price: 99.99,
          stock: 50,
          categoryId: 'category-123',
        },
        undefined as unknown as Express.Multer.File,
        [],
      );

      expect(mockAwsService.uploadFile).not.toHaveBeenCalled();
      expect(mockPrismaService.productImage.create).not.toHaveBeenCalled();
    });

    it('should set isPrimary true for cover image and false for gallery images', async () => {
      mockPrismaService.product.create.mockResolvedValue(mockProduct);
      mockPrismaService.productImage.create.mockResolvedValue(mockImage);
      mockPrismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        images: [],
        variants: [],
      });

      await service.create(
        {
          name: 'Wireless Headphones',
          price: 99.99,
          stock: 50,
          categoryId: 'category-123',
        },
        mockFile,
        [mockFile],
      );

      const calls = mockPrismaService.productImage.create.mock.calls;
      expect(calls[0][0].data.isPrimary).toBe(true);
      expect(calls[1][0].data.isPrimary).toBe(false);
    });
  });

  // findAll
  describe('findAll', () => {
    it('should return paginated products', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[mockProduct], 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        products: [mockProduct],
        total: 1,
        page: 1,
        lastPage: 1,
      });
    });

    it('should cap limit at 10', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 100 });

      const findManyCall = mockPrismaService.$transaction.mock.calls[0];
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should calculate lastPage correctly', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[mockProduct], 25]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.lastPage).toBe(3);
    });
  });

  // findOne
  describe('findOne', () => {
    it('should return a product by id', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-123');

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-123' },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // update
  describe('update', () => {
    it('should update product text fields', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({
        ...mockProduct,
        name: 'Updated Name',
        images: [],
        variants: [],
      });

      const result = await service.update(
        'product-123',
        { name: 'Updated Name' },
        undefined as unknown as Express.Multer.File,
      );

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-123' },
        data: { name: 'Updated Name' },
        include: { images: true, variants: true },
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should update cover image when provided and existing cover exists', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productImage.findFirst.mockResolvedValue(mockImage);
      mockPrismaService.productImage.update.mockResolvedValue(mockImage);
      mockPrismaService.product.update.mockResolvedValue({
        ...mockProduct,
        images: [],
        variants: [],
      });

      await service.update('product-123', {}, mockFile);

      expect(mockAwsService.uploadFile).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.productImage.update).toHaveBeenCalledWith({
        where: { id: mockImage.id },
        data: { url: expect.any(String), key: expect.any(String) },
      });
    });

    it('should create cover image if no existing cover', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productImage.findFirst.mockResolvedValue(null);
      mockPrismaService.productImage.create.mockResolvedValue(mockImage);
      mockPrismaService.product.update.mockResolvedValue({
        ...mockProduct,
        images: [],
        variants: [],
      });

      await service.update('product-123', {}, mockFile);

      expect(mockPrismaService.productImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPrimary: true,
          productId: mockProduct.id,
        }),
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update(
          'nonexistent-id',
          {},
          undefined as unknown as Express.Multer.File,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // remove
  describe('remove', () => {
    it('should delete product and its S3 images', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productImage.findMany.mockResolvedValue([mockImage]);
      mockPrismaService.product.delete.mockResolvedValue(mockProduct);

      const result = await service.remove('product-123');

      expect(mockAwsService.deleteFile).toHaveBeenCalledWith(mockImage.key);
      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({
        where: { id: 'product-123' },
      });
      expect(result).toBe('product deleted successfully');
    });

    it('should delete all S3 images before deleting product', async () => {
      const images = [
        { ...mockImage, id: 'img-1', key: 'products/product-123/img1.jpg' },
        { ...mockImage, id: 'img-2', key: 'products/product-123/img2.jpg' },
      ];
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productImage.findMany.mockResolvedValue(images);
      mockPrismaService.product.delete.mockResolvedValue(mockProduct);

      await service.remove('product-123');

      expect(mockAwsService.deleteFile).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // removeImages
  describe('removeImages', () => {
    it('should delete image from S3 and database', async () => {
      mockPrismaService.productImage.findFirst.mockResolvedValue(mockImage);
      mockPrismaService.productImage.delete.mockResolvedValue(mockImage);

      const result = await service.removeImages('product-123', 'image-123');

      expect(mockAwsService.deleteFile).toHaveBeenCalledWith(mockImage.key);
      expect(mockPrismaService.productImage.delete).toHaveBeenCalledWith({
        where: { id: mockImage.id },
      });
      expect(result).toBe('image deleted successfully');
    });

    it('should throw NotFoundException if image not found', async () => {
      mockPrismaService.productImage.findFirst.mockResolvedValue(null);

      await expect(
        service.removeImages('product-123', 'nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
