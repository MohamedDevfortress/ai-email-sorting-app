import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const prompt = request.query.prompt || 'consent';
    const linkTo = request.query.linkTo; // User ID to link this account to
    
    return {
      prompt,
      accessType: 'offline',
      state: linkTo ? JSON.stringify({ linkTo }) : undefined,
    };
  }
}
