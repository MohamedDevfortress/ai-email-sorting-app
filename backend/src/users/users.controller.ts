import { Controller, Get, Post, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { GmailService } from '../gmail/gmail.service';
import { JwtService } from '@nestjs/jwt';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly gmailService: GmailService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('connected-accounts')
  async getConnectedAccounts(@Req() req) {
    return this.usersService.getConnectedAccounts(req.user.userId);
  }

  @Post('connected-accounts/:accountId/activate')
  async activateAccount(@Param('accountId') accountId: string, @Req() req) {
    await this.usersService.setActiveAccount(req.user.userId, accountId);
    return { success: true };
  }

  @Post('switch-account/:targetUserId')
  async switchAccount(@Param('targetUserId') targetUserId: string, @Req() req) {
    // Verify both users are in the same account group
    const canSwitch = await this.usersService.setActiveAccount(req.user.userId, targetUserId);
    
    if (!canSwitch) {
      return { success: false, message: 'Cannot switch to this account' };
    }

    // Generate new JWT for the target user
    const targetUser = await this.usersService.findOne(targetUserId);
    if (!targetUser) {
      return { success: false, message: 'User not found' };
    }

    const payload = { email: targetUser.email, sub: targetUser.id };
    const access_token = this.jwtService.sign(payload, { 
      secret: process.env.JWT_SECRET || 'secretKey' 
    });

    return { success: true, access_token };
  }

  @Delete('connected-accounts/:accountId')
  async removeAccount(@Param('accountId') accountId: string) {
    await this.usersService.removeConnectedAccount(accountId);
    return { success: true };
  }

  @Post('setup-watch')
  async setupWatch(@Req() req) {
    await this.usersService.setupGmailWatch(req.user.userId, this.gmailService);
    return { success: true, message: 'Gmail watch setup initiated' };
  }
}
