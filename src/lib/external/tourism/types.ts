import type { LocalizedText } from "@/types/common";

export interface TourismSpotExternal {
  externalId: string;
  names: LocalizedText;
  description: LocalizedText;
  address: LocalizedText;
  latitude: number;
  longitude: number;
  category: string;
  rating?: number;
  images: string[];
  openingHours?: Record<string, string>;
  phone?: string;
  website?: string;
}

export interface TourismProvider {
  searchSpots(
    query: string,
    options?: { category?: string; limit?: number; language?: string },
  ): Promise<TourismSpotExternal[]>;
  getSpotDetail(externalId: string): Promise<TourismSpotExternal | null>;
}
