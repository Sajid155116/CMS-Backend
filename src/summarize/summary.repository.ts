import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Summary, SummaryDocument } from './schemas/summary.schema';

@Injectable()
export class SummaryRepository {
  constructor(
    @InjectModel(Summary.name)
    private readonly summaryModel: Model<SummaryDocument>,
  ) {}

  async findByHash(hash: string): Promise<SummaryDocument | null> {
    return this.summaryModel.findOne({ hash }).exec();
  }

  async saveIfAbsent(input: {
    hash: string;
    inputText: string;
    summary: string;
    keyPoints: string[];
    actionItems: string[];
  }): Promise<void> {
    await this.summaryModel
      .updateOne(
        { hash: input.hash },
        {
          $setOnInsert: {
            hash: input.hash,
            inputText: input.inputText,
            summary: input.summary,
            keyPoints: input.keyPoints,
            actionItems: input.actionItems,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      )
      .exec();
  }
}
