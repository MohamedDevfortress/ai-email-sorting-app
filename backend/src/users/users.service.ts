import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ConnectedAccount } from './entities/connected-account.entity';
import { AccountGroup } from './entities/account-group.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ConnectedAccount)
    private connectedAccountRepository: Repository<ConnectedAccount>,
    @InjectRepository(AccountGroup)
    private accountGroupRepository: Repository<AccountGroup>,
  ) {}

  async createOrUpdate(userData: Partial<User>): Promise<User> {
    const { email } = userData;
    let user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      user = this.usersRepository.create(userData);
    } else {
      if (userData.accessToken) user.accessToken = userData.accessToken;
      if (userData.refreshToken) user.refreshToken = userData.refreshToken;
      if (userData.firstName) user.firstName = userData.firstName;
      if (userData.lastName) user.lastName = userData.lastName;
      if (userData.picture) user.picture = userData.picture;
    }

    return this.usersRepository.save(user);
  }

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async updateHistoryId(userId: string, historyId: string) {
    return this.usersRepository.update(userId, { historyId });
  }

  async ensureUserInAccountGroup(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['accountGroups'],
    });

    if (!user) return;

    // If user has no account groups, create one with just this user
    if (!user.accountGroups || user.accountGroups.length === 0) {
      const group = this.accountGroupRepository.create({});
      const savedGroup = await this.accountGroupRepository.save(group);
      user.accountGroups = [savedGroup];
      await this.usersRepository.save(user);
    }
  }

  async linkAccounts(primaryUserId: string, secondaryUserId: string) {
    const primaryUser = await this.usersRepository.findOne({
      where: { id: primaryUserId },
      relations: ['accountGroups'],
    });

    const secondaryUser = await this.usersRepository.findOne({
      where: { id: secondaryUserId },
      relations: ['accountGroups'],
    });

    if (!primaryUser || !secondaryUser) return;

    // Get or create primary user's group
    let group: AccountGroup;
    if (primaryUser.accountGroups && primaryUser.accountGroups.length > 0) {
      group = primaryUser.accountGroups[0];
    } else {
      group = this.accountGroupRepository.create({});
      group = await this.accountGroupRepository.save(group);
      primaryUser.accountGroups = [group];
      await this.usersRepository.save(primaryUser);
    }

    // Add secondary user to the same group
    if (!secondaryUser.accountGroups) {
      secondaryUser.accountGroups = [];
    }

    const alreadyInGroup = secondaryUser.accountGroups.some(g => g.id === group.id);
    if (!alreadyInGroup) {
      secondaryUser.accountGroups.push(group);
      await this.usersRepository.save(secondaryUser);
    }
  }

  // Connected Accounts Management - now uses AccountGroups
  async addConnectedAccount(userId: string, accountData: { email: string; accessToken: string; refreshToken: string }) {
    // Find or create the user for this email
    let targetUser = await this.usersRepository.findOne({ 
      where: { email: accountData.email },
      relations: ['accountGroups'],
    });

    if (!targetUser) {
      // Create new user for this email
      targetUser = this.usersRepository.create({
        email: accountData.email,
        accessToken: accountData.accessToken,
        refreshToken: accountData.refreshToken,
      });
      targetUser = await this.usersRepository.save(targetUser);
    }

    // Get current user with groups
    const currentUser = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['accountGroups'],
    });

    if (!currentUser) return null;

    // Find or create account group
    let group: AccountGroup;
    if (currentUser.accountGroups && currentUser.accountGroups.length > 0) {
      // Use existing group
      group = currentUser.accountGroups[0];
    } else {
      // Create new group
      group = this.accountGroupRepository.create({});
      group = await this.accountGroupRepository.save(group);
      currentUser.accountGroups = [group];
      await this.usersRepository.save(currentUser);
    }

    // Add target user to the same group if not already in it
    if (!targetUser.accountGroups) {
      targetUser.accountGroups = [];
    }
    
    const alreadyInGroup = targetUser.accountGroups.some(g => g.id === group.id);
    if (!alreadyInGroup) {
      targetUser.accountGroups.push(group);
      await this.usersRepository.save(targetUser);
    }

    return targetUser;
  }

  async setupGmailWatch(userId: string, gmailService: any) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return;

    try {
      const watchResult = await gmailService.watchInbox(user);
      if (watchResult.data.historyId) {
        await this.updateHistoryId(user.id, watchResult.data.historyId);
      }
    } catch (error) {
      console.error(`Failed to setup Gmail watch for user ${user.email}:`, error);
    }
  }

  async getConnectedAccounts(userId: string) {
    // Get user with their account groups
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['accountGroups', 'accountGroups.users'],
    });

    if (!user || !user.accountGroups || user.accountGroups.length === 0) {
      // No groups, return just this user if it exists
      if (!user) return [];
      
      return [{
        id: user.id,
        email: user.email,
        isActive: true,
        connectedAt: new Date(),
      }];
    }

    // Get all unique users from all groups this user belongs to
    const allUsers = new Map();
    for (const group of user.accountGroups) {
      for (const groupUser of group.users) {
        if (!allUsers.has(groupUser.id)) {
          allUsers.set(groupUser.id, {
            id: groupUser.id,
            email: groupUser.email,
            isActive: groupUser.id === userId,
            connectedAt: new Date(),
          });
        }
      }
    }

    return Array.from(allUsers.values());
  }

  async setActiveAccount(userId: string, targetUserId: string) {
    // This is now handled on the frontend by changing which user's token is used
    // We don't need to store "active" state in the backend
    // Just verify both users are in the same group
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['accountGroups', 'accountGroups.users'],
    });

    if (!user || !user.accountGroups || user.accountGroups.length === 0) {
      return false;
    }

    // Check if target user is in the same group
    for (const group of user.accountGroups) {
      const targetInGroup = group.users.some(u => u.id === targetUserId);
      if (targetInGroup) {
        return true;
      }
    }

    return false;
  }

  async getActiveAccount(userId: string) {
    return this.connectedAccountRepository.findOne({
      where: { user: { id: userId }, isActive: true },
    });
  }

  async removeConnectedAccount(accountId: string) {
    return this.connectedAccountRepository.delete(accountId);
  }
}
