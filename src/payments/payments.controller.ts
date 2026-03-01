import {
  Controller,
  Post,
  Param,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { RawBodyRequest } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-payment-intent/:orderId')
  createPaymentIntent(@Param('orderId') orderId: string) {
    return this.paymentsService.createPaymentInten(orderId);
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody, signature);
  }
}
