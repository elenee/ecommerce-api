import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly stripeService: Stripe;

  private readonly stripeWebhookSecret: string;
  private readonly stripePublishableKey: string;

  constructor(
    private readonly configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const stripeSecretKey =
      this.configService.get<string>('STRIPE_SECRET_KEY')!;
    this.stripePublishableKey = this.configService.get<string>(
      'STRIPE_PUBLISHABLE_KEY',
    )!;
    this.stripeWebhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
      '',
    );

    this.stripeService = new Stripe(stripeSecretKey, {});
  }

  async createPaymentInten(orderId: string) {
    let stripeIntent: Stripe.PaymentIntent;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    stripeIntent = await this.stripeService.paymentIntents.create({
      amount: Math.round(Number(order.total) * 100),
      currency: 'usd',
      metadata: { orderId },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    await this.prisma.payment.upsert({
      where: { orderId },
      update: {
        stripePaymentIntentId: stripeIntent.id,
        status: 'PENDING',
        amount: order.total,
      },
      create: {
        orderId,
        stripePaymentIntentId: stripeIntent.id,
        status: 'PENDING',
        amount: order.total,
      },
    });

    return { clientSecret: stripeIntent.client_secret };
  }

  async handleWebhook(rawBody, signature: string) {
    if (!this.stripeWebhookSecret) {
      throw new NotFoundException(
        'Stripe webhook secret not found in the configuration.',
      );
    }

    const event = this.stripeService.webhooks.constructEvent(
      rawBody,
      signature,
      this.stripeWebhookSecret,
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;
        await this.prisma.order.update({
          data: { status: 'PAID' },
          where: { id: orderId },
        });
        await this.prisma.payment.update({
          data: {
            status: 'COMPLETED',
          },
          where: { orderId },
        });
        break;
      case 'payment_intent.payment_failed':
        const failedOrderId = (event.data.object as Stripe.PaymentIntent)
          .metadata.orderId;
        await this.prisma.payment.update({
          data: {
            status: 'FAILED',
          },
          where: { orderId: failedOrderId },
        });
    }

    return { recieved: true };
  }
}
