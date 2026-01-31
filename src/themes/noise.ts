/**
 * Seeded 2D Simplex Noise Implementation
 *
 * Generates deterministic pseudo-random noise patterns based on a seed.
 * Used for creating unique isoline/contour backgrounds per DID.
 */

// Permutation table for Simplex noise
const GRAD3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

// Skewing factors for 2D Simplex
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

/**
 * Creates a seeded random number generator
 * Based on Linear Congruential Generator
 */
function createSeededRandom(seed: number): () => number {
  let state = Math.abs(seed) || 1;
  return function(): number {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Fisher-Yates shuffle with seeded random
 */
function shuffleArray(arr: number[], rng: () => number): number[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Creates a 2D Simplex noise function with the given seed
 *
 * @param seed - Numeric seed for deterministic generation
 * @returns A function that takes (x, y) and returns noise value in range [-1, 1]
 */
export function createSeededNoise2D(seed: number): (x: number, y: number) => number {
  const rng = createSeededRandom(seed);

  // Create shuffled permutation table
  const base = Array.from({ length: 256 }, (_, i) => i);
  const shuffled = shuffleArray(base, rng);

  // Double the permutation table to avoid overflow
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);

  for (let i = 0; i < 512; i++) {
    perm[i] = shuffled[i & 255];
    permMod12[i] = perm[i] % 12;
  }

  /**
   * 2D Simplex noise function
   */
  return function noise2D(x: number, y: number): number {
    // Skew input space to determine which simplex cell we're in
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    // Unskew back to (x, y) space
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;

    // Relative coordinates within cell
    const x0 = x - X0;
    const y0 = y - Y0;

    // Determine which simplex we're in
    let i1: number, j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    // Offsets for second corner (first corner is origin)
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;

    // Offsets for third corner
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    // Hash coordinates for gradient indices
    const ii = i & 255;
    const jj = j & 255;

    const gi0 = permMod12[ii + perm[jj]];
    const gi1 = permMod12[ii + i1 + perm[jj + j1]];
    const gi2 = permMod12[ii + 1 + perm[jj + 1]];

    // Calculate contributions from three corners
    let n0: number, n1: number, n2: number;

    // First corner contribution
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      const g0 = GRAD3[gi0];
      n0 = t0 * t0 * (g0[0] * x0 + g0[1] * y0);
    }

    // Second corner contribution
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      const g1 = GRAD3[gi1];
      n1 = t1 * t1 * (g1[0] * x1 + g1[1] * y1);
    }

    // Third corner contribution
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      const g2 = GRAD3[gi2];
      n2 = t2 * t2 * (g2[0] * x2 + g2[1] * y2);
    }

    // Sum and scale to [-1, 1]
    return 70 * (n0 + n1 + n2);
  };
}

/**
 * Generate a 2D grid of noise values
 *
 * @param noise - Noise function created by createSeededNoise2D
 * @param width - Grid width
 * @param height - Grid height
 * @param scale - Noise scale (lower = larger features)
 * @param octaves - Number of noise octaves for detail
 * @param persistence - How much each octave contributes (0-1)
 * @returns 2D array of noise values normalized to [0, 1]
 */
export function generateNoiseGrid(
  noise: (x: number, y: number) => number,
  width: number,
  height: number,
  scale: number = 0.02,
  octaves: number = 1,
  persistence: number = 0.5
): number[][] {
  const grid: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let value = 0;
      let amplitude = 1;
      let frequency = 1;
      let maxValue = 0;

      // Fractal Brownian motion
      for (let o = 0; o < octaves; o++) {
        value += amplitude * noise(x * scale * frequency, y * scale * frequency);
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
      }

      // Normalize to [0, 1]
      row.push((value / maxValue + 1) / 2);
    }
    grid.push(row);
  }

  return grid;
}
