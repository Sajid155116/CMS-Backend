import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SummaryDocument = Summary & Document;

@Schema({ collection: 'summaries', timestamps: false })
export class Summary {
  @Prop({ required: true, unique: true, index: true })
  hash: string;

  @Prop({ required: true })
  inputText: string;

  @Prop({ required: true })
  summary: string;

  @Prop({ type: [String], default: [] })
  keyPoints: string[];

  @Prop({ type: [String], default: [] })
  actionItems: string[];

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const SummarySchema = SchemaFactory.createForClass(Summary);

SummarySchema.index({ hash: 1 }, { unique: true });
