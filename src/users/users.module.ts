import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { UserPreference, UserPreferenceSchema } from './schemas/user-preference.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { EmailVerification, EmailVerificationSchema } from './schemas/email-verification.schema';
import { JwtService } from '../common/services/jwt.service';
import { EmailService } from '../common/services/email.service';
import { GoogleStrategy } from '../common/strategies/google.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserPreference.name, schema: UserPreferenceSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: EmailVerification.name, schema: EmailVerificationSchema },
    ]),
    PassportModule.register({ session: false }),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtService, EmailService, GoogleStrategy],
  exports: [UsersService, JwtService],
})
export class UsersModule {}
