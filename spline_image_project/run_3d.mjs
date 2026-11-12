import { mkdirSync, writeFileSync } from 'node:fs';
import { evaluateSpline, padNaturalMoments, solveThomas, splineRhs } from './src/interpolation.mjs';

const xySize = 17;
const zSize = 13;
const knownSpacing = 3;
const knownZ = [0, 3, 6, 9, 12];
const heldOutZ = Array.from({ length: zSize }, (_, z) => z).filter(z => !knownZ.includes(z));
const intensity = (x, y, z) =>
  200 * Math.exp(-((x - 8) ** 2 + (y - 8) ** 2) / 24 - (z - 6) ** 2 / 8);

let linearAbsSum = 0;
let splineAbsSum = 0;
for (let y = 0; y < xySize; y++) {
  for (let x = 0; x < xySize; x++) {
    const samples = knownZ.map(z => intensity(x, y, z));
    const moments = padNaturalMoments(solveThomas(splineRhs(samples)), samples.length);
    for (const z of heldOutZ) {
      // The spline solver uses unit knot spacing, so convert millimetres to knot units.
      const p = z / knownSpacing;
      const i = Math.floor(p);
      const t = p - i;
      const truth = intensity(x, y, z);
      linearAbsSum += Math.abs((1 - t) * samples[i] + t * samples[i + 1] - truth);
      splineAbsSum += Math.abs(evaluateSpline(samples, moments, p) - truth);
    }
  }
}

const evaluatedVoxels = xySize ** 2 * heldOutZ.length;
const result = {
  volumeDimensions: [xySize, xySize, zSize],
  referenceSpacingMm: [1, 1, 1],
  knownZMm: knownZ,
  heldOutZMm: heldOutZ,
  evaluatedVoxels,
  maeLinear: linearAbsSum / evaluatedVoxels,
  maeNaturalSpline: splineAbsSum / evaluatedVoxels,
};
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL('./results/KET_QUA_3D.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(result);
