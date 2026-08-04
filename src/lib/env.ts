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
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
  WHATSAPP_ACCESS_TOKEN: z.string().default(""),
  WHATSAPP_VERIFY_TOKEN: z.string().default(""),
  WHATSAPP_APP_SECRET: z.string().default(""),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().default(""),
  LINE_CHANNEL_SECRET: z.string().default(""),
  // Transit APIs
  GOOGLE_MAPS_API_KEY: z.string().default(""),
  NAVER_CLIENT_ID: z.string().default(""),
  NAVER_CLIENT_SECRET: z.string().default(""),
  TAGO_API_KEY: z.string().default(""),
  // Tourism APIs
  TOUR_API_KEY: z.string().default(""),
  GOOGLE_PLACES_API_KEY: z.string().default(""),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
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
