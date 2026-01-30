import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authorization token provided');
    }

    try {
      // Verify JWT token
      const secret = this.configService.get<string>('NEXTAUTH_SECRET');
      if (!secret) {
        throw new Error('NEXTAUTH_SECRET not configured');
      }

      const decoded = jwt.verify(token, secret) as any;
      
      // Attach user info to request
      request.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        name: decoded.name,
      };

      return true;
    } catch (error) {
      console.error('Auth guard error:', error.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
