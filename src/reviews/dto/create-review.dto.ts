import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;
  @IsOptional()
  @IsString()
  @Length(3, 30)
  comment?: string;
}
