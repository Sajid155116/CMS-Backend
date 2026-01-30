import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string; // userId
  email: string;
  name?: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry = '15m'; // 15 minutes
  private readonly refreshTokenExpiry = '7d'; // 7 days

  constructor(private configService: ConfigService) {
    this.accessTokenSecret = this.configService.get<string>('JWT_ACCESS_SECRET') || 
                             this.configService.get<string>('NEXTAUTH_SECRET') || 
                             'your-secret-key';
    this.refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 
                              this.configService.get<string>('NEXTAUTH_SECRET') || 
                              'your-refresh-secret';
  }

  generateTokenPair(userId: string, email: string, name?: string): TokenPair {
    const accessPayload: TokenPayload = {
      sub: userId,
      email,
      name,
      type: 'access',
    };

    const refreshPayload: TokenPayload = {
      sub: userId,
      email,
      name,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as TokenPayload;
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as TokenPayload;
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }
}
