import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Role } from 'src/auth/decorators/roles.decorator';
import { Roles } from 'src/auth/enums/role.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoryService.create(createCategoryDto, file);
  }

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoryService.update(id, updateCategoryDto, file);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
