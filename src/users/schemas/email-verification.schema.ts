import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmailVerificationDocument = EmailVerification & Document;

@Schema({ timestamps: true })
export class EmailVerification {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop()
  createdAt: Date;
}

export const EmailVerificationSchema = SchemaFactory.createForClass(EmailVerification);

// Create TTL index to auto-delete expired tokens after 24 hours
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
