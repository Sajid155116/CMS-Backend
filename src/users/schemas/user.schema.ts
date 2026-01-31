import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false }) // Not required for OAuth users
  password: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ type: String, enum: ['local', 'google'], default: 'local' })
  authProvider: string;

  @Prop()
  googleId: string;

  @Prop()
  avatar: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Transform to JSON - remove password
UserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    (ret as any).id = ret._id;
    delete (ret as any)._id;
    delete (ret as any).password;
    return ret;
  },
});
