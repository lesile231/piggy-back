import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  TOGETHER_API_KEY: z.string().default(""),
  HF_API_TOKEN: z.string().default(""),
  LLM_LIGHT_PROVIDER: z.enum(["groq", "together"]).default("groq"),
  LLM_LIGHT_MODEL: z.string().default("llama-3.1-8b-instant"),
  LLM_CHAT_PROVIDER: z.enum(["groq", "together"]).default("groq"),
  LLM_CHAT_MODEL: z.string().default("llama-3.3-70b-versatile"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.parse(process.env);
  cachedEnv = parsed;
  return parsed;
}

export function clearEnvCache(): void {
  cachedEnv = null;
}
