import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  REFERENCE_WIDTH, REFERENCE_HEIGHT, SCALES, MAIN_METHODS, SAMPLE_NAMES, METHOD_NAMES,
  SPLINE_TOLERANCE, MAX_SWEEPS, makeSynthetic, reduceByArea, enlarge, quantizePixels,
  imageMae, compareSolvers, padNaturalMoments, evaluateSpline, sourceCoordinate, maxDifference,
} from './src/interpolation.mjs';

const at = relative => new URL(relative, import.meta.url);
const write = (name, data) => fs.writeFile(at(name), data);
const read = name => fs.readFile(at(name));
const fingerprint = bytes => createHash('sha256').update(bytes).digest('hex');
const fmt = number => number.toFixed(4).replace('.', ',');
const sci = number => number === 0 ? '0' : number.toExponential(3);

await fs.mkdir(at('results/profiles'), { recursive: true });
const manifest = JSON.parse(await read('data/manifest.json'));
const images = new Map();
for (const key of Object.keys(SAMPLE_NAMES)) {
  if (!manifest.photos[key]) {
    images.set(key, makeSynthetic(key));
    continue;
  }
  const pixels = await read(`data/${key}.gray8`);
  if (pixels.length !== REFERENCE_WIDTH * REFERENCE_HEIGHT ||
      fingerprint(pixels) !== manifest.photos[key].reference_gray8_sha256) {
    throw new Error(`Invalid reference crop for ${key}`);
  }
  images.set(key, { width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT, pixels });
}

const quality = [], inputs = [];
const sampleProfiles = {};
for (const [key, image] of images) {
  for (const scale of SCALES) {
    const input = reduceByArea(image, scale);
    const inputBytes = Buffer.alloc(8 * input.pixels.length);
    for (let i = 0; i < input.pixels.length; i++) inputBytes.writeDoubleLE(input.pixels[i], 8 * i);
    const inputName = `results/profiles/${key}-${scale}x-input.f64le`;
    await write(inputName, inputBytes);
    inputs.push({
      image: key, scale, width: input.width, height: input.height, path: inputName,
      sha256: fingerprint(inputBytes),
    });
    for (const method of MAIN_METHODS) {
      const reconstructed = enlarge(input, scale, method);
      const display = quantizePixels(reconstructed.pixels);
      quality.push({
        image: key, scale, inputDimensions: [input.width, input.height],
        method, mae: imageMae(display, image.pixels),
      });
      if (scale === 4 && (key === 'edge' || key === 'texture')) {
        const profileY = key === 'edge' ? 64 : 112;
        const start = profileY * image.width;
        sampleProfiles[key] ??= {
          y: profileY, reference: Array.from(image.pixels.subarray(start, start + image.width)), methods: {},
        };
        sampleProfiles[key].methods[method] = Array.from(reconstructed.pixels.subarray(start, start + image.width));
        // Preserve the four fixed-stage displays as plain grayscale data for reproducible figures.
        await write(`results/profiles/${key}-${method}-4x.gray8`, display);
      }
    }
    if (scale === 4 && (key === 'edge' || key === 'texture')) {
      await write(`results/profiles/${key}-original.gray8`, image.pixels);
    }
  }
}

const cases = [
  { name: 'edge', lowRow: 16, description: 'Hàng biên thẳng, lấy từ hàng gốc 64–67' },
  { name: 'texture', lowRow: 28, description: 'Hàng hoa văn, lấy từ hàng gốc 112–115' },
  { name: 'flat', lowRow: null, description: 'Hàng đối chứng hằng 128' },
];
const solver = cases.map(row => {
  const scale = 4;
  const input = row.name === 'flat' ? null : reduceByArea(images.get(row.name), scale);
  const samples = input ? input.pixels.subarray(row.lowRow * input.width, (row.lowRow + 1) * input.width)
    : new Float64Array(REFERENCE_WIDTH / scale).fill(128);
  const result = compareSolvers(samples);
  const direct = padNaturalMoments(result.direct, samples.length);
  const iterative = padNaturalMoments(result.iterative, samples.length);
  const sampleOutput = moments => Float64Array.from({ length: REFERENCE_WIDTH }, (_, i) =>
    evaluateSpline(samples, moments, sourceCoordinate(i, scale, samples.length)));
  return {
    ...row, scale, sampleCount: samples.length, unknownCount: result.rhs.length,
    ...result, rawSampledRowError: maxDifference(sampleOutput(direct), sampleOutput(iterative)),
  };
});
if (!solver.every(row => row.converged)) throw new Error('A required Gauss–Seidel trial failed to converge');
if (solver.find(row => row.name === 'flat').sweeps !== 0) throw new Error('The flat row should converge at iteration zero');

