import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { UnsubscribeExtractorService } from './unsubscribe-extractor.service';
import { UnsubscribeAutomationService } from './unsubscribe-automation.service';
import { EmailsService } from '../emails/emails.service';
import { UsersService } from '../users/users.service';
import { GmailService } from '../gmail/gmail.service';

interface UnsubscribeResult {
  emailId: string;
  success: boolean;
  message?: string;
  error?: string;
  link?: string;
}

@Processor('unsubscribe-queue')
@Injectable()
export class UnsubscribeProcessor {
  constructor(
    private unsubscribeExtractor: UnsubscribeExtractorService,
    private unsubscribeAutomation: UnsubscribeAutomationService,
    private emailsService: EmailsService,
    private usersService: UsersService,
    private gmailService: GmailService,
  ) {}

  @Process('process-unsubscribe')
  async handleUnsubscribe(job: Job<{ emailIds: string[]; userId: string }>) {
    const { emailIds, userId } = job.data;
    const results: UnsubscribeResult[] = [];

    console.log(`Processing unsubscribe for ${emailIds.length} emails`);

    for (let i = 0; i < emailIds.length; i++) {
      const emailId = emailIds[i];
      
      try {
        // Update progress
        const progress = Math.round(((i + 1) / emailIds.length) * 100);
        await job.progress(progress);

        // Get email
        const email = await this.emailsService.findOne(emailId, userId);
        if (!email) {
          console.error(`Email ${emailId} not found`);
          results.push({
            emailId,
            success: false,
            error: 'Email not found',
          });
          continue;
        }

        // Get user
        const user = await this.usersService.findOne(userId);
        if (!user) {
          console.error(`User ${userId} not found`);
          results.push({
            emailId,
            success: false,
            error: 'User not found',
          });
          continue;
        }

        // Get original email content
        console.log(`Fetching original email for ${email.googleMessageId}`);
        const originalEmail = await this.gmailService.getFullMessage(
          user,
          email.googleMessageId,
        );

        // Extract unsubscribe links
        const links = this.unsubscribeExtractor.extractUnsubscribeLinks(
          originalEmail.body,
          {}, // TODO: Pass email headers if available
        );

        console.log(`Found ${links.length} unsubscribe links`);

        if (links.length === 0) {
          results.push({
            emailId,
            success: false,
            error: 'No unsubscribe links found',
          });
          continue;
        }

        // Get best link
        const bestLink = this.unsubscribeExtractor.findBestUnsubscribeLink(links);
        
        if (!bestLink) {
          results.push({
            emailId,
            success: false,
            error: 'No suitable unsubscribe link found',
          });
          continue;
        }

        console.log(`Attempting to unsubscribe from: ${bestLink.url}`);

        // Only process HTTP links (skip mailto for now)
        if (bestLink.type !== 'http') {
          results.push({
            emailId,
            success: false,
            error: 'Mailto links not supported yet',
            link: bestLink.url,
          });
          continue;
        }

        // Attempt automated unsubscribe (pass user email for AI form filling)
        const result = await this.unsubscribeAutomation.unsubscribeFromUrl(
          bestLink.url,
          user.email,
        );

        results.push({
          emailId,
          success: result.success,
          message: result.message,
          link: bestLink.url,
        });

        // Log result
        console.log(`Unsubscribe result for ${emailId}:`, result.message);

      } catch (error) {
        console.error(`Error processing ${emailId}:`, error);
        results.push({
          emailId,
          success: false,
          error: error.message,
        });
      }
    }

    // Close browser after processing all emails
    await this.unsubscribeAutomation.closeBrowser();

    return {
      total: emailIds.length,
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  }
}
