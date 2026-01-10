import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { User } from '../users/entities/user.entity';

@Injectable()
export class GmailService {
  constructor(private configService: ConfigService) {}

  private getOAuthClient(user: User) {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_CALLBACK_URL'),
    );
    
    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
    });

    // Automatically refresh access token when it expires
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.access_token) {
        // Token was refreshed, you might want to save it
        console.log('Access token refreshed');
      }
    });

    return oauth2Client;
  }

  async getProfile(user: User) {
    const auth = this.getOAuthClient(user);
    const gmail = google.gmail({ version: 'v1', auth });
    return gmail.users.getProfile({ userId: 'me' });
  }

  async watchInbox(user: User) {
    const auth = this.getOAuthClient(user);
    const gmail = google.gmail({ version: 'v1', auth });
    return gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: this.configService.get('GMAIL_TOPIC_NAME'),
      },
    });
  }

  async getHistory(user: User, startHistoryId: string) {
    const auth = this.getOAuthClient(user);
    const gmail = google.gmail({ version: 'v1', auth });
    return gmail.users.history.list({
      userId: 'me',
      startHistoryId,
    });
  }

  async getMessage(user: User, messageId: string) {
    const auth = this.getOAuthClient(user);
    const gmail = google.gmail({ version: 'v1', auth });
    return gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
  }

  async modifyMessage(user: User, messageId: string, addLabelIds: string[] = [], removeLabelIds: string[] = []) {
    const auth = this.getOAuthClient(user);
    const gmail = google.gmail({ version: 'v1', auth });
    return gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds,
        removeLabelIds,
      },
    });
  }

  async getFullMessage(user: User, messageId: string) {
    const auth = this.getOAuthClient(user);
    const gmail = google.gmail({ version: 'v1', auth });
    
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    // Parse the email body
    let body = '';
    let htmlBody = '';

    const getBody = (parts: any[]): void => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          getBody(part.parts);
        }
      }
    };

    if (response.data.payload?.parts) {
      getBody(response.data.payload.parts);
    } else if (response.data.payload?.body?.data) {
      // Single part message
      const data = response.data.payload.body.data;
      if (response.data.payload.mimeType === 'text/html') {
        htmlBody = Buffer.from(data, 'base64').toString('utf-8');
      } else {
        body = Buffer.from(data, 'base64').toString('utf-8');
      }
    }

    return {
      id: response.data.id,
      threadId: response.data.threadId,
      subject: response.data.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '',
      from: response.data.payload?.headers?.find((h: any) => h.name === 'From')?.value || '',
      to: response.data.payload?.headers?.find((h: any) => h.name === 'To')?.value || '',
      date: response.data.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '',
      body: htmlBody || body,
      isHtml: !!htmlBody,
    };
  }

  async deleteMessage(user: User, messageId: string) {
    const auth = this.getOAuthClient(user);
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Move to trash instead of permanent delete
    // This is safer and matches user expectations
    return gmail.users.messages.trash({
      userId: 'me',
      id: messageId,
    });
  }

  async trashMessage(user: User, messageId: string) {
    const auth = this.getOAuthClient(user);
    const gmail = google.gmail({ version: 'v1', auth });
    
    return gmail.users.messages.trash({
      userId: 'me',
      id: messageId,
    });
  }

  async permanentlyDeleteMessage(user: User, messageId: string) {
    const auth = this.getOAuthClient(user);
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Permanently delete - use with caution!
    return gmail.users.messages.delete({
      userId: 'me',
      id: messageId,
    });
  }
}
