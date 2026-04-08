import { createHash } from 'crypto';

export function normalizeText(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function buildTextHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
