import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify token with Next.js backend
      // Try both cookie names (NextAuth v5 uses authjs.session-token)
      const response = await axios.get(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/token/verify`,
        {
          headers: {
            Cookie: `authjs.session-token=${token}`,
          },
        }
      );

      if (response.data.valid) {
        request.user = response.data.user;
        return true;
      }

      throw new UnauthorizedException('Invalid token');
    } catch (error) {
      console.error('Auth guard error:', error.response?.data || error.message);
      throw new UnauthorizedException('Token verification failed');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
