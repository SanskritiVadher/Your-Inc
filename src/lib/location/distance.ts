export interface Coordinate {
  lat: number;
  lng: number;
}

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates.
 */
export function calculateHaversineDistanceMeters(
  coord1: Coordinate,
  coord2: Coordinate
): number {
  const R = 6371e3; // Earth radius in meters
  const rad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = rad(coord2.lat - coord1.lat);
  const dLng = rad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(coord1.lat)) *
      Math.cos(rad(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}
