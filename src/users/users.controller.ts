import { Controller, Post, Get, Patch, Body, HttpCode, HttpStatus, Req, UseGuards, Ip, Query, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import { UpdatePreferenceDto } from './dto/preference.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Response } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() createUserDto: CreateUserDto, @Ip() ip: string) {
    const user = await this.usersService.create(createUserDto);
    
    // Auto-login after signup
    const userId = user._id.toString();
    const tokens = await this.usersService.login({ email: user.email, password: createUserDto.password }, ip);
    
    return tokens;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Ip() ip: string) {
    return this.usersService.login(loginDto, ip);
  }

  @Get('auth/google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('auth/google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response, @Ip() ip: string) {
    const result = await this.usersService.googleLogin(req.user, ip);
    
    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
    
    res.redirect(redirectUrl);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    return this.usersService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    return this.usersService.resendVerificationEmail(email);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.usersService.refreshAccessToken(refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refreshToken') refreshToken: string) {
    await this.usersService.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('preferences')
  @UseGuards(AuthGuard)
  async getPreferences(@CurrentUser() userId: string) {
    return this.usersService.getPreferences(userId);
  }

  @Patch('preferences')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePreferences(@CurrentUser() userId: string, @Body() updateDto: UpdatePreferenceDto) {
    return this.usersService.updatePreferences(userId, updateDto);
  }
}
