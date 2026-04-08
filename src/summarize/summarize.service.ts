import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LlmService } from './services/llmService';
import { SummaryRepository } from './summary.repository';
import { SummarizeRequestDto, SummarizeResponseDto } from './dto/summarize.dto';
import { buildTextHash, normalizeText } from './utils/hash.util';

@Injectable()
export class SummarizeService {
  private readonly logger = new Logger(SummarizeService.name);

  constructor(
    private readonly summaryRepository: SummaryRepository,
    private readonly llmService: LlmService,
  ) {}

  async summarize(input: SummarizeRequestDto): Promise<SummarizeResponseDto> {
    const normalized = normalizeText(input.text || '');
    if (!normalized) {
      throw new BadRequestException('text must not be empty');
    }

    const hash = buildTextHash(normalized);
    const cached = await this.summaryRepository.findByHash(hash);

    if (cached) {
      return {
        summary: cached.summary,
        keyPoints: cached.keyPoints || [],
        actionItems: cached.actionItems || [],
        source: 'cache',
      };
    }

    let llmResult: { summary: string; keyPoints: string[]; actionItems: string[] };
    if (normalized.length <= 80) {
      llmResult = {
        summary: normalized,
        keyPoints: [normalized],
        actionItems: [],
      };
    } else {
      try {
        llmResult = await this.llmService.generateSummary(normalized, input.type);
      } catch (error) {
        this.logger.error('LLM summarization failed', error instanceof Error ? error.stack : undefined);
        return {
          summary: 'Unable to summarize right now. Please try again shortly.',
          keyPoints: [],
          actionItems: [],
          source: 'llm',
        };
      }
    }

    void this.storeSummaryAsync({
      hash,
      inputText: normalized,
      summary: llmResult.summary,
      keyPoints: llmResult.keyPoints,
      actionItems: llmResult.actionItems,
    });

    return {
      summary: llmResult.summary,
      keyPoints: llmResult.keyPoints,
      actionItems: llmResult.actionItems,
      source: 'llm',
    };
  }

  private async storeSummaryAsync(input: {
    hash: string;
    inputText: string;
    summary: string;
    keyPoints: string[];
    actionItems: string[];
  }): Promise<void> {
    try {
      await this.summaryRepository.saveIfAbsent(input);
    } catch (error) {
      this.logger.warn(
        `Background summary persistence failed for hash ${input.hash}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
