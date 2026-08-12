// Smart itinerary ordering: group stops that are genuinely near each other
// (e.g. several things to do in LA) and find a short route through just
// that group, while leaving the order of far-apart groups (e.g. country to
// country) exactly as planned — that's the "hard plan" the user already made.

// Stops within this radius of each other are treated as "the same area"
// and are candidates for reordering. Big enough to span a metro area,
// small enough that separate cities/countries won't merge.
export const CLUSTER_THRESHOLD_KM = 120;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance between two {latitude, longitude} points, in km. */
export const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Union-find: groups points transitively within `thresholdKm` of each other
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

/** Partition point indices into geographic clusters. Returns array of index arrays. */
export const clusterByProximity = (points, thresholdKm = CLUSTER_THRESHOLD_KM) => {
  const n = points.length;
  const uf = new UnionFind(n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (haversineKm(points[i], points[j]) <= thresholdKm) uf.union(i, j);
    }
  }
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }
  return [...groups.values()];
};

// Greedy nearest-neighbor path through `indices`, starting at `startIdx`
const nearestNeighborOrder = (indices, points, startIdx) => {
  const remaining = new Set(indices);
  remaining.delete(startIdx);
  const order = [startIdx];
  let current = startIdx;
  while (remaining.size > 0) {
    let best = null;
    let bestDist = Infinity;
    for (const idx of remaining) {
      const d = haversineKm(points[current], points[idx]);
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    }
    order.push(best);
    remaining.delete(best);
    current = best;
  }
  return order;
};

// Local-search cleanup: reverses segments when doing so shortens the path.
// Standard 2-opt, adapted for an open path (no return-to-start edge).
const twoOptImprove = (order, points, maxIterations = 300) => {
  const path = [...order];
  const n = path.length;
  let improved = true;
  let iterations = 0;
  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const a = path[i - 1];
        const b = path[i];
        const c = path[k];
        const d = k + 1 < n ? path[k + 1] : null;
        const before = haversineKm(points[a], points[b]) + (d !== null ? haversineKm(points[c], points[d]) : 0);
        const after = haversineKm(points[a], points[c]) + (d !== null ? haversineKm(points[b], points[d]) : 0);
        if (after < before - 1e-9) {
          let lo = i;
          let hi = k;
          while (lo < hi) {
            [path[lo], path[hi]] = [path[hi], path[lo]];
            lo++;
            hi--;
          }
          improved = true;
        }
      }
    }
  }
  return path;
};

/** Sum of consecutive distances through `items` (must have lat/lng), in km. */
export const totalRouteDistance = (items) => {
  let total = 0;
  for (let i = 0; i < items.length - 1; i++) {
    total += haversineKm(
      { latitude: items[i].latitude, longitude: items[i].longitude },
      { latitude: items[i + 1].latitude, longitude: items[i + 1].longitude }
    );
  }
  return total;
};

/**
 * Reorders stops for shorter local travel within each geographic cluster,
 * while preserving the existing order *between* clusters (so a deliberate
 * country-to-country plan is never shuffled). Stops without coordinates
 * can't be geo-placed, so they're not reordered at all — each one stays
 * pinned to its original slot (e.g. a plain "book the rental car" idea
 * with no address won't jump to the end of the trip); only the positioned
 * stops shuffle around it, filling the remaining slots in optimized order.
 *
 * Returns the reordered item array (unchanged fields otherwise) — apply
 * order_index yourself. Distance math needs float lat/lng; pg returns
 * DECIMAL as strings, so parseFloat before calling if that hasn't happened.
 */
export const optimizeItinerary = (items, { thresholdKm = CLUSTER_THRESHOLD_KM } = {}) => {
  const positioned = items.filter((it) => it.latitude != null && it.longitude != null);
  if (positioned.length < 3) return items; // nothing meaningful to reorder

  const points = positioned.map((it) => ({
    latitude: parseFloat(it.latitude),
    longitude: parseFloat(it.longitude),
  }));

  const clusters = clusterByProximity(points, thresholdKm);
  // Clusters stay in the order they first appeared — that's the hard plan
  clusters.sort((a, b) => Math.min(...a) - Math.min(...b));

  const positionedOrder = [];
  for (const cluster of clusters) {
    if (cluster.length <= 2) {
      positionedOrder.push(...[...cluster].sort((a, b) => a - b));
      continue;
    }
    // Enter the cluster at whichever stop was originally planned first
    const startIdx = cluster.reduce((min, idx) => (idx < min ? idx : min), cluster[0]);
    const nn = nearestNeighborOrder(cluster, points, startIdx);
    positionedOrder.push(...twoOptImprove(nn, points));
  }
  const optimizedPositioned = positionedOrder.map((idx) => positioned[idx]);

  // Reinsert: unpositioned stops keep their original slot index; the slots
  // in between fill up with the optimized positioned sequence, in order.
  let cursor = 0;
  return items.map((it) =>
    it.latitude == null || it.longitude == null ? it : optimizedPositioned[cursor++]
  );
};
