import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { UnsubscribeExtractorService } from './unsubscribe-extractor.service';
import { UnsubscribeAutomationService } from './unsubscribe-automation.service';
import { UnsubscribeProcessor } from './unsubscribe.processor';
import { EmailsModule } from '../emails/emails.module';
import { UsersModule} from '../users/users.module';
import { GmailModule } from '../gmail/gmail.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'unsubscribe-queue',
    }),
    EmailsModule,
    UsersModule,
    GmailModule,
    AiModule,
  ],
  providers: [
    UnsubscribeExtractorService,
    UnsubscribeAutomationService,
    UnsubscribeProcessor,
  ],
  exports: [
    BullModule,
    UnsubscribeExtractorService,
    UnsubscribeAutomationService,
  ],
})
export class UnsubscribeModule {}
