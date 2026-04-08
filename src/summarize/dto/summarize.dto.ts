import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SummarizeRequestDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  @IsIn(['bullet', 'paragraph'])
  type?: 'bullet' | 'paragraph';
}

export class SummarizeResponseDto {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  source: 'cache' | 'llm';
}
