import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { EmailProcessor } from './email.processor';
import { GmailModule } from '../gmail/gmail.module';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { EmailsModule } from '../emails/emails.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email-processing',
    }),
    GmailModule,
    AiModule,
    UsersModule,
    EmailsModule,
    CategoriesModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, EmailProcessor],
})
export class WebhookModule {}
