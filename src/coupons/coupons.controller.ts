import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Role } from 'src/auth/decorators/roles.decorator';
import { Roles } from 'src/auth/enums/role.enum';
import { User } from 'src/auth/decorators/user.decorator';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Post()
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @Get()
  findAll() {
    return this.couponsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponsService.update(id, updateCouponDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':orderId/apply')
  applyCoupon(
    @User() userId: string,
    @Param('orderId') orderId: string,
    @Body() applyCouponDto: ApplyCouponDto,
  ) {
    return this.couponsService.applyCoupon(userId, orderId, applyCouponDto);
  }
}
