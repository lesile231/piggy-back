import type { LocalizedText } from "@/types/common";

export interface DealRecord {
  id: string;
  nameKo: string;
  names: LocalizedText;
  description: LocalizedText;
  discount: LocalizedText;
  providerName: string;
  locationName: LocalizedText;
  addressKo: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  category: string;
  validFrom: Date | null;
  validUntil: Date | null;
  source: string;
  sortOrder: number;
  isActive: boolean;
}
