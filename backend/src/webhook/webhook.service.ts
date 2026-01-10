import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { UsersService } from '../users/users.service';

@Injectable()
export class WebhookService {
  constructor(
    @InjectQueue('email-processing') private emailQueue: Queue,
    private usersService: UsersService,
  ) {}

  async handleNotification(payload: any) {
    const data = Buffer.from(payload.message.data, 'base64').toString();
    const message = JSON.parse(data);
    const emailAddress = message.emailAddress;
    const historyId = message.historyId;

    // Find User
    const user = await this.usersService.findOneByEmail(emailAddress);
    if (!user) {
      console.log(`User not found for email: ${emailAddress}`);
      return; // Ignore
    }

    // Add to queue
    await this.emailQueue.add('process-email', {
      user,
      historyId,
    });
  }
}
