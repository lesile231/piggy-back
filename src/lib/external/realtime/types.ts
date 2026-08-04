export interface RealtimeArrival {
  line: string;
  destination: string;
  arrivalMinutes: number;
  vehicleId?: string;
}

export interface RealtimeProvider {
  getArrivals(stopId: string): Promise<RealtimeArrival[]>;
}
