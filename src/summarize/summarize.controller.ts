import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SummarizeRequestDto, SummarizeResponseDto } from './dto/summarize.dto';
import { SummarizeService } from './summarize.service';

@ApiTags('Summarize')
@Controller('summarize')
export class SummarizeController {
  constructor(private readonly summarizeService: SummarizeService) {}

  @Post()
  @ApiOperation({ summary: 'Summarize text with MongoDB cache and async persistence' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', example: 'Long text to summarize...' },
        type: { type: 'string', enum: ['bullet', 'paragraph'] },
      },
      required: ['text'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Summary generated',
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        keyPoints: { type: 'array', items: { type: 'string' } },
        actionItems: { type: 'array', items: { type: 'string' } },
        source: { type: 'string', enum: ['cache', 'llm'] },
      },
    },
  })
  async summarize(@Body() body: SummarizeRequestDto): Promise<SummarizeResponseDto> {
    return this.summarizeService.summarize(body);
  }
}
