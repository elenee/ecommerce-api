import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from 'src/auth/decorators/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findOne(@User() userId: string) {
    return this.wishlistService.findOne(userId);
  }

  @Post(':productId')
  addToWishlist(@User() userId: string, @Param('productId') productId: string) {
    return this.wishlistService.addToWishlist(userId, productId);
  }

  @Delete(':productId')
  removeProduct(@User() userId: string, @Param('productId') productId: string) {
    return this.wishlistService.removeProduct(userId, productId);
  }
}
