import { toVector, type Vec3 } from './geo.ts';

/**
 * The places arcs travel between.
 *
 * Arcs used to connect two arbitrary dots, which looked like traffic but meant
 * nothing. Naming the endpoints costs a small table and turns the animation
 * into something the viewer can read.
 */
export interface Anchor {
  readonly name: string;
  readonly vector: Vec3;
}

interface City {
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
}

/** Spread across every inhabited continent, so no rotation is ever empty. */
const CITIES: readonly City[] = [
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Seoul', lat: 37.57, lon: 126.98 },
  { name: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Jakarta', lat: -6.21, lon: 106.85 },
  { name: 'Sydney', lat: -33.87, lon: 151.21 },
  { name: 'Auckland', lat: -36.85, lon: 174.76 },
  { name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { name: 'Dubai', lat: 25.2, lon: 55.27 },
  { name: 'Nairobi', lat: -1.29, lon: 36.82 },
  { name: 'Cape Town', lat: -33.92, lon: 18.42 },
  { name: 'Lagos', lat: 6.52, lon: 3.38 },
  { name: 'Cairo', lat: 30.04, lon: 31.24 },
  { name: 'Istanbul', lat: 41.01, lon: 28.98 },
  { name: 'Athens', lat: 37.98, lon: 23.73 },
  { name: 'Rome', lat: 41.9, lon: 12.5 },
  { name: 'Berlin', lat: 52.52, lon: 13.4 },
  { name: 'Warsaw', lat: 52.23, lon: 21.01 },
  { name: 'Stockholm', lat: 59.33, lon: 18.07 },
  { name: 'Helsinki', lat: 60.17, lon: 24.94 },
  { name: 'Oslo', lat: 59.91, lon: 10.75 },
  { name: 'Copenhagen', lat: 55.68, lon: 12.57 },
  { name: 'Amsterdam', lat: 52.37, lon: 4.9 },
  { name: 'Paris', lat: 48.86, lon: 2.35 },
  { name: 'London', lat: 51.51, lon: -0.13 },
  { name: 'Lisbon', lat: 38.72, lon: -9.14 },
  { name: 'Madrid', lat: 40.42, lon: -3.7 },
  { name: 'Reykjavik', lat: 64.15, lon: -21.94 },
  { name: 'Toronto', lat: 43.65, lon: -79.38 },
  { name: 'New York', lat: 40.71, lon: -74.01 },
  { name: 'Chicago', lat: 41.88, lon: -87.63 },
  { name: 'Austin', lat: 30.27, lon: -97.74 },
  { name: 'Mexico City', lat: 19.43, lon: -99.13 },
  { name: 'San Francisco', lat: 37.77, lon: -122.42 },
  { name: 'Vancouver', lat: 49.28, lon: -123.12 },
  { name: 'Bogota', lat: 4.71, lon: -74.07 },
  { name: 'Lima', lat: -12.05, lon: -77.04 },
  { name: 'Santiago', lat: -33.45, lon: -70.67 },
  { name: 'Buenos Aires', lat: -34.6, lon: -58.38 },
  { name: 'Sao Paulo', lat: -23.55, lon: -46.63 },
];

export const anchors: readonly Anchor[] = CITIES.map(({ name, lat, lon }) => ({
  name,
  vector: toVector({ lat, lon }),
}));
