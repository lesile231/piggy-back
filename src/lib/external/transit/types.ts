import type { LocalizedText, LatLng } from "@/types/common";

export interface TransitStep {
  mode: "walk" | "bus" | "metro" | "train";
  instruction: LocalizedText;
  duration: number; // minutes
  distance: number; // meters
  line?: string;
  stops?: number;
  departureStop?: string;
  arrivalStop?: string;
}

export interface TransitRoute {
  summary: string;
  duration: number; // total minutes
  distance: number; // total meters
  fare: number; // KRW
  steps: TransitStep[];
  departureTime: Date;
  arrivalTime: Date;
}

export interface TransitProvider {
  searchRoutes(
    from: LatLng,
    to: LatLng,
    options?: { departureTime?: Date; language?: string },
  ): Promise<TransitRoute[]>;
}
