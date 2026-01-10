import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { ConnectedAccount } from './entities/connected-account.entity';
import { AccountGroup } from './entities/account-group.entity';
import { GmailModule } from '../gmail/gmail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ConnectedAccount, AccountGroup]),
    GmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
