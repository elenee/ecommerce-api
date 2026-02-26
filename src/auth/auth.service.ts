import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const user = await this.usersService.findByEmail(signUpDto.email);
    if (user) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassw = await bcrypt.hash(signUpDto.password, 10);

    await this.usersService.create({ ...signUpDto, password: hashedPassw });
    return 'user created successfully';
  }

  async validateUser(signInDto: SignInDto) {
    const user = await this.usersService.findByEmail(signInDto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isPasswValid = await bcrypt.compare(signInDto.password, user.password);
    if (!isPasswValid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async signIn(user: any) {
    const payload = {
      sub: user.id,
    };
    const accessToken = await this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    return { accessToken };
  }
}
