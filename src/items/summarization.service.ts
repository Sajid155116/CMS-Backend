import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SummarizationService {
  private readonly summarizerBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.summarizerBaseUrl =
      this.configService.get<string>('SUMMARIZER_API_URL') || 'http://localhost:8000';
  }

  async summarizeFile(input: {
    buffer: Buffer;
    filename: string;
    mimeType?: string;
  }): Promise<{ answer: string; sources: string[]; documentId: string }> {
    const mimeType = input.mimeType || this.guessMimeType(input.filename);
    if (!this.isSupportedFile(input.filename, mimeType)) {
      throw new BadRequestException('Only PDF and text-based files are supported for summarization.');
    }

    const fileBytes = input.buffer.buffer.slice(
      input.buffer.byteOffset,
      input.buffer.byteOffset + input.buffer.byteLength,
    ) as ArrayBuffer;

    const formData = new FormData();
    formData.append('file', new Blob([fileBytes], { type: mimeType }), input.filename);

    const uploadData = await this.postForm('/api/documents/upload', formData);
    const documentId = uploadData.document_id as string;

    if (!documentId) {
      throw new InternalServerErrorException('Summarizer upload failed: missing document_id');
    }

    await this.postJson('/api/documents/process', {
      document_id: documentId,
    });

    const summaryData = await this.postJson('/api/documents/summarize', {
      document_id: documentId,
    });

    return {
      answer: (summaryData.answer as string) || '',
      sources: (summaryData.sources as string[]) || [],
      documentId,
    };
  }

  private async postForm(path: string, body: FormData): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetch(`${this.summarizerBaseUrl}${path}`, {
        method: 'POST',
        body,
      });
    } catch {
      throw new InternalServerErrorException(
        `Could not connect to summarizer service at ${this.summarizerBaseUrl}`,
      );
    }

    const data = await this.parseJson(response);
    if (!response.ok) {
      const detail = (data?.detail as string) || 'Summarizer form request failed';
      throw new BadRequestException(detail);
    }

    return data || {};
  }

  private async postJson(path: string, payload: object): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetch(`${this.summarizerBaseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new InternalServerErrorException(
        `Could not connect to summarizer service at ${this.summarizerBaseUrl}`,
      );
    }

    const data = await this.parseJson(response);
    if (!response.ok) {
      const detail = (data?.detail as string) || 'Summarizer JSON request failed';
      throw new BadRequestException(detail);
    }

    return data || {};
  }

  private async parseJson(response: Response): Promise<Record<string, unknown> | null> {
    try {
      return (await response.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private isSupportedFile(filename: string, mimeType: string): boolean {
    const lowerName = filename.toLowerCase();

    if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
      return true;
    }

    if (mimeType.startsWith('text/')) {
      return true;
    }

    return ['.txt', '.md', '.markdown', '.rst', '.log', '.readme'].some((ext) =>
      lowerName.endsWith(ext),
    );
  }

  private guessMimeType(filename: string): string {
    const lowerName = filename.toLowerCase();

    if (lowerName.endsWith('.pdf')) {
      return 'application/pdf';
    }

    if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown') || lowerName.endsWith('.readme')) {
      return 'text/markdown';
    }

    return 'text/plain';
  }
}
