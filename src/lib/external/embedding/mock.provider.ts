import type { EmbeddingProvider } from "./types";

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 1024;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => new Array(this.dimensions).fill(0));
  }
}
