import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY')!;
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(
    to: string,
    subject: string,
    templateId: string,
    dynamicData: Record<string, any>,
  ) {
    const from = this.configService.get<string>('SENDGRID_SENDER_EMAIL');
    if (!from) {
      throw new BadRequestException(
        'SENDGRID_SENDER_EMAIL is not defined in the configuration',
      );
    }
    const msg: any = {
      to,
      from,
      subject,
      templateId,
      dynamicTemplateData: dynamicData,
    };
    try {
      await sgMail.send(msg);
    } catch (error) {
      console.log('SendGrid Error:', error.response?.body || error.message);
      throw error;
    }
  }
}
