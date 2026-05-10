import { Injectable } from '@nestjs/common';

export interface Chunk {
  text: string;
  index: number;
  startChar: number;
}

@Injectable()
export class ChunkerService {
  private readonly chunkSize: number;
  private readonly overlap: number;

  constructor() {
    const chunkSize = Number.parseInt(process.env.RAG_CHUNK_SIZE ?? '800', 10);
    const overlap = Number.parseInt(
      process.env.RAG_CHUNK_OVERLAP ?? '200',
      10,
    );

    this.chunkSize = Number.isNaN(chunkSize) || chunkSize <= 0 ? 800 : chunkSize;
    this.overlap =
      Number.isNaN(overlap) || overlap < 0
        ? 200
        : Math.min(overlap, this.chunkSize - 1);
  }

  chunk(text: string): Chunk[] {
    const chunks: Chunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      let chunkEnd = end;

      if (end < text.length) {
        const breakpoints = ['\n\n', '. ', '! ', '? ', '\n'];
        for (const bp of breakpoints) {
          const pos = text.lastIndexOf(bp, end);
          if (pos > start + this.overlap) {
            chunkEnd = pos + bp.length;
            break;
          }
        }
      }

      chunks.push({
        text: text.slice(start, chunkEnd).trim(),
        index,
        startChar: start,
      });

      if (chunkEnd >= text.length) {
        break;
      }

      index++;
      start = Math.max(chunkEnd - this.overlap, start + 1);
    }

    return chunks.filter((c) => c.text.length > 0);
  }
}
