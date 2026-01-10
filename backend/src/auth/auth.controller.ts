import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {
    // The prompt query param is handled by GoogleAuthGuard
    // Usage: /auth/google?prompt=select_account
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    // Check if this is adding an account to an existing user
    let linkToUserId: string | null = null;
    if (req.query.state) {
      try {
        const state = JSON.parse(req.query.state as string);
        linkToUserId = state.linkTo;
      } catch (e) {
        // Invalid state, ignore
      }
    }

    const user = await this.authService.validateUser(req.user, linkToUserId);
    const { access_token } = await this.authService.login(user);
    
    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3001'}/dashboard?token=${access_token}`);
  }
}
