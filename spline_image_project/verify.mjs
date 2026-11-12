import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareSolvers, enlarge, enlargeSplineGaussSeidel, evaluatePchip, evaluateSpline, imageMae, maxDifference,
  padNaturalMoments, pchipSlopes, quantizePixels,
  reduceByArea, residualInfinity, solveGaussSeidel, solveThomas, sourceCoordinate, splineRhs,
} from './src/interpolation.mjs';

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${expected}, got ${actual}`);
}

test('area means retain fractions and share the prescribed pixel centers', () => {
  const image = { width: 4, height: 2, pixels: Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]) };
  const low = reduceByArea(image, 2);
  assert.deepEqual([low.width, low.height, ...low.pixels], [2, 1, 2.5, 4.5]);
  assert.deepEqual([0, 1, 2, 3].map(u => sourceCoordinate(u, 2, 2)), [0, 0.25, 0.75, 1]);
});

test('bilinear interpolation agrees with hand calculations on a 2 by 2 patch', () => {
  const image = { width: 2, height: 2, pixels: Uint8Array.from([0, 40, 80, 120]) };
  const output = enlarge(image, 3, 'linear');
  // At u=v=2, the query is at (1/3,1/3). Output is 40 for this affine image.
  close(output.pixels[2 * output.width + 2], 40);
  const two = enlarge(image, 2, 'linear');
  // The four inner samples are 30, 50, 70, 90, symmetric about 60.
  assert.deepEqual([two.pixels[5], two.pixels[6], two.pixels[9], two.pixels[10]], [30, 50, 70, 90]);
});

test('all samplers preserve constant images and preserve exact samples at scale one', () => {
  const constant = { width: 4, height: 3, pixels: new Uint8Array(12).fill(137) };
  const input = { width: 4, height: 3, pixels: Uint8Array.from({ length: 12 }, (_, i) => i * 17) };
  for (const method of ['nearest', 'linear', 'cubic', 'spline', 'pchip', 'lanczos']) {
    for (const value of enlarge(constant, 4, method).pixels) close(value, 137, 1e-10);
    assert.equal(imageMae(quantizePixels(enlarge(input, 1, method).pixels), input.pixels), 0);
  }
});

test('PCHIP preserves each interval range through flats and slope reversals', () => {
  for (const samples of [[7], [7, 10], [3, 3, 8, 12, 1, 2, 100], [100, 2, 1, 12, 8, 3, 3]]) {
    const slopes = pchipSlopes(samples);
    for (let i = 0; i < samples.length; i++) close(evaluatePchip(samples, slopes, i), samples[i]);
    for (let i = 0; i < samples.length - 1; i++) {
      const low = Math.min(samples[i], samples[i + 1]);
      const high = Math.max(samples[i], samples[i + 1]);
      for (let k = 1; k < 64; k++) {
        const value = evaluatePchip(samples, slopes, i + k / 64);
        assert.ok(value >= low - 1e-12 && value <= high + 1e-12);
      }
    }
  }
});

test('Thomas solves the two-unknown spline system and matches the interpolation knots', () => {
  const samples = [0, 1, 0, 1];
  const rhs = splineRhs(samples);
  assert.deepEqual([...rhs], [-12, 12]);
  const interior = solveThomas(rhs);
  assert.deepEqual([...interior], [-4, 4]);
  assert.equal(residualInfinity(rhs, interior), 0);
  const moments = padNaturalMoments(interior, samples.length);
  assert.deepEqual([...moments], [0, -4, 4, 0]);
  for (let i = 0; i < samples.length; i++) close(evaluateSpline(samples, moments, i), samples[i]);
  for (let i = 1; i < samples.length - 1; i++) {
    const leftSlope = samples[i] - samples[i - 1] + (moments[i - 1] + 2 * moments[i]) / 6;
    const rightSlope = samples[i + 1] - samples[i] - (2 * moments[i] + moments[i + 1]) / 6;
    close(leftSlope, rightSlope);
  }
});

test('spline reproduces linear ramps and handles one or two samples', () => {
  for (const samples of [[7], [7, 10], [7, 10, 13, 16]]) {
    const moments = padNaturalMoments(solveThomas(splineRhs(samples)), samples.length);
    assert.ok(moments.every(moment => moment === 0));
    for (let x = 0; x <= samples.length - 1; x += 0.125) close(evaluateSpline(samples, moments, x), 7 + 3 * x);
  }
});

test('Gauss–Seidel updates in place, converges to Thomas and stops immediately on a flat row', () => {
  const rhs = splineRhs([0, 1, 0, 1]);
  const first = solveGaussSeidel(rhs, { tolerance: 0, maxSweeps: 1 });
  assert.deepEqual([...first.solution], [-3, 3.75]);
  assert.equal(first.sweeps, 1);
  assert.equal(first.converged, false);
  const iterative = solveGaussSeidel(rhs);
  assert.ok(iterative.converged && iterative.residual <= 1e-8);
  assert.ok(maxDifference(iterative.solution, solveThomas(rhs)) <= 5e-9);
  assert.equal(solveGaussSeidel(splineRhs([128, 128, 128])).sweeps, 0);
});

test('dense row errors stay below the residual-based bound at every recorded sweep', () => {
  const row = [38, 38, 127, 216, 216, 40, 100, 140];
  const { history } = compareSolvers(row, { subdivisions: 64 });
  assert.ok(history.every(point => point.sampledError <= point.bound + 2e-12));
  assert.ok(history[0].sampledError > 0);
});

test('the two-pass solver meets an image budget and records row and column sweeps', () => {
  const image = { width: 4, height: 3, pixels: Float64Array.from([8, 40, 29, 221, 122, 78, 2, 0, 9, 19, 199, 4]) };
  const reference = enlarge(image, 4, 'spline');
  const result = enlargeSplineGaussSeidel(image, 4, 0.01);
  assert.equal(result.horizontal.systems, 3);
  assert.equal(result.vertical.systems, 16);
  assert.ok(result.horizontal.maxResidual <= result.tolerance);
  assert.ok(result.vertical.maxResidual <= result.tolerance);
  assert.ok(maxDifference(result.pixels, reference.pixels) <= result.bound + 2e-12);
  assert.ok(result.bound <= 0.01 + 2e-12);
});
