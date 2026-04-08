import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { LlmService } from '../summarize/services/llmService';

@Injectable()
export class SummarizationService {
  private readonly maxInputChars = 12000;

  constructor(private readonly llmService: LlmService) {}

  async summarizeFile(input: {
    buffer: Buffer;
    filename: string;
    mimeType?: string;
  }): Promise<{ answer: string; sources: string[]; documentId: string }> {
    const mimeType = input.mimeType || this.guessMimeType(input.filename);
    if (!this.isSupportedFile(input.filename, mimeType)) {
      throw new BadRequestException('Only PDF and text-based files are supported for summarization.');
    }

    const extractedText = await this.extractText(input.buffer, mimeType, input.filename);
    if (!extractedText.trim()) {
      return {
        answer:
          'This file could not be parsed into text. Please upload a searchable PDF or a text-based file.',
        sources: [`type:${mimeType}`, 'parse:unavailable'],
        documentId: createHash('sha256')
          .update(`${input.filename}:${input.buffer.byteLength}`)
          .digest('hex'),
      };
    }

    const llmResult = await this.llmService.generateSummary(
      extractedText.slice(0, this.maxInputChars),
      'bullet',
    );

    const answerSections: string[] = [llmResult.summary];

    if (llmResult.keyPoints.length > 0) {
      answerSections.push(
        ['Key points:', ...llmResult.keyPoints.map((point) => `- ${point}`)].join('\n'),
      );
    }

    if (llmResult.actionItems.length > 0) {
      answerSections.push(
        ['Action items:', ...llmResult.actionItems.map((item) => `- ${item}`)].join('\n'),
      );
    }

    const documentId = createHash('sha256')
      .update(`${input.filename}:${input.buffer.byteLength}`)
      .digest('hex');

    return {
      answer: answerSections.join('\n\n').trim(),
      sources: [
        `type:${mimeType}`,
        `model:${process.env.LLM_MODEL || 'unknown'}`,
      ],
      documentId,
    };
  }

  private async extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      try {
        return await this.extractPdfText(buffer);
      } catch {
        return '';
      }
    }

    try {
      return buffer.toString('utf-8').trim();
    } catch {
      throw new InternalServerErrorException('Failed to decode file content for summarization.');
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

  private async extractPdfText(buffer: Buffer): Promise<string> {
    this.ensurePdfGlobals();

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
    });

    const document = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageIndex = 1; pageIndex <= document.numPages; pageIndex += 1) {
      const page = await document.getPage(pageIndex);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
        .join(' ')
        .trim();

      if (pageText) {
        pageTexts.push(pageText);
      }
    }

    await document.destroy();
    return pageTexts.join('\n\n').trim();
  }

  private ensurePdfGlobals(): void {
    const globalScope = globalThis as any;

    if (typeof globalScope.DOMMatrix === 'undefined') {
      globalScope.DOMMatrix = class DOMMatrix {};
    }

    if (typeof globalScope.ImageData === 'undefined') {
      globalScope.ImageData = class ImageData {};
    }

    if (typeof globalScope.Path2D === 'undefined') {
      globalScope.Path2D = class Path2D {};
    }
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
