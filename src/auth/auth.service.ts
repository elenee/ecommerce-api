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
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private readonly jwtService: JwtService,
    private prisma: PrismaService,
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
    const isPasswValid = await bcrypt.compare(
      signInDto.password,
      user.password,
    );
    if (!isPasswValid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async signIn(user: any) {
    const payload = {
      sub: user.id,
      role: user.role,
    };
    const accessToken = await this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    const refreshToken = await this.createRefreshToken(user.id, user.role);

    return { accessToken, refreshToken };
  }

  async createRefreshToken(id: string, role: string) {
    const refreshToken = await this.jwtService.sign(
      { sub: id, role },
      {
        expiresIn: '7d',
      },
    );
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      data: { refreshToken: hashed },
      where: { id },
    });
    return refreshToken;
  }

  async accessRefreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub },
      });

      if (!user) throw new UnauthorizedException();

      const isValidToken = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );
      if (!isValidToken) throw new UnauthorizedException();

      const accessToken = await this.jwtService.sign(payload, {
        expiresIn: '1h',
      });
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}
