import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @IsString()
  @Length(6, 50)
  password: string;
  @IsNotEmpty()
  @IsString()
  @Length(3, 20)
  firstName: string;
  @IsNotEmpty()
  @IsString()
  @Length(3, 20)
  lastName: string;
}
