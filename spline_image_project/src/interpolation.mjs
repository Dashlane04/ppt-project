export const REFERENCE_WIDTH = 384;
export const REFERENCE_HEIGHT = 224;
export const SCALES = [2, 4];
export const SPLINE_TOLERANCE = 1e-8;
export const MAX_SWEEPS = 500;
export const PIXEL_TOLERANCES = [1, 0.1, 0.01];
export const DENSE_SUBDIVISIONS = 64;
export const SPLINE_OPERATOR_BOUND = 2.5;
export const MAIN_METHODS = ['linear', 'cubic', 'spline'];
export const METHOD_NAMES = {
  original: 'Ảnh tham chiếu',
  nearest: 'Láng giềng gần nhất',
  linear: 'Song tuyến tính',
  cubic: 'Bicubic Keys',
  spline: 'Spline tự nhiên · Thomas',
  pchip: 'PCHIP · Hermite đơn điệu',
  lanczos: 'Lanczos-3',
};
export const SAMPLE_NAMES = {
  edge: 'Biên tương phản',
  lines: 'Nét mảnh và đường chéo',
  texture: 'Hoa văn tần số thay đổi',
  camera: 'Camera · Lav Varshney',
  astronaut: 'Astronaut · NASA',
};

export function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

export function makeSynthetic(kind) {
  if (!['edge', 'lines', 'texture'].includes(kind)) throw new RangeError('Unknown synthetic sample');
  const width = REFERENCE_WIDTH, height = REFERENCE_HEIGHT;
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let level;
      if (kind === 'edge') {
        const edge = y < 104 ? 190 : 190 + 0.55 * (y - 104);
        level = x < edge ? 38 : 216;
      } else if (kind === 'lines') {
        const crossing = Math.abs(y - (0.43 * x + 18)) < 1.8
          || Math.abs(y - (193 - 0.43 * x)) < 1.8;
        const ring = Math.abs(Math.hypot(x - 192, y - 112) - 68) < 1.65;
        const stripes = y > 176 && x > 28 && x < 350 && x % 12 < 3;
        level = crossing || ring || stripes ? 32 : 226;
      } else {
        const period = 4.5 + 12 * y / height;
        level = 128 + 69 * Math.sin(2 * Math.PI * (x + 0.35 * y) / period)
          + 25 * Math.cos(2 * Math.PI * y / 19);
      }
      pixels[y * width + x] = Math.round(level);
    }
  }
  return { width, height, pixels };
}

// This is an integer-factor area average. Keep fractional means until rendering.
export function reduceByArea(image, scale) {
  if (!Number.isInteger(scale) || scale < 1 || image.width % scale || image.height % scale) {
    throw new RangeError('Both dimensions must be divisible by the integer scale');
  }
  const width = image.width / scale, height = image.height / scale;
  const pixels = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let j = 0; j < scale; j++) {
        for (let i = 0; i < scale; i++) {
          sum += image.pixels[(y * scale + j) * image.width + x * scale + i];
        }
      }
      pixels[y * width + x] = sum / (scale * scale);
    }
  }
  return { width, height, pixels };
}

export function sourceCoordinate(position, scale, length) {
  return clamp((position + 0.5) / scale - 0.5, 0, length - 1);
}

export function splineRhs(samples) {
  return Float64Array.from({ length: Math.max(0, samples.length - 2) }, (_, i) =>
    6 * (samples[i + 2] - 2 * samples[i + 1] + samples[i]));
}

// A has main diagonal 4 and adjacent diagonals 1. End moments are fixed at zero.
export function solveThomas(rhs) {
  const n = rhs.length;
  const modifiedRhs = Float64Array.from(rhs);
  const pivot = new Float64Array(n);
  const solution = new Float64Array(n);
  if (!n) return solution;
  pivot[0] = 4;
  for (let i = 1; i < n; i++) {
    const multiplier = 1 / pivot[i - 1];
    pivot[i] = 4 - multiplier;
    modifiedRhs[i] -= multiplier * modifiedRhs[i - 1];
  }
  solution[n - 1] = modifiedRhs[n - 1] / pivot[n - 1];
  for (let i = n - 2; i >= 0; i--) solution[i] = (modifiedRhs[i] - solution[i + 1]) / pivot[i];
  return solution;
}

