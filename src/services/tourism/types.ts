import type { LocalizedText } from "@/types/common";

export interface SpotRecord {
  id: string;
  nameKo: string;
  names: LocalizedText;
  description: LocalizedText;
  addressKo: string | null;
  addresses: LocalizedText;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  images: string[];
  rating: number | null;
  source: string;
  isActive: boolean;
}

export interface EventRecord {
  id: string;
  nameKo: string;
  names: LocalizedText;
  description: LocalizedText;
  category: string;
  venueName: LocalizedText;
  addressKo: string | null;
  latitude: number | null;
  longitude: number | null;
  startsAt: Date;
  endsAt: Date;
  priceInfo: LocalizedText;
  bookingUrl: string | null;
  images: string[];
  source: string;
  isActive: boolean;
}
