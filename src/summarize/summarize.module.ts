import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LlmService } from './services/llmService';
import { Summary, SummarySchema } from './schemas/summary.schema';
import { SummaryRepository } from './summary.repository';
import { SummarizeController } from './summarize.controller';
import { SummarizeService } from './summarize.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Summary.name, schema: SummarySchema }])],
  controllers: [SummarizeController],
  providers: [SummarizeService, LlmService, SummaryRepository],
  exports: [LlmService],
})
export class SummarizeModule {}
