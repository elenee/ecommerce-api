import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { AwsS3Module } from 'src/aws-s3/aws-s3.module';

@Module({
  imports: [AwsS3Module],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
