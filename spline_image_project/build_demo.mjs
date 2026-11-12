import fs from 'node:fs/promises';
import { REFERENCE_WIDTH, REFERENCE_HEIGHT } from './src/interpolation.mjs';

const at = relative => new URL(relative, import.meta.url);
const text = relative => fs.readFile(at(relative), 'utf8');
const assets = {};
for (const photo of ['camera', 'astronaut']) {
  const bytes = await fs.readFile(at(`data/${photo}.gray8`));
  if (bytes.length !== REFERENCE_WIDTH * REFERENCE_HEIGHT) throw new Error(`Invalid crop for ${photo}`);
  assets[photo] = bytes.toString('base64');
}

const graph = (await fs.readFile(at('results/day14/kiem-chung-chan-1d.png'))).toString('base64');
const [template, core, ui] = await Promise.all([
  text('src/demo-template.html'), text('src/interpolation.mjs'), text('src/demo.mjs'),
]);
const html = template.replace('%%CONVERGENCE_GRAPH%%', graph)
  .replace('<!-- INLINE_MODULE -->', () =>
    `<script type="module">\n${core}\nconst EMBEDDED_PHOTOS = ${JSON.stringify(assets)};\n${ui}\n</script>`);
await fs.writeFile(at('demo.html'), html, 'utf8');
console.log('Offline demo generated.');
