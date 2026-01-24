import { Controller, Post, Get, Patch, Body, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import { UpdatePreferenceDto } from './dto/preference.dto';
import { AuthGuard } from '../common/guards/auth.guard';

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
  async login(@Body() loginDto: LoginDto) {
    const user = await this.usersService.validateUser(loginDto);
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };
  }

  @Get('preferences')
  @UseGuards(AuthGuard)
  async getPreferences(@Req() request: any) {
    const userId = request.user.id;
    return this.usersService.getPreferences(userId);
  }

  @Patch('preferences')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePreferences(@Req() request: any, @Body() updateDto: UpdatePreferenceDto) {
    const userId = request.user.id;
    return this.usersService.updatePreferences(userId, updateDto);
  }
}
