import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

export type ContentKind = 'logs' | 'document' | 'notes' | 'code';

export type LlmSummaryResponse = {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
};

type OpenRouterError = {
  error?: {
    message?: string;
    code?: number | string;
  };
};

@Injectable()
export class LlmService {
  private readonly maxInputChars = 12000;

  async generateSummary(content: string, type?: string): Promise<LlmSummaryResponse> {
    const apiKey = process.env.LLM_API_KEY;
    const apiUrl = process.env.LLM_API_URL;
    const model = process.env.LLM_MODEL;

    if (!apiKey || !apiUrl || !model) {
      throw new InternalServerErrorException(
        'LLM configuration is missing. Ensure LLM_API_KEY, LLM_API_URL, and LLM_MODEL are set.',
      );
    }

    const trimmed = content.trim();
    if (!trimmed) {
      throw new InternalServerErrorException('Cannot summarize empty content.');
    }

    const contentType = this.detectContentType(trimmed);
    const prompt = this.buildPrompt(trimmed.slice(0, this.maxInputChars), contentType, type);

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful AI assistant. Always return valid JSON with summary, keyPoints, and actionItems fields.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
        }),
      });
    } catch {
      throw new ServiceUnavailableException('Failed to connect to LLM provider. Please try again.');
    }

    if (response.status === 429) {
      throw new HttpException('LLM rate limit exceeded. Please retry shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!response.ok) {
      let errorMessage = 'LLM request failed.';
      try {
        const errorPayload = (await response.json()) as OpenRouterError;
        if (errorPayload?.error?.message) {
          errorMessage = errorPayload.error.message;
        }
      } catch {
        // Ignore JSON parse errors for failed responses.
      }

      throw new ServiceUnavailableException(`LLM request failed: ${errorMessage}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawContent = payload.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      throw new ServiceUnavailableException('LLM returned an empty response.');
    }

    return this.parseStructuredResponse(rawContent);
  }

  private detectContentType(content: string): ContentKind {
    const lower = content.toLowerCase();

    const looksLikeCode =
      /```|\b(function|const|let|var|class|import|export|if\s*\(|for\s*\(|while\s*\(|return)\b/.test(lower) ||
      /[{};<>]/.test(content);
    if (looksLikeCode) {
      return 'code';
    }

    const looksLikeLogs =
      /\b(error|exception|warn|info|trace|fatal|stack trace|http\s*5\d\d|http\s*4\d\d)\b/.test(lower) ||
      /\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}/.test(content);
    if (looksLikeLogs) {
      return 'logs';
    }

    const looksLikeNotes =
      /^\s*[-*]\s+/m.test(content) || /\b(todo|note|meeting|reminder|next steps)\b/.test(lower);
    if (looksLikeNotes) {
      return 'notes';
    }

    return 'document';
  }

  private buildPrompt(content: string, contentType: ContentKind, type?: string): string {
    const outputStyle = type === 'paragraph' ? 'Keep summary as a short paragraph.' : 'Keep summary concise.';

    const instructionByType: Record<ContentKind, string> = {
      logs: 'Summarize the issue, root cause, and suggested fix.',
      document: 'Provide summary, key points, and action items.',
      notes: 'Summarize notes into outcomes, key points, and clear next actions.',
      code: 'Summarize code purpose, critical logic, risks, and suggested improvements.',
    };

    return [
      `Detected content type: ${contentType}.`,
      instructionByType[contentType],
      outputStyle,
      'Return strictly valid JSON with this shape and no markdown:',
      '{"summary":"string","keyPoints":["string"],"actionItems":["string"]}',
      '',
      'Content:',
      content,
    ].join('\n');
  }

  private parseStructuredResponse(raw: string): LlmSummaryResponse {
    const parsed = this.tryParseJson(raw) || this.tryParseJson(this.extractJsonObject(raw));

    if (!parsed || typeof parsed !== 'object') {
      throw new ServiceUnavailableException('LLM returned invalid JSON format.');
    }

    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const keyPoints = Array.isArray(parsed.keyPoints)
      ? (parsed.keyPoints as unknown[])
          .filter((item: unknown): item is string => typeof item === 'string')
          .map((item: string) => item.trim())
      : [];
    const actionItems = Array.isArray(parsed.actionItems)
      ? (parsed.actionItems as unknown[])
          .filter((item: unknown): item is string => typeof item === 'string')
          .map((item: string) => item.trim())
      : [];

    if (!summary) {
      throw new ServiceUnavailableException('LLM response missing summary field.');
    }

    return {
      summary,
      keyPoints,
      actionItems,
    };
  }

  private tryParseJson(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private extractJsonObject(value: string): string {
    const firstBrace = value.indexOf('{');
    const lastBrace = value.lastIndexOf('}');

    if (firstBrace < 0 || lastBrace <= firstBrace) {
      return '';
    }

    return value.slice(firstBrace, lastBrace + 1);
  }
}
