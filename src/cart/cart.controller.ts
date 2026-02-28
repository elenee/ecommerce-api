import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from 'src/auth/decorators/user.decorator';
import { CreateCartItemDto } from './dto/create-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getCart(@User() userId: string) {
    return this.cartService.getCart(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('add')
  addItem(
    @User() userId: string,
    @Body() createCartItemDto: CreateCartItemDto,
  ) {
    return this.cartService.addItem(userId, createCartItemDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('remove/:productId')
  removeItem(@User() userId: string, @Param('productId') productId: string) {
    return this.cartService.removeItem(userId, productId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('clear')
  clearCart(@User() userId: string) {
    return this.cartService.clearCart(userId);
  }
}
