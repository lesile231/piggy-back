import { francAll } from "franc-min";

interface LanguageDetection {
  language: string;
  confidence: number;
}

const ISO_639_3_TO_1: Record<string, string> = {
  eng: "en", jpn: "ja", cmn: "zh", zho: "zh",
  kor: "ko", vie: "vi", tha: "th", ind: "id",
  msa: "ms", fra: "fr", deu: "de", spa: "es",
  por: "pt", rus: "ru", ara: "ar", hin: "hi",
};

const DEFAULT_LANGUAGE = "en";
const MIN_TEXT_LENGTH = 10;
const MIN_CONFIDENCE = 0.5;

export class LanguageService {
  detect(text: string): LanguageDetection {
    if (text.length < MIN_TEXT_LENGTH) {
      return { language: DEFAULT_LANGUAGE, confidence: 0 };
    }

    const results = francAll(text, { minLength: 3 });
    if (results.length === 0 || results[0] === undefined) {
      return { language: DEFAULT_LANGUAGE, confidence: 0 };
    }

    const [iso3, score] = results[0];
    const language = ISO_639_3_TO_1[iso3] ?? DEFAULT_LANGUAGE;
    return { language, confidence: score };
  }

  resolveLanguage(text: string, sessionLanguage?: string): string {
    const detection = this.detect(text);

    if (detection.confidence >= MIN_CONFIDENCE) {
      return detection.language;
    }

    if (sessionLanguage) {
      return sessionLanguage;
    }

    return DEFAULT_LANGUAGE;
  }
}
