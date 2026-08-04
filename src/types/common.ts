export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T>(code: string, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}

export type Platform = "whatsapp" | "line" | "wechat" | "telegram";

export type LocalizedText = Record<string, string>;
// Usage: { "en": "Hello", "ja": "こんにちは", "zh": "你好" }

export function localize(
  data: LocalizedText,
  lang: string,
  fallback = "en"
): string {
  return data[lang] ?? data[fallback] ?? Object.values(data)[0] ?? "";
}

export interface LatLng {
  latitude: number;
  longitude: number;
}
