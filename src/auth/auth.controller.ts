import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

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

  @Post('refresh-token')
  accessRefreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.accessRefreshToken(refreshToken);
  }
}
