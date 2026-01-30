import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UserPreference, UserPreferenceDocument } from './schemas/user-preference.schema';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import { UpdatePreferenceDto } from './dto/preference.dto';
import { JwtService, TokenPair } from '../common/services/jwt.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserPreference.name) private preferenceModel: Model<UserPreferenceDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
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

  async login(loginDto: LoginDto, ip?: string): Promise<TokenPair & { user: any }> {
    const user = await this.validateUser(loginDto);
    const userId = user._id.toString();

    // Generate tokens
    const tokens = this.jwtService.generateTokenPair(userId, user.email, user.name);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.refreshTokenModel.create({
      userId,
      token: tokens.refreshToken,
      expiresAt,
      createdByIp: ip,
    });

    return {
      ...tokens,
      user: {
        id: userId,
        email: user.email,
        name: user.name,
      },
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    // Check if token exists in database and is not revoked
    const storedToken = await this.refreshTokenModel.findOne({
      token: refreshToken,
      revoked: false,
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Get user details
    const user = await this.userModel.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new token pair
    const tokens = this.jwtService.generateTokenPair(user._id.toString(), user.email, user.name);

    // Store new refresh token
    const expiresAtNew = new Date();
    expiresAtNew.setDate(expiresAtNew.getDate() + 7);

    await this.refreshTokenModel.create({
      userId: user._id.toString(),
      token: tokens.refreshToken,
      expiresAt: expiresAtNew,
    });

    // Revoke old refresh token
    storedToken.revoked = true;
    storedToken.revokedAt = new Date();
    await storedToken.save();

    return tokens;
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const token = await this.refreshTokenModel.findOne({ token: refreshToken });
    if (token) {
      token.revoked = true;
      token.revokedAt = new Date();
      await token.save();
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() }
    );
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
