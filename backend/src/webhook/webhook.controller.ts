import { Controller, Post, Body } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('gmail')
  async handleGmailPush(@Body() body: any) {
    // Verify token? PubSub sends JWT?
    // For dev task, assuming trust or simple check.
    
    await this.webhookService.handleNotification(body);
    return { success: true };
  }
}
