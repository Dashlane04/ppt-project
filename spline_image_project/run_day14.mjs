import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import {
  REFERENCE_WIDTH, REFERENCE_HEIGHT, MAIN_METHODS, SCALES, SAMPLE_NAMES,
  PIXEL_TOLERANCES, DENSE_SUBDIVISIONS, SPLINE_OPERATOR_BOUND, SPLINE_TOLERANCE, MAX_SWEEPS,
  makeSynthetic, reduceByArea, enlarge, quantizePixels, compareSolvers, enlargeSplineGaussSeidel,
  imageMae, maxDifference,
} from './src/interpolation.mjs';

const root = name => new URL(name, import.meta.url);
const out = name => root('results/day14/' + name);
const prior = JSON.parse(await fs.readFile(root('results/results.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(root('data/manifest.json'), 'utf8'));
await fs.mkdir(out('data/'), { recursive: true });
const images = new Map();
for (const name of Object.keys(SAMPLE_NAMES)) {
  if (!manifest.photos[name]) {
    images.set(name, makeSynthetic(name));
  } else {
    const pixels = await fs.readFile(root('data/' + name + '.gray8'));
    assert.equal(pixels.length, REFERENCE_WIDTH * REFERENCE_HEIGHT);
    assert.equal(createHash('sha256').update(pixels).digest('hex'), manifest.photos[name].reference_gray8_sha256);
    images.set(name, { width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT, pixels });
  }
}

function float64LE(values) {
  const bytes = Buffer.alloc(values.length * 8);
  for (let i = 0; i < values.length; i++) bytes.writeDoubleLE(values[i], i * 8);
  return bytes;
}

// Day 8–9. One stringent trace per row, then take the first crossing of each preset.
const rowResults = [];
const slack = 2e-12;
for (const [name, lowRow] of [['edge', 16], ['texture', 28]]) {
  const input = reduceByArea(images.get(name), 4);
  const row = input.pixels.subarray(lowRow * input.width, (lowRow + 1) * input.width);
  const result = compareSolvers(row, { tolerance: SPLINE_TOLERANCE, subdivisions: DENSE_SUBDIVISIONS });
  assert.ok(result.converged);
  for (const point of result.history) {
    assert.ok(point.sampledError <= point.bound + slack, JSON.stringify({ name, point }));
  }
  const trials = PIXEL_TOLERANCES.map(delta => {
    const tolerance = 16 * delta;
    const stop = result.history.find(point => point.residual <= tolerance);
    assert.ok(stop && stop.sampledError <= delta + slack);
    return { delta, tolerance, ...stop };
  });
  rowResults.push({
    image: name, lowRow, scale: 4, samples: row.length, unknowns: row.length - 2,
    evaluationPoints: (row.length - 1) * DENSE_SUBDIVISIONS + 1,
    directResidual: result.directResidual, history: result.history, trials,
  });
}

// Day 10. Solve both passes by each solver and compare the unrounded images.
const imageResults = [];
for (const name of ['edge', 'texture']) {
  const input = reduceByArea(images.get(name), 4);
  const reference = enlarge(input, 4, 'spline');
  const reference8 = quantizePixels(reference.pixels);
  for (const delta of PIXEL_TOLERANCES) {
    const approx = enlargeSplineGaussSeidel(input, 4, delta);
    const errors = Float64Array.from(approx.pixels, (value, i) => Math.abs(value - reference.pixels[i]));
    const rawMax = maxDifference(approx.pixels, reference.pixels);
    const approx8 = quantizePixels(approx.pixels);
    let changed = 0, sumError = 0;
    for (let i = 0; i < errors.length; i++) {
      sumError += errors[i];
      changed += approx8[i] !== reference8[i];
    }
    assert.ok(rawMax <= approx.bound + slack && approx.bound <= delta + slack);
    const errorFile = `data/${name}-4x-delta-${delta}-abs-error.f64le`;
    await fs.writeFile(out(errorFile), float64LE(errors));
    imageResults.push({
      image: name, scale: 4, delta, tolerance: approx.tolerance,
      horizontal: approx.horizontal, vertical: approx.vertical,
      bound: approx.bound, rawMax, rawMae: sumError / errors.length,
      changed8BitPixels: changed, totalPixels: errors.length, errorFile,
    });
  }
}

// Day 11–12. Freeze the comparison pictures and regenerate the 30 quality numbers.
const quality = [], edgeProfiles = [];
for (const [name, reference] of images) {
  await fs.writeFile(out(`data/${name}-reference.gray8`), reference.pixels);
  for (const scale of SCALES) {
    const input = reduceByArea(reference, scale);
    const profiles = { scale, y: 64, methods: {} };
    for (const method of MAIN_METHODS) {
      const result = enlarge(input, scale, method);
      const display = quantizePixels(result.pixels);
      const mae = imageMae(display, reference.pixels);
      const check = prior.quality.find(row => row.image === name && row.scale === scale && row.method === method);
      assert.equal(mae, check.mae, `Baseline changed for ${name}/${scale}/${method}`);
      await fs.writeFile(out(`data/${name}-${scale}x-${method}.gray8`), display);
      quality.push({ image: name, scale, method, mae });
      if (name === 'edge') {
        const pixels = Array.from(result.pixels.subarray(64 * result.width, 65 * result.width));
        const low = Math.min(...pixels), high = Math.max(...pixels);
        profiles.methods[method] = { pixels, low, high, excursion: Math.max(0, 38 - low, high - 216) };
      }
    }
    if (name === 'edge') {
      profiles.reference = Array.from(reference.pixels.subarray(64 * reference.width, 65 * reference.width));
      edgeProfiles.push(profiles);
    }
  }
}

const output = {
  config: {
    referenceDimensions: [REFERENCE_WIDTH, REFERENCE_HEIGHT], scales: SCALES,
    rowSubdivisionsPerInterval: DENSE_SUBDIVISIONS, delta: PIXEL_TOLERANCES,
    gsReferenceTolerance: SPLINE_TOLERANCE, maxSweeps: MAX_SWEEPS, validationSlack: slack,
    splineOperatorBound: SPLINE_OPERATOR_BOUND, singlePassBound: 'rInf/16',
    twoPassBound: '(2.5*rowResidualMax+columnResidualMax)/16', sharedTolerance: '16*delta/3.5',
    differenceDataEncoding: 'Float64 little-endian, row major, 384×224',
  },
  rowResults, imageResults, quality, edgeProfiles,
};
await fs.writeFile(out('KET_QUA_NGAY_14.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({
  rowTrials: rowResults.map(r => ({ image: r.image, trials: r.trials })),
  imageTrials: imageResults.map(r => ({
    image: r.image, delta: r.delta, rawMax: r.rawMax, bound: r.bound,
    changed8BitPixels: r.changed8BitPixels,
  })),
  qualityRuns: quality.length,
}, null, 2));
