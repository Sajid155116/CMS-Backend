import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ItemType {
  FILE = 'file',
  FOLDER = 'folder',
}

@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class Item extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ItemType })
  type: ItemType;

  @Prop({ type: String, default: null, index: true })
  parentId: string | null;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ type: Number })
  size?: number;

  @Prop()
  mimeType?: string;

  @Prop()
  storageKey?: string;

  @Prop({ required: true, index: true })
  path: string;
}

export const ItemSchema = SchemaFactory.createForClass(Item);

// Transform _id to id for JSON responses
ItemSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    (ret as any).id = ret._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

// Create compound index for unique name per parent per user
ItemSchema.index({ parentId: 1, userId: 1, name: 1 }, { unique: true });

// Document type with timestamps
export type ItemDocument = Item & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export interface ItemWithChildren extends ItemDocument {
  children?: ItemDocument[];
}
