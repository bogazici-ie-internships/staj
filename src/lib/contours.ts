// Bosphorus current lines (UPDATE-02 B2): a deterministic generative drawing,
// computed at build time. Each line is a sum of slow sines bent along an
// S-shaped channel (the strait), smoothed with Catmull-Rom → cubic Bézier.
// Output is a single SVG path string, rounded to integers to stay small.

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

export function contourPath({ width = 1440, height = 640, lines = 16, points = 11, seed = 1453, amp = 1 } = {}): string {
  const rand = rng(seed);
  const phase = Array.from({ length: 4 }, () => rand() * Math.PI * 2);
  let d = "";
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1);
    const base = -0.1 * height + t * 1.2 * height;
    const pts: [number, number][] = [];
    for (let k = 0; k <= points; k++) {
      const u = k / points, x = -40 + u * (width + 80);
      // the strait: an S-curve that every line follows, stronger in the middle lines
      // the strait: lines crowd together where the channel narrows (u ≈ 0.55) and bend in an S
      const centre = height * 0.5;
      const neck = 0.38 + 0.62 * Math.abs(Math.cos(Math.PI * (u - 0.05)));
      const strait = Math.sin(u * Math.PI * 1.6 - 0.5) * height * 0.22;
      const ripple = amp * (Math.sin(u * 6.3 + phase[0] + t * 2.3) * 12 + Math.sin(u * 2.7 + phase[1] - t * 4.1) * 22 + Math.sin(u * 13.1 + phase[2] + t * 9) * 4);
      pts.push([x, centre + (base - centre) * neck + strait + ripple]);
    }
    d += `M${Math.round(pts[0][0])} ${Math.round(pts[0][1])}`;
    for (let k = 0; k < pts.length - 1; k++) {
      const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${Math.round(c1[0])} ${Math.round(c1[1])} ${Math.round(c2[0])} ${Math.round(c2[1])} ${Math.round(p2[0])} ${Math.round(p2[1])}`;
    }
  }
  return d;
}
