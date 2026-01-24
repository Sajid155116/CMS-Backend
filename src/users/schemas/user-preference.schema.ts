import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserPreferenceDocument = UserPreference & Document;

@Schema({ timestamps: true })
export class UserPreference {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: 'grid', enum: ['grid', 'list'] })
  viewMode: string;

  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserPreferenceSchema = SchemaFactory.createForClass(UserPreference);

// Transform to JSON
UserPreferenceSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    (ret as any).id = ret._id;
    delete (ret as any)._id;
    return ret;
  },
});
