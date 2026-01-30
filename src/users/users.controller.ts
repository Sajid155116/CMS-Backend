import { Controller, Post, Get, Patch, Body, HttpCode, HttpStatus, Req, UseGuards, Ip } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import { UpdatePreferenceDto } from './dto/preference.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Ip() ip: string) {
    return this.usersService.login(loginDto, ip);
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