export function residualInfinity(rhs, solution) {
  if (rhs.length !== solution.length) throw new RangeError('The system and solution sizes differ');
  let maximum = 0;
  for (let i = 0; i < rhs.length; i++) {
    const computed = 4 * solution[i] + (solution[i - 1] ?? 0) + (solution[i + 1] ?? 0);
    maximum = Math.max(maximum, Math.abs(rhs[i] - computed));
  }
  return maximum;
}

export function solveGaussSeidel(rhs, {
  tolerance = SPLINE_TOLERANCE, maxSweeps = MAX_SWEEPS, onSweep,
} = {}) {
  if (!Number.isFinite(tolerance) || tolerance < 0 || !Number.isInteger(maxSweeps) || maxSweeps < 0) {
    throw new RangeError('Invalid stopping parameters');
  }
  const solution = new Float64Array(rhs.length);
  let sweep = 0;
  let residual = residualInfinity(rhs, solution);
  onSweep?.(sweep, residual, solution);
  while (residual > tolerance && sweep < maxSweeps) {
    for (let i = 0; i < rhs.length; i++) {
      // Left neighbor already belongs to the new sweep. Right neighbor is still old.
      solution[i] = (rhs[i] - (solution[i - 1] ?? 0) - (solution[i + 1] ?? 0)) / 4;
    }
    residual = residualInfinity(rhs, solution);
    sweep++;
    onSweep?.(sweep, residual, solution);
  }
  return { solution, sweeps: sweep, residual, converged: residual <= tolerance };
}

export function padNaturalMoments(interior, sampleCount) {
  if (sampleCount < 1 || interior.length !== Math.max(0, sampleCount - 2)) {
    throw new RangeError('Moment vector does not match samples');
  }
  const full = new Float64Array(sampleCount);
  if (interior.length) full.set(interior, 1);
  return full;
}

export function evaluateSpline(samples, moments, x) {
  if (samples.length === 1) return samples[0];
  const position = clamp(x, 0, samples.length - 1);
  const i = Math.min(Math.floor(position), samples.length - 2);
  const t = position - i, u = 1 - t;
  return u * samples[i] + t * samples[i + 1]
    + ((u ** 3 - u) * moments[i] + (t ** 3 - t) * moments[i + 1]) / 6;
}

export function pchipSlopes(samples) {
  const slopes = new Float64Array(samples.length);
  if (samples.length < 2) return slopes;
  const secants = Float64Array.from({ length: samples.length - 1 }, (_, i) =>
    samples[i + 1] - samples[i]);
  if (samples.length === 2) return slopes.fill(secants[0]);

  const endSlope = (first, second) => {
    const estimate = (3 * first - second) / 2;
    if (Math.sign(estimate) !== Math.sign(first)) return 0;
    return Math.sign(first) * Math.min(Math.abs(estimate), 3 * Math.abs(first));
  };
  slopes[0] = endSlope(secants[0], secants[1]);
  for (let i = 1; i < samples.length - 1; i++) {
    const left = secants[i - 1], right = secants[i];
    if (left !== 0 && right !== 0 && Math.sign(left) === Math.sign(right)) {
      slopes[i] = 2 / (1 / left + 1 / right);
    }
  }
  slopes[slopes.length - 1] = endSlope(secants.at(-1), secants.at(-2));
  return slopes;
}

