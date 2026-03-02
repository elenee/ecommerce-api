import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('sign-in')
  signIn(@Request() req) {
    return this.authService.signIn(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  currentUser(@User() userId: string) {
    return this.authService.currentUser(userId);
  }

  @Post('refresh-token')
  accessRefreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.accessRefreshToken(refreshToken);
  }
}
