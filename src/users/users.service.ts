import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UserPreference, UserPreferenceDocument } from './schemas/user-preference.schema';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import { UpdatePreferenceDto } from './dto/preference.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserPreference.name) private preferenceModel: Model<UserPreferenceDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: createUserDto.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = new this.userModel({
      email: createUserDto.email.toLowerCase(),
      password: hashedPassword,
      name: createUserDto.name,
    });

    return user.save();
  }

  async validateUser(loginDto: LoginDto): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email: loginDto.email.toLowerCase() });
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    return user;
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async getPreferences(userId: string): Promise<UserPreferenceDocument> {
    let preference = await this.preferenceModel.findOne({ userId });
    
    if (!preference) {
      // Create default preferences if not exists
      preference = new this.preferenceModel({
        userId,
        viewMode: 'grid',
        settings: {},
      });
      await preference.save();
    }
    
    return preference;
  }

  async updatePreferences(userId: string, updateDto: UpdatePreferenceDto): Promise<UserPreferenceDocument> {
    let preference = await this.preferenceModel.findOne({ userId });
    
    if (!preference) {
      preference = new this.preferenceModel({
        userId,
        ...updateDto,
      });
    } else {
      if (updateDto.viewMode) preference.viewMode = updateDto.viewMode;
      if (updateDto.settings) preference.settings = { ...preference.settings, ...updateDto.settings };
    }
    
    return preference.save();
  }
}