export function evaluatePchip(samples, slopes, x) {
  if (samples.length === 1) return samples[0];
  const position = clamp(x, 0, samples.length - 1);
  const i = Math.min(Math.floor(position), samples.length - 2);
  const t = position - i, u = 1 - t;
  // Cubic Hermite basis in unit-spaced knot coordinates.
  return (1 + 2 * t) * u ** 2 * samples[i] + (3 - 2 * t) * t ** 2 * samples[i + 1]
    + t * u ** 2 * slopes[i] - t ** 2 * u * slopes[i + 1];
}

const sinc = value => value === 0 ? 1 : Math.sin(Math.PI * value) / (Math.PI * value);
const kernels = {
  linear: { radius: 1, weight: x => Math.max(0, 1 - Math.abs(x)) },
  cubic: { radius: 2, weight: x => {
    const t = Math.abs(x), a = -0.5;
    if (t < 1) return ((a + 2) * t - a - 3) * t * t + 1;
    if (t < 2) return ((a * t - 5 * a) * t + 8 * a) * t - 4 * a;
    return 0;
  } },
  lanczos: { radius: 3, weight: x => Math.abs(x) < 3 ? sinc(x) * sinc(x / 3) : 0 },
};

function lineEvaluator(length, scale, method, solveMoments) {
  const positions = Array.from({ length: length * scale }, (_, i) => sourceCoordinate(i, scale, length));
  if (method === 'spline') {
    return samples => {
      const moments = padNaturalMoments(solveMoments(splineRhs(samples)), samples.length);
      return Float64Array.from(positions, x => evaluateSpline(samples, moments, x));
    };
  }
  if (method === 'pchip') {
    return samples => {
      const slopes = pchipSlopes(samples);
      return Float64Array.from(positions, x => evaluatePchip(samples, slopes, x));
    };
  }
  if (method === 'nearest') {
    return samples => Float64Array.from(positions, x => samples[Math.floor(x + 0.5)]);
  }
  const kernel = kernels[method];
  if (!kernel) throw new RangeError('Unknown interpolation method');
  const weights = positions.map(x => {
    const first = Math.floor(x) - kernel.radius + 1;
    const points = Array.from({ length: 2 * kernel.radius }, (_, k) => {
      const index = first + k;
      return { index: clamp(index, 0, length - 1), weight: kernel.weight(x - index) };
    });
    const sum = points.reduce((total, point) => total + point.weight, 0);
    for (const point of points) point.weight /= sum;
    return points;
  });
  return samples => Float64Array.from(weights, points =>
    points.reduce((sum, point) => sum + point.weight * samples[point.index], 0));
}

export function enlarge(image, scale, method) {
  return enlargeSeparable(image, scale, method, solveThomas, solveThomas);
}

function enlargeSeparable(image, scale, method, solveHorizontal, solveVertical) {
  if (!Number.isInteger(scale) || scale < 1 || image.width < 1 || image.height < 1) {
    throw new RangeError('Invalid image shape or integer scale');
  }
  const width = image.width * scale, height = image.height * scale;
  const horizontal = new Float64Array(width * image.height);
  const row = lineEvaluator(image.width, scale, method, solveHorizontal);
  const column = lineEvaluator(image.height, scale, method, solveVertical);
  for (let y = 0; y < image.height; y++) {
    const start = y * image.width;
    horizontal.set(row(image.pixels.subarray(start, start + image.width)), y * width);
  }
  const pixels = new Float64Array(width * height);
  const samples = new Float64Array(image.height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < image.height; y++) samples[y] = horizontal[y * width + x];
    const line = column(samples);
    for (let y = 0; y < height; y++) pixels[y * width + x] = line[y];
  }
  return { width, height, pixels };
}

export function rowErrorBound(residual) {
  return residual / 16;
}

export function imageErrorBound(horizontalResidual, verticalResidual) {
  return rowErrorBound(SPLINE_OPERATOR_BOUND * horizontalResidual + verticalResidual);
}

