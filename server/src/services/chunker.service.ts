/**
 * Chunking Service: Deterministic text splitter for semantic indexing
 *
 * Algorithm Rationale:
 * - Window size: ~600 characters balances dense factual context with embedding granularity.
 * - Overlap: ~100-120 characters preserves context across chunk boundaries so sentences split near boundaries aren't severed.
 * - Boundary snapping: Prioritizes paragraph breaks (\n\n), sentence ends (. ! ?), line breaks (\n), and word boundaries.
 * - Progress safety: Guarantees strict monotonic progression (prevents infinite loops on continuous non-space inputs).
 */

export interface ChunkOptions {
  targetSize?: number;
  overlap?: number;
  minChunkSize?: number;
}

export class ChunkerService {
  public chunkText(text: string, options?: ChunkOptions): string[] {
    const targetSize = options?.targetSize ?? 600;
    const overlap = options?.overlap ?? 110;
    const minChunkSize = options?.minChunkSize ?? 40;

    if (!text || text.trim().length === 0) {
      return [];
    }

    const trimmed = text.trim();
    if (trimmed.length <= targetSize) {
      return [trimmed];
    }

    const chunks: string[] = [];
    let start = 0;
    const totalLength = text.length;

    while (start < totalLength) {
      // Skip leading whitespace at current start
      while (start < totalLength && /\s/.test(text[start])) {
        start++;
      }
      if (start >= totalLength) {
        break;
      }

      const idealEnd = start + targetSize;

      // If remaining text fits in one chunk, consume it
      if (idealEnd >= totalLength) {
        const lastChunk = text.slice(start).trim();
        if (lastChunk.length > 0) {
          if (lastChunk.length < minChunkSize && chunks.length > 0) {
            const prev = chunks[chunks.length - 1];
            if (prev.length + lastChunk.length < targetSize * 1.4) {
              chunks[chunks.length - 1] = `${prev}\n\n${lastChunk}`.trim();
            } else {
              chunks.push(lastChunk);
            }
          } else {
            chunks.push(lastChunk);
          }
        }
        break;
      }

      // Search backward for natural boundaries
      const searchRangeStart = start + Math.floor(targetSize * 0.4);
      const windowSlice = text.slice(start, idealEnd + 1);

      let splitIndex = -1;

      // 1. Paragraph boundary: '\n\n'
      const lastParagraph = windowSlice.lastIndexOf('\n\n');
      if (lastParagraph !== -1 && start + lastParagraph >= searchRangeStart) {
        splitIndex = start + lastParagraph + 2;
      }

      // 2. Sentence boundary: /[.!?](\s|$)/
      if (splitIndex === -1) {
        for (let i = idealEnd; i >= searchRangeStart; i--) {
          const char = text[i];
          if (char === '.' || char === '!' || char === '?') {
            if (i + 1 >= totalLength || /\s/.test(text[i + 1])) {
              splitIndex = i + 1;
              break;
            }
          }
        }
      }

      // 3. Single newline: '\n'
      if (splitIndex === -1) {
        const lastNewline = windowSlice.lastIndexOf('\n');
        if (lastNewline !== -1 && start + lastNewline >= searchRangeStart) {
          splitIndex = start + lastNewline + 1;
        }
      }

      // 4. Word boundary: whitespace
      if (splitIndex === -1) {
        for (let i = idealEnd; i >= searchRangeStart; i--) {
          if (/\s/.test(text[i])) {
            splitIndex = i + 1;
            break;
          }
        }
      }

      // 5. Fallback: hard boundary
      if (splitIndex === -1 || splitIndex <= start) {
        splitIndex = idealEnd;
      }

      const chunkContent = text.slice(start, splitIndex).trim();
      if (chunkContent.length > 0) {
        chunks.push(chunkContent);
      }

      // Compute next start position with overlap
      let nextStart = splitIndex - overlap;

      // Snap forward to word boundary so chunk doesn't start mid-word
      if (nextStart > start && nextStart < totalLength) {
        while (nextStart < splitIndex && !/\s/.test(text[nextStart])) {
          nextStart++;
        }
        while (nextStart < splitIndex && /\s/.test(text[nextStart])) {
          nextStart++;
        }
      }

      // Strict forward progress guarantee
      if (nextStart <= start) {
        nextStart = splitIndex;
      }

      start = nextStart;
    }

    return chunks;
  }
}

export const chunkerService = new ChunkerService();
