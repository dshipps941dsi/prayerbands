// Locations are captured as country / state / city, then resolved to that
// city's centroid — so every stop in one town lands on the identical
// coordinate. Thirteen people in Venice drew a single dot on the map, which
// reads as one person rather than the whole town's worth of bands.
//
// Scatter is display-only: the stored coordinate stays the honest one. This
// spreads pins across roughly the size of the town they are actually in,
// which is no less accurate than a centroid — a centroid is not where anybody
// lives either, it just pretends to be precise by being singular.
//
// Deterministic, so a pin sits in the same place on every page load. A random
// offset would make the map shimmer on refresh and look broken.

// FNV-1a. Small, fast, and stable across runs — Math.random() is not.
function hash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// ~0.02° of latitude is a little over two kilometres: town-sized, not
// street-sized. Longitude is scaled by latitude so the spread stays circular
// rather than stretching into an ellipse away from the equator.
const SPREAD_DEG = 0.02

export function scatterPoint(
  lat: number,
  lng: number,
  seed: string
): { lat: number; lng: number } {
  const h = hash(seed)
  // Two independent values out of one hash: low bits for angle, high for radius.
  const angle = ((h & 0xffff) / 0xffff) * Math.PI * 2
  // Square root keeps points evenly spread over the disc instead of clustering
  // in the middle, which is what a raw radius does.
  const radius = Math.sqrt(((h >>> 16) & 0xffff) / 0xffff) * SPREAD_DEG

  const dLat = radius * Math.sin(angle)
  const cos = Math.cos((lat * Math.PI) / 180)
  const dLng = (radius * Math.cos(angle)) / (Math.abs(cos) < 0.01 ? 0.01 : cos)

  return {
    lat: Number((lat + dLat).toFixed(6)),
    lng: Number((lng + dLng).toFixed(6)),
  }
}
