import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { GmailService } from '../gmail/gmail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private gmailService: GmailService,
  ) {}

  async validateUser(details: any, linkToUserId?: string | null) {
    const user = await this.usersService.createOrUpdate(details);
    
    // If linking to an existing user, add this account to their group
    if (linkToUserId && linkToUserId !== user.id) {
      await this.usersService.linkAccounts(linkToUserId, user.id);
      // Return the original user so they stay logged in as that user
      const originalUser = await this.usersService.findOne(linkToUserId);
      if (originalUser) {
        return originalUser;
      }
    }
    
    // Ensure user has an account group (for first login)
    await this.usersService.ensureUserInAccountGroup(user.id);
    
    // Setup Gmail watch for this account
    try {
      const watchResult = await this.gmailService.watchInbox(user);
      console.log('Watch added')
      if (watchResult.data.historyId) {
        await this.usersService.updateHistoryId(user.id, watchResult.data.historyId);
      }
    } catch (error) {
      console.error('Failed to setup Gmail watch:', error);
      // Don't fail the login if watch setup fails
    }
    
    return user;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload, { secret: process.env.JWT_SECRET || 'secretKey' }),
    };
  }
}
