import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/cretae-product-variant.dto';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Role } from 'src/auth/decorators/roles.decorator';
import { Roles } from 'src/auth/enums/role.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaginationDto } from './dto/pagination.dto';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'coverImage', maxCount: 1 },
      { name: 'images', maxCount: 100 },
    ]),
  )
  create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles()
    files: {
      coverImage: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    return this.productsService.create(
      createProductDto,
      files.coverImage?.[0],
      files.images ?? [],
    );
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.update(id, updateProductDto, file);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Post(':id/variants')
  addVariants(
    @Param('id') productId: string,
    @Body() createProductVariantDto: CreateProductVariantDto,
  ) {
    return this.productsService.addVariants(productId, createProductVariantDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  addImages(
    @Param('id') id: string,
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    return this.productsService.addImages(id, images);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Delete(':id/images/:imageId')
  removeImages(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.productsService.removeImages(id, imageId);
  }
}