export function enlargeSplineGaussSeidel(image, scale, pixelBudget, horizontalShare) {
  if (!Number.isFinite(pixelBudget) || pixelBudget <= 0) throw new RangeError('Pixel budget must be positive');
  if (horizontalShare !== undefined && !(horizontalShare > 0 && horizontalShare < 1)) {
    throw new RangeError('The horizontal share must be between zero and one');
  }
  const equalTolerance = 16 * pixelBudget / (SPLINE_OPERATOR_BOUND + 1);
  const toleranceX = horizontalShare === undefined ? equalTolerance
    : 16 * pixelBudget * horizontalShare / SPLINE_OPERATOR_BOUND;
  const toleranceY = horizontalShare === undefined ? equalTolerance
    : 16 * pixelBudget * (1 - horizontalShare);
  const newStats = () => ({ systems: 0, totalSweeps: 0, maxSweeps: 0, maxResidual: 0 });
  const horizontal = newStats(), vertical = newStats();
  const solve = (stats, tolerance) => rhs => {
    const result = solveGaussSeidel(rhs, { tolerance });
    if (!result.converged) throw new Error('A spline system reached the sweep limit');
    stats.systems++;
    stats.totalSweeps += result.sweeps;
    stats.maxSweeps = Math.max(stats.maxSweeps, result.sweeps);
    stats.maxResidual = Math.max(stats.maxResidual, result.residual);
    return result.solution;
  };
  const result = enlargeSeparable(image, scale, 'spline',
    solve(horizontal, toleranceX), solve(vertical, toleranceY));
  return {
    ...result, pixelBudget, tolerance: horizontalShare === undefined ? equalTolerance : undefined,
    toleranceX, toleranceY, horizontal, vertical,
    bound: imageErrorBound(horizontal.maxResidual, vertical.maxResidual),
  };
}

export function quantizePixels(pixels) {
  return Uint8Array.from(pixels, value => Math.round(clamp(value, 0, 255)));
}

export function imageMae(candidate, reference) {
  if (candidate.length !== reference.length || !reference.length) throw new RangeError('Pixel counts differ');
  let sum = 0;
  for (let i = 0; i < reference.length; i++) sum += Math.abs(candidate[i] - reference[i]);
  return sum / reference.length;
}

export function maxDifference(left, right) {
  if (left.length !== right.length) throw new RangeError('Vector lengths differ');
  let maximum = 0;
  for (let i = 0; i < left.length; i++) maximum = Math.max(maximum, Math.abs(left[i] - right[i]));
  return maximum;
}

export function compareSolvers(samples, options = {}) {
  const rhs = splineRhs(samples);
  const direct = solveThomas(rhs);
  const history = [];
  const subdivisions = options.subdivisions;
  if (subdivisions !== undefined && (!Number.isInteger(subdivisions) || subdivisions < 1)) {
    throw new RangeError('Subdivisions must be a positive integer');
  }
  const sampleDense = interior => {
    const moments = padNaturalMoments(interior, samples.length);
    return Float64Array.from({ length: (samples.length - 1) * subdivisions + 1 },
      (_, i) => evaluateSpline(samples, moments, i / subdivisions));
  };
  const reference = subdivisions === undefined ? null : sampleDense(direct);
  const iterative = solveGaussSeidel(rhs, {
    ...options,
    onSweep: (sweep, residual, solution) => {
      const point = { sweep, residual, momentError: maxDifference(solution, direct) };
      if (reference) {
        point.sampledError = maxDifference(sampleDense(solution), reference);
        point.bound = rowErrorBound(residual);
      }
      history.push(point);
    },
  });
  return {
    samples: Array.from(samples),
    rhs: Array.from(rhs),
    direct: Array.from(direct),
    iterative: Array.from(iterative.solution),
    directResidual: residualInfinity(rhs, direct),
    sweeps: iterative.sweeps,
    residual: iterative.residual,
    momentError: maxDifference(direct, iterative.solution),
    converged: iterative.converged,
    history,
  };
}
