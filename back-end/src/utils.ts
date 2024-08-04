import { Vector2D } from "./types";

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}
export function haversineDistance(coord1: Vector2D, coord2: Vector2D): number {
    const R = 6371e3; // Earth's radius in meters

    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    return distance; // distance in meters
}
