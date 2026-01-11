import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { EmailsService } from './emails.service';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { GmailService } from '../gmail/gmail.service';
import { UsersService } from '../users/users.service';

@Controller('emails')
@UseGuards(AuthGuard('jwt'))
export class EmailsController {
  constructor(
    private readonly emailsService: EmailsService,
    private readonly gmailService: GmailService,
    private readonly usersService: UsersService,
    @InjectQueue('unsubscribe-queue') private readonly unsubscribeQueue: Queue,
  ) {}

  @Post()
  create(@Body() createEmailDto: CreateEmailDto, @Req() req) {
    return this.emailsService.create(createEmailDto, req.user.userId);
  }

  @Get()
  findAll(@Req() req) {
    return this.emailsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.emailsService.findOne(id, req.user.userId);
  }

  @Get(':id/original')
  async getOriginalEmail(@Param('id') id: string, @Req() req) {
    // Get the email record to get the googleMessageId
    const email = await this.emailsService.findOne(id, req.user.userId);
    if (!email) {
      return { error: 'Email not found' };
    }

    // Use the currently logged-in user's credentials (from JWT)
    const user = await this.usersService.findOne(req.user.userId);
    if (!user) {
      return { error: 'User not found' };
    }

    // Fetch the original email from Gmail using current user's credentials
    const originalEmail = await this.gmailService.getFullMessage(user, email.googleMessageId);

    return originalEmail;
  }

  @Delete('bulk')
  async bulkDelete(@Body() body: { emailIds: string[] }, @Req() req) {
    // Delete emails from database
    await this.emailsService.bulkDelete(body.emailIds, req.user.userId);
    
    // Optionally delete from Gmail as well
    const user = await this.usersService.findOne(req.user.userId);
    if (user) {
      for (const emailId of body.emailIds) {
        const email = await this.emailsService.findOne(emailId, req.user.userId);
        if (email) {
          try {
            await this.gmailService.deleteMessage(user, email.googleMessageId);
          } catch (error) {
            console.error(`Failed to delete email ${emailId} from Gmail:`, error);
          }
        }
      }
    }

    return { success: true, deleted: body.emailIds.length };
  }

  @Post('unsubscribe')
  async bulkUnsubscribe(@Body() body: { emailIds: string[] }, @Req() req, @Res() res) {
    try {
      const job = await this.unsubscribeQueue.add('process-unsubscribe', {
        emailIds: body.emailIds,
        userId: req.user.userId,
      });

      return res.json({
        success: true,
        message: 'Unsubscribe process started',
        jobId: job.id,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  @Get('unsubscribe/status/:jobId')
  async getUnsubscribeStatus(@Param('jobId') jobId: string) {
    try {
      const job = await this.unsubscribeQueue.getJob(jobId);
      
      if (!job) {
        return {
          status: 'not_found',
          message: 'Job not found',
        };
      }

      const state = await job.getState();
      const progress = job.progress();
      const result = job.returnvalue;

      return {
        status: state,
        progress,
        result,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }
}
