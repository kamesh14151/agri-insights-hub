export type CornerPoint = { lat: number; lng: number; alt?: number };

export function generateHeatmapGrid(corners: CornerPoint[], gridSize = 10, baseValue = 0.7) {
  if (corners.length !== 4) return [];
  const [A, B, C, D] = corners;
  const grid = [];
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const u1 = i / gridSize;
      const v1 = j / gridSize;
      const u2 = (i + 1) / gridSize;
      const v2 = (j + 1) / gridSize;
      
      const interp = (u: number, v: number) => ({
        lat: A.lat * (1-u)*(1-v) + B.lat * u * (1-v) + C.lat * u * v + D.lat * (1-u) * v,
        lng: A.lng * (1-u)*(1-v) + B.lng * u * (1-v) + C.lng * u * v + D.lng * (1-u) * v,
        alt: 0
      });

      const p1 = interp(u1, v1);
      const p2 = interp(u2, v1);
      const p3 = interp(u2, v2);
      const p4 = interp(u1, v2);

      // Generate localized spatial noise for realistic heatmaps
      const noise = (Math.sin(i * 0.8) * Math.cos(j * 0.8)) * 0.15 + (Math.random() * 0.05 - 0.025);
      let val = baseValue + noise;
      val = Math.max(0, Math.min(1, val));

      grid.push({
        id: `${i}-${j}`,
        points: [p1, p2, p3, p4],
        value: val
      });
    }
  }
  return grid;
}

export function getNdviColor(val: number) {
  if (val > 0.75) return "rgba(16, 185, 129, 0.65)"; // Dark Green
  if (val > 0.6) return "rgba(52, 211, 153, 0.65)";  // Light Green
  if (val > 0.4) return "rgba(250, 204, 21, 0.65)";  // Yellow
  if (val > 0.25) return "rgba(245, 158, 11, 0.65)"; // Orange
  return "rgba(239, 68, 68, 0.65)";                  // Red
}

export function getNdwiColor(val: number) {
  if (val > 0.7) return "rgba(37, 99, 235, 0.65)";   // Deep Blue
  if (val > 0.5) return "rgba(59, 130, 246, 0.65)";  // Blue
  if (val > 0.3) return "rgba(96, 165, 250, 0.65)";  // Light Blue
  if (val > 0.15) return "rgba(250, 204, 21, 0.65)"; // Yellow/Dry
  return "rgba(217, 119, 6, 0.65)";                  // Brown/Very Dry
}
