import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 30)
  name: string;
  @IsOptional()
  @IsString()
  @Length(5, 50)
  description?: string;
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price: number;
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  stock: number;
  @IsNotEmpty()
  @IsString()
  categoryId: string;
}
