import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res, Query } from '@nestjs/common';
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
  @UseGuards(AuthGuard('jwt'))
  findAll(
    @Req() req,
    @Query('categoryId') categoryId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const userId = req.user.userId;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    return this.emailsService.findAll(userId, categoryId, pageNum, limitNum);
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
    console.log(`Bulk delete request for ${body.emailIds.length} emails`);
    
    const user = await this.usersService.findOne(req.user.userId);
    if (!user) {
      console.error('User not found for Gmail deletion');
      // Still delete from database even if user not found
      await this.emailsService.bulkDelete(body.emailIds, req.user.userId);
      return { success: true, deleted: body.emailIds.length, gmailDeleted: 0 };
    }

    // Get Gmail message IDs BEFORE deleting from db
    const emailsToDelete: Array<{ id: string; googleMessageId: string }> = [];
    for (const emailId of body.emailIds) {
      try {
        const email = await this.emailsService.findOne(emailId, req.user.userId);
        if (email && email.googleMessageId) {
          emailsToDelete.push({ id: emailId, googleMessageId: email.googleMessageId });
        } else {
          console.warn(`Email ${emailId} not found or missing googleMessageId`);
        }
      } catch (error) {
        console.error(`Error fetching email ${emailId}:`, error.message);
      }
    }
    
    // Now delete from database
    await this.emailsService.bulkDelete(body.emailIds, req.user.userId);
    console.log(`Deleted ${body.emailIds.length} emails from database`);

    // Delete from Gmail (move to trash)
    let gmailDeletedCount = 0;
    const errors: Array<{ emailId: string; error: string }> = [];
    
    for (const emailData of emailsToDelete) {
      try {
        console.log(`Moving to trash Gmail message: ${emailData.googleMessageId}`);
        await this.gmailService.trashMessage(user, emailData.googleMessageId);
        gmailDeletedCount++;
        console.log(`Successfully moved to trash: ${emailData.googleMessageId}`);
      } catch (error) {
        console.error(`Failed to trash email ${emailData.id} from Gmail:`, error.message);
        errors.push({ emailId: emailData.id, error: error.message });
      }
    }

    return { 
      success: true, 
      deleted: body.emailIds.length,
      gmailDeleted: gmailDeletedCount,
      errors: errors.length > 0 ? errors : undefined
    };
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
