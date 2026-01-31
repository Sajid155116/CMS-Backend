import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from './schemas/user.schema';
import { UserPreference, UserPreferenceDocument } from './schemas/user-preference.schema';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { EmailVerification, EmailVerificationDocument } from './schemas/email-verification.schema';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import { UpdatePreferenceDto } from './dto/preference.dto';
import { JwtService, TokenPair } from '../common/services/jwt.service';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserPreference.name) private preferenceModel: Model<UserPreferenceDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(EmailVerification.name) private emailVerificationModel: Model<EmailVerificationDocument>,
    private jwtService: JwtService,
    private emailService: EmailService,
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
      authProvider: 'local',
      emailVerified: false,
    });

    await user.save();

    // Generate verification token
    await this.sendVerificationEmail(user);

    return user;
  }

  async validateUser(loginDto: LoginDto): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email: loginDto.email.toLowerCase() });
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.authProvider !== 'local') {
      throw new UnauthorizedException(`Please sign in with ${user.authProvider}`);
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email address. Check your inbox for the verification link.');
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

  // Email Verification Methods
  async sendVerificationEmail(user: UserDocument): Promise<void> {
    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    // Delete any existing verification tokens for this user
    await this.emailVerificationModel.deleteMany({ userId: user._id });

    // Create new verification token
    await this.emailVerificationModel.create({
      userId: user._id,
      token,
      email: user.email,
      expiresAt,
    });

    // Send email
    await this.emailService.sendVerificationEmail(user.email, user.name, token);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const verification = await this.emailVerificationModel.findOne({ token, used: false });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    // Update user
    const user = await this.userModel.findById(verification.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.emailVerified = true;
    await user.save();

    // Mark verification as used
    verification.used = true;
    await verification.save();

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email, user.name);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    await this.sendVerificationEmail(user);

    return { message: 'Verification email sent' };
  }

  // Google OAuth Methods
  async findOrCreateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }): Promise<UserDocument> {
    // Check if user exists with this googleId
    let user = await this.userModel.findOne({ googleId: googleUser.googleId });

    if (user) {
      return user;
    }

    // Check if user exists with this email
    user = await this.userModel.findOne({ email: googleUser.email.toLowerCase() });

    if (user) {
      // Link Google account to existing user
      user.googleId = googleUser.googleId;
      user.authProvider = 'google';
      user.emailVerified = true; // Google emails are verified
      if (googleUser.avatar) user.avatar = googleUser.avatar;
      return user.save();
    }

    // Create new user
    user = new this.userModel({
      email: googleUser.email.toLowerCase(),
      name: googleUser.name,
      googleId: googleUser.googleId,
      authProvider: 'google',
      emailVerified: true, // Google emails are pre-verified
      avatar: googleUser.avatar,
    });

    return user.save();
  }

  async googleLogin(googleUser: any, ip?: string): Promise<TokenPair & { user: any }> {
    const user = await this.findOrCreateGoogleUser(googleUser);
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
        avatar: user.avatar,
        emailVerified: user.emailVerified,
      },
    };
  }
}
