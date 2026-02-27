import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsNotEmpty()
  @IsString()
  street: string;
  @IsNotEmpty()
  @IsString()
  city: string;
  @IsOptional()
  @IsString()
  state: string;
  @IsNotEmpty()
  @IsString()
  country: string;
  @IsNotEmpty()
  @IsString()
  zipCode: string;
}
