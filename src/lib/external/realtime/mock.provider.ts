import type { RealtimeProvider, RealtimeArrival } from "./types";

const MOCK_ARRIVALS: RealtimeArrival[] = [
  { line: "1003", destination: "Haeundae", arrivalMinutes: 3, vehicleId: "bus-1003-a" },
  { line: "1003", destination: "Haeundae", arrivalMinutes: 8, vehicleId: "bus-1003-b" },
  { line: "1003", destination: "Haeundae", arrivalMinutes: 15, vehicleId: "bus-1003-c" },
  { line: "Line 1", destination: "Nopo", arrivalMinutes: 2, vehicleId: "metro-1-a" },
  { line: "Line 1", destination: "Sinpyeong", arrivalMinutes: 6, vehicleId: "metro-1-b" },
];

export class MockRealtimeProvider implements RealtimeProvider {
  async getArrivals(_stopId: string): Promise<RealtimeArrival[]> {
    return [...MOCK_ARRIVALS];
  }
}
