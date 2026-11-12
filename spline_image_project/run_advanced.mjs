import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  enlarge, enlargeSplineGaussSeidel, evaluatePchip, evaluateSpline, imageMae, makeSynthetic,
  maxDifference, padNaturalMoments, pchipSlopes, quantizePixels, reduceByArea,
  solveGaussSeidel, solveThomas, SPLINE_OPERATOR_BOUND, splineRhs,
} from './src/interpolation.mjs';

const output = new URL('./results/advanced/', import.meta.url);
mkdirSync(output, { recursive: true });
const imageBudget = 0.1;
const imageShares = [null, 0.25, 0.5, 0.75];
const B = SPLINE_OPERATOR_BOUND;
const weights3d = [B ** 2, B, 1];

function overshoot(pixels, samples) {
  let low = Infinity, high = -Infinity;
  for (const value of samples) {
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  let outside = 0;
  for (const value of pixels) outside = Math.max(outside, low - value, value - high);
  return outside;
}

function verifyBound(error, bound, delta) {
  // Tolerance here is only for comparing Float64 measurements with the exact-arithmetic bound.
  assert.ok(error <= bound + 2e-12 && bound <= delta + 2e-12);
}

const allocation2d = [];
const quality2d = [];
const profiles2d = [];
for (const image of ['edge', 'lines', 'texture']) {
  const truth = makeSynthetic(image);
  for (const scale of [2, 4]) {
    const input = reduceByArea(truth, scale);
    const spline = enlarge(input, scale, 'spline').pixels;
    if (image !== 'texture') {
      const methods = {
        linear: enlarge(input, scale, 'linear').pixels,
        cubic: enlarge(input, scale, 'cubic').pixels,
        spline,
        pchip: enlarge(input, scale, 'pchip').pixels,
      };
      for (const [method, pixels] of Object.entries(methods)) {
        const excess = overshoot(pixels, input.pixels);
        if (method === 'pchip') assert.ok(excess < 2e-12);
        quality2d.push({ image, scale, method, overshoot: excess,
          mae: imageMae(quantizePixels(pixels), truth.pixels) });
      }
      if (image === 'edge') {
        const start = truth.width * 64;
        const profile = values => Array.from(values.slice(start + 175, start + 206));
        profiles2d.push({ scale, xStart: 175, reference: profile(truth.pixels),
          ...Object.fromEntries(Object.entries(methods).map(([method, values]) => [method, profile(values)])) });
      }
    }
    if (scale !== 4 || image === 'lines') continue;
    for (const share of imageShares) {
      const run = enlargeSplineGaussSeidel(input, scale, imageBudget, share ?? undefined);
      const error = maxDifference(spline, run.pixels);
      verifyBound(error, run.bound, imageBudget);
      const updates = [
        (input.width - 2) * run.horizontal.totalSweeps,
        (input.height - 2) * run.vertical.totalSweeps,
      ];
      allocation2d.push({ image, share: share ?? B / (B + 1), baseline: share === null,
        tolerances: [run.toleranceX, run.toleranceY], updates,
        maxSweeps: [run.horizontal.maxSweeps, run.vertical.maxSweeps],
        residuals: [run.horizontal.maxResidual, run.vertical.maxResidual],
        totalUpdates: updates[0] + updates[1], error, bound: run.bound });
    }
  }
}

const dimensions = [33, 33, 25]; // Fine grid at 1 mm, with integer coordinates.
const inputSpacing = [2, 2, 3];
const coarseDimensions = dimensions.map((n, axis) => (n - 1) / inputSpacing[axis] + 1);
const gaussian = (x, y, z) =>
  200 * Math.exp(-((x - 16) ** 2 + (y - 16) ** 2) / 80 - (z - 12) ** 2 / 24);
function phantom(x, y, z) {
  const radiusSquared = ((x - 16) / 12) ** 2 + ((y - 16) / 10) ** 2 + ((z - 12) / 9) ** 2;
  const insert = ((x - 20) / 3) ** 2 + ((y - 14) / 3) ** 2 + ((z - 11) / 4) ** 2;
  if (radiusSquared > 1) return 15;
  if (radiusSquared >= 0.73) return 220;
  return insert <= 1 ? 135 : 65;
}

const sizeOf = shape => shape.reduce((a, b) => a * b, 1);
const indexOf = (shape, x, y, z) => (z * shape[1] + y) * shape[0] + x;

function sampleVolume(shape, spacing, field) {
  const pixels = new Float64Array(sizeOf(shape));
  for (let z = 0; z < shape[2]; z++) {
    for (let y = 0; y < shape[1]; y++) {
      for (let x = 0; x < shape[0]; x++) {
        pixels[indexOf(shape, x, y, z)] = field(x * spacing[0], y * spacing[1], z * spacing[2]);
      }
    }
  }
  return pixels;
}

function resampleAxis(pixels, shape, axis, method, tolerance) {
  const length = shape[axis];
  const step = inputSpacing[axis];
  const next = shape.slice();
  next[axis] = dimensions[axis];
  const result = new Float64Array(sizeOf(next));
  const line = new Float64Array(length);
  const [a, b] = [0, 1, 2].filter(direction => direction !== axis);
  const stride = sizeOf(shape.slice(0, axis));
  const nextStride = sizeOf(next.slice(0, axis));
  const stats = { systems: 0, maxResidual: 0, maxSweeps: 0, totalUpdates: 0 };
  for (let u = 0; u < shape[a]; u++) {
    for (let v = 0; v < shape[b]; v++) {
      const coordinate = [0, 0, 0];
      coordinate[a] = u;
      coordinate[b] = v;
      const start = indexOf(shape, ...coordinate);
      const nextStart = indexOf(next, ...coordinate);
      for (let i = 0; i < length; i++) line[i] = pixels[start + stride * i];
      let evaluate;
      if (method === 'linear') {
        evaluate = x => {
          const i = Math.min(Math.floor(x), length - 2), t = x - i;
          return (1 - t) * line[i] + t * line[i + 1];
        };
      } else if (method === 'pchip') {
        const slopes = pchipSlopes(line);
        evaluate = x => evaluatePchip(line, slopes, x);
      } else {
        const rhs = splineRhs(line);
        let coefficients;
        if (tolerance === undefined) {
          coefficients = solveThomas(rhs);
        } else {
          const run = solveGaussSeidel(rhs, { tolerance });
          assert.ok(run.converged);
          coefficients = run.solution;
          stats.systems++;
          stats.maxResidual = Math.max(stats.maxResidual, run.residual);
          stats.maxSweeps = Math.max(stats.maxSweeps, run.sweeps);
          stats.totalUpdates += rhs.length * run.sweeps;
        }
        const moments = padNaturalMoments(coefficients, length);
        evaluate = x => evaluateSpline(line, moments, x);
      }
      for (let i = 0; i < next[axis]; i++) result[nextStart + nextStride * i] = evaluate(i / step);
    }
  }
  return { pixels: result, shape: next, stats };
}

function resampleVolume(input, method, tolerances = []) {
  let volume = { pixels: input, shape: coarseDimensions };
  const passes = [];
  for (let axis = 0; axis < dimensions.length; axis++) {
    volume = resampleAxis(volume.pixels, volume.shape, axis, method, tolerances[axis]);
    passes.push(volume.stats);
  }
  return { pixels: volume.pixels, passes };
}

const heldOut = [];
const known = [];
for (let z = 0; z < dimensions[2]; z++) {
  for (let y = 0; y < dimensions[1]; y++) {
    for (let x = 0; x < dimensions[0]; x++) {
      const indices = [x, y, z].every((i, a) => i % inputSpacing[a] === 0) ? known : heldOut;
      indices.push(indexOf(dimensions, x, y, z));
    }
  }
}
const allocations = [
  { name: 'equal-residual', shares: weights3d.map(weight => weight / (B ** 2 + B + 1)) },
  { name: 'equal-error', shares: [1 / 3, 1 / 3, 1 / 3] },
  { name: 'later-axes', shares: [1 / 6, 1 / 3, 1 / 2] },
  { name: 'z-priority', shares: [0.10, 0.25, 0.65] },
];
const volumeBudgets = [1, 0.1, 0.01];
const quality3d = [];
const allocation3d = [];
const views = {};
for (const [name, field] of Object.entries({ gaussian, phantom })) {
  const input = sampleVolume(coarseDimensions, inputSpacing, field);
  const reference = sampleVolume(dimensions, [1, 1, 1], field);
  const candidates = {};
  for (const method of ['linear', 'spline', 'pchip']) {
    const { pixels } = resampleVolume(input, method);
    candidates[method] = pixels;
    assert.ok(known.every(i => Math.abs(pixels[i] - reference[i]) < 2e-12));
    const mae = heldOut.reduce((sum, i) => sum + Math.abs(pixels[i] - reference[i]), 0) / heldOut.length;
    const excess = overshoot(pixels, input);
    if (method === 'pchip') assert.ok(excess < 2e-12);
    quality3d.push({ field: name, method, mae, overshoot: excess });
  }
  for (const delta of volumeBudgets) {
    for (const { name: scheme, shares } of allocations) {
      const tolerances = shares.map((share, axis) => 16 * delta * share / weights3d[axis]);
      const { pixels, passes } = resampleVolume(input, 'spline', tolerances);
      const bound = passes.reduce((sum, stats, axis) => sum + weights3d[axis] * stats.maxResidual, 0) / 16;
      const error = maxDifference(pixels, candidates.spline);
      verifyBound(error, bound, delta);
      allocation3d.push({ field: name, delta, scheme, shares, tolerances, passes,
        totalUpdates: passes.reduce((sum, stats) => sum + stats.totalUpdates, 0), error, bound });
    }
  }
  const indices = {
    axial: { width: 33, height: 33, index: (x, y) => indexOf(dimensions, x, y, 11) },
    coronal: { width: 33, height: 25, index: (x, z) => indexOf(dimensions, x, 15, z) },
    sagittal: { width: 33, height: 25, index: (y, z) => indexOf(dimensions, 17, y, z) },
  };
  views[name] = Object.fromEntries(Object.entries(indices).map(([plane, { width, height, index }]) => {
    const view = pixels => Array.from({ length: width * height }, (_, i) =>
      pixels[index(i % width, Math.floor(i / width))]);
    return [plane, { width, height, reference: view(reference),
      ...Object.fromEntries(Object.entries(candidates).map(([method, pixels]) => [method, view(pixels)])) }];
  }));
}

function save(name, value) {
  writeFileSync(new URL(name, output), JSON.stringify(value, null, 2) + '\n');
}
save('KET_QUA_NANG_CAO.json', {
  allocation2d, quality2d, allocation3d, quality3d,
  geometry: { dimensions, inputSpacing, coarseDimensions, knownVoxels: known.length,
    heldOutVoxels: heldOut.length, weights3d },
});
save('DU_LIEU_HINH.json', { profiles2d, views });
console.log('Verified 8 allocations in 2D, 24 allocations in 3D and preservation of known voxel samples.');
