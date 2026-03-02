import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AwsS3Module } from 'src/aws-s3/aws-s3.module';

@Module({
  imports: [AwsS3Module],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