const report = {
  config: {
    referenceDimensions: [REFERENCE_WIDTH, REFERENCE_HEIGHT], scales: SCALES,
    downsampling: 'nonoverlapping box mean, float64, no intermediate quantization',
    coordinates: 'half-pixel centers, query clamped to sample interval, replicate index for kernel support',
    keysA: -0.5, splineStep: 1, splineEnds: 'second derivative zero',
    gsInitial: 'zero', gsOrder: 'left to right', toleranceAbsoluteInfinity: SPLINE_TOLERANCE,
    maxSweeps: MAX_SWEEPS, mae: '8-bit displayed values vs fixed reference, intensity units',
    photoManifest: 'data/manifest.json',
  },
  inputFiles: inputs, quality, solver, sampleProfiles,
};
await write('results/results.json', JSON.stringify(report, null, 2) + '\n');

const lines = [
  '# Kết quả chạy ngày 1–7',
  '',
  'Ảnh tham chiếu 384 × 224 px. MAE đo trên ảnh đã chặn và làm tròn về 8 bit. Các số dưới đây tính từ một lần chạy có cấu hình cố định.',
  '',
  '| Ảnh | Mức phóng | Song tuyến tính | Bicubic Keys | Spline tự nhiên |',
  '|---|---:|---:|---:|---:|',
];
for (const key of images.keys()) {
  for (const scale of SCALES) {
    const values = MAIN_METHODS.map(method => quality.find(row => row.image === key && row.scale === scale && row.method === method).mae);
    lines.push(`| ${SAMPLE_NAMES[key]} | ${scale}× | ${values.map(fmt).join(' | ')} |`);
  }
}
lines.push('', '## Hai bộ giải trên hàng pixel ở mức 4×', '',
  'Mỗi hàng có 96 mẫu và 94 ẩn bên trong. Cùng vế phải cho cả hai bộ giải. Ngưỡng dừng tuyệt đối 10⁻⁸ theo chuẩn vô cùng.',
  '', '| Hàng | Vòng GS | Phần dư Thomas | Phần dư GS | Sai khác đạo hàm cấp hai | Sai lệch mức xám trên lưới đầu ra |',
  '|---|---:|---:|---:|---:|---:|');
for (const row of solver) {
  lines.push(`| ${row.description} | ${row.sweeps} | ${sci(row.directResidual)} | ${sci(row.residual)} | ${sci(row.momentError)} | ${sci(row.rawSampledRowError)} |`);
}
lines.push('', 'Sai lệch mức xám ở cột cuối so với spline dùng Thomas, tính trước chặn và làm tròn trên 384 vị trí đầu ra.',
  '', '- [Đồ thị phần dư](hoi-tu-gauss-seidel.png)', '- [Mức sáng qua biên](mat-cat-bien.png)',
  '- [Ảnh đối chiếu ở 4×](so-sanh-anh-4x.png)', '- [Cấu hình, dữ liệu thô và lịch sử từng vòng](results.json)', '');
await write('results/KET_QUA.md', lines.join('\n'));
console.log(JSON.stringify({
  images: images.size, qualityCases: quality.length,
  baseline4x: quality.filter(row => row.scale === 4 && ['edge', 'texture'].includes(row.image)),
  solver: solver.map(({ name, sweeps, residual, directResidual, momentError, rawSampledRowError }) =>
    ({ name, sweeps, residual, directResidual, momentError, rawSampledRowError })),
  methodNames: MAIN_METHODS.map(method => METHOD_NAMES[method]),
}, null, 2));
