import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { GmailService } from '../gmail/gmail.service';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { CategoriesService } from '../categories/categories.service';
import { EmailsService } from '../emails/emails.service';

@Processor('email-processing')
export class EmailProcessor {
  constructor(
    private gmailService: GmailService,
    private aiService: AiService,
    private usersService: UsersService,
    private categoriesService: CategoriesService,
    private emailsService: EmailsService,
  ) {}

  @Process('process-email')
  async handleEmailProcessing(job: Job) {
    const { user, historyId } = job.data;
    console.log(`Processing email for user ${user.email} with historyId ${historyId}`);

    // Fetch new messages since last historyId
    const profile = await this.gmailService.getProfile(user); // Optional, maybe just use history
    // For simplicity, let's assume we fetch history. If historyId is null/old, we might need full sync.
    // If this is first run, user.historyId might be null.
    let startHistoryId = user.historyId;
    
    // If no historyId, execute a full sync or watch returns one?
    // User should have startHistoryId stored when Watch was called.
    // For now, let's assume we proceed with history.list if we have one.
    
    if (!startHistoryId) {
        console.log('No historyId found for user. Skipping sync.');
        return; 
    }

    try {
        const history = await this.gmailService.getHistory(user, startHistoryId);
        const messagesAdded = history.data.history?.flatMap(h => h.messagesAdded || []) || [];

        for (const msg of messagesAdded) {
            if (!msg.message?.id) continue;
            
            const messageId = msg.message.id;
            const fullMessage = await this.gmailService.getMessage(user, messageId);
            const snippet = fullMessage.data.snippet;
            const payload = fullMessage.data.payload;
             // Extract body... (complex structure involved usually, simplified here)
            let body = snippet || '';
            if (payload?.body?.data) {
                body = Buffer.from(payload.body.data, 'base64').toString();
            } else if (payload?.parts) {
                // simple search for text/plain
                const part = payload.parts.find(p => p.mimeType === 'text/plain');
                if (part?.body?.data) {
                    body = Buffer.from(part.body.data, 'base64').toString();
                }
            }

            // Categorize
            const categories = await this.categoriesService.findAll(user.id);
            const categoryName = await this.aiService.categorizeEmail(body, categories);

            if (categoryName) {
                const category = categories.find(c => c.name === categoryName);
                if (category) {
                    // Summarize
                    const summary = await this.aiService.summarizeEmail(body);

                    // Save to DB
                    await this.emailsService.create({
                        googleMessageId: messageId,
                        subject: payload?.headers?.find(h => h.name === 'Subject')?.value ?? 'No Subject',
                        sender: payload?.headers?.find(h => h.name === 'From')?.value ?? 'Unknown',
                        snippet: snippet ?? '',
                        summary,
                        receivedAt: new Date(parseInt(fullMessage.data.internalDate || Date.now().toString())),
                        categoryId: category.id,
                    }, user.id);

                    // Modify Gmail (Remove Inbox, Add Label?)
                    // For now, just Archive (Remove INBOX)
                    await this.gmailService.modifyMessage(user, messageId, [], ['INBOX']);
                    console.log(`Processed and archived: ${messageId} -> ${categoryName}`);
                }
            }
        }
        
        // Update user historyId?
        // history.data.historyId is the new one?
        // Actually history.list returns historyId of the response? No, we should use the one from Push Notification?
        // The push notification has the NEW historyId. passed in job.data.
        await this.usersService.updateHistoryId(user.id, historyId);
        
    } catch (e) {
        console.error('Error processing email:', e);
    }
  }
}
