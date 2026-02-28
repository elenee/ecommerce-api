import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from 'src/auth/decorators/user.decorator';
import { OrderStatus } from '@prisma/client';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Role } from 'src/auth/decorators/roles.decorator';
import { Roles } from 'src/auth/enums/role.enum';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Get('all')
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(@User() userId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(userId, createOrderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getOrders(@User() userId: string) {
    return this.ordersService.getOrders(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOrder(@User() userId: string, @Param('id') id: string) {
    return this.ordersService.getOrder(userId, id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Role([Roles.ADMIN])
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.ordersService.updateStatus(id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancelOrder(@User() userId: string, @Param('id') id: string) {
    return this.ordersService.cancelOrder(userId, id);
  }
}
