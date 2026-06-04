import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendSms(phone: string, message: string): Promise<void> {
    // Production: integrate with Twilio/Unifonic/Zid SMS
    // For now: log and support easy swap
    if (process.env.SMS_PROVIDER === 'twilio') {
      await this.sendViaTwilio(phone, message);
    } else {
      this.logger.log(`[SMS] To: ${phone} | Message: ${message}`);
    }
  }

  async sendWhatsApp(phone: string, message: string): Promise<void> {
    if (process.env.WHATSAPP_PROVIDER === 'twilio') {
      await this.sendViaTwilio(`whatsapp:${phone}`, message);
    } else {
      this.logger.log(`[WhatsApp] To: ${phone} | Message: ${message}`);
    }
  }

  private async sendViaTwilio(to: string, body: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !from) {
      this.logger.warn('Twilio not configured, skipping SMS');
      return;
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({ To: to, From: from, Body: body });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    if (!res.ok) {
      this.logger.error(`Twilio error: ${res.status} ${await res.text()}`);
    }
  }
}
