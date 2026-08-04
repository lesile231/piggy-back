CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE tourism_spots ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS idx_spots_embedding ON tourism_spots
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
