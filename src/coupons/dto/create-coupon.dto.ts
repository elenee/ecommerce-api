import { DiscountType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export class CreateCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;
  @IsNotEmpty()
  @IsEnum(DiscountType)
  discountType: DiscountType;
  @IsNotEmpty()
  @IsNumber()
  discountValue: number;
  @IsNotEmpty()
  @IsDateString()
  expiresAt: Date;
  @IsNotEmpty()
  @IsNumber()
  usageLimit: number;
}
