import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductImageDto {
  @IsNotEmpty()
  @IsString()
  url: string;
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;
}
