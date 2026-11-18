// Built into the same module as interpolation.mjs. The comparison and batch
// experiment both call that core, including the same coordinate convention.
const byId = id => document.getElementById(id);
const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 });
const sci = value => value === 0 ? '0' : value.toExponential(3);
const sample = byId('sample'), scaleSelect = byId('scale');
const methodSelects = { left: byId('left-method'), right: byId('right-method') };
const methodDescription = {
  original: 'Ảnh xám tham chiếu trước khi thu nhỏ.',
  nearest: 'Lấy mức xám của mẫu gần tọa độ truy vấn nhất.',
  linear: 'Tính trung bình có trọng số giữa hai mẫu theo mỗi chiều.',
  cubic: 'Dùng bốn trọng số bậc ba theo mỗi chiều với a = −0,5.',
  spline: 'Giải hệ ba đường chéo bằng Thomas trên từng hàng, rồi từng cột.',
  pchip: 'Dùng đa thức Hermite bậc ba và giới hạn độ dốc để giữ dải mức xám.',
  lanczos: 'Dùng sáu mẫu theo mỗi chiều với trọng số sinc có cửa sổ.',
};

for (const [key, label] of Object.entries(SAMPLE_NAMES)) sample.add(new Option(label, key));
for (const select of Object.values(methodSelects)) {
  for (const [key, label] of Object.entries(METHOD_NAMES)) select.add(new Option(label, key));
}
methodSelects.left.value = 'cubic';
methodSelects.right.value = 'spline';

function getReference(key) {
  if (!EMBEDDED_PHOTOS[key]) return makeSynthetic(key);
  const bytes = atob(EMBEDDED_PHOTOS[key]);
  return {
    width: REFERENCE_WIDTH, height: REFERENCE_HEIGHT,
    pixels: Uint8Array.from(bytes, char => char.charCodeAt(0)),
  };
}

function paint(canvas, width, height, pixels, name) {
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute('aria-label', name);
  const context = canvas.getContext('2d');
  const data = context.createImageData(width, height);
  for (let i = 0; i < pixels.length; i++) {
    const j = 4 * i;
    data.data[j] = data.data[j + 1] = data.data[j + 2] = pixels[i];
    data.data[j + 3] = 255;
  }
  context.putImageData(data, 0, 0);
}

function setupPixelComparison() {
  const canvas = byId('input-canvas'), marker = byId('pixel-marker');
  const slider = byId('pixel-slider'), valueInput = byId('pixel-value');
  const reset = byId('pixel-reset');
  let reference, scale, input, originalInput, originalOutputs, x, y;
  let frame = null;
  const selectedIndex = () => y * input.width + x;
  const isEdited = () => input.pixels[selectedIndex()] !== originalInput.pixels[selectedIndex()];
  const renderedPixels = (image, method) => quantizePixels(enlarge(image, scale, method).pixels);

  function renderImages() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    paint(canvas, input.width, input.height, quantizePixels(input.pixels), 'Ảnh nhỏ để chọn pixel');
    const edited = isEdited();
    const currentOutputs = new Map();
    for (const [side, select] of Object.entries(methodSelects)) {
      const method = select.value;
      if (!originalOutputs.has(method)) originalOutputs.set(method, renderedPixels(originalInput, method));
      const before = originalOutputs.get(method);
      const compareEdit = edited && method !== 'original';
      if (compareEdit && !currentOutputs.has(method)) currentOutputs.set(method, renderedPixels(input, method));
      const pixels = compareEdit ? currentOutputs.get(method) : before;
      paint(byId(side + '-canvas'), reference.width, reference.height, pixels, METHOD_NAMES[method]);
      byId(side + '-metric').textContent = method === 'original' ? 'Mốc so sánh'
        : `MAE ${number.format(imageMae(pixels, reference.pixels))} mức xám`;
      byId(side + '-description').textContent = methodDescription[method];
      const effect = byId(side + '-pixel-effect');
      effect.hidden = !compareEdit;
      if (compareEdit) {
        let changed = 0, maximum = 0;
        for (let i = 0; i < pixels.length; i++) {
          const difference = Math.abs(pixels[i] - before[i]);
          changed += difference !== 0;
          maximum = Math.max(maximum, difference);
        }
        effect.textContent = `Sau làm tròn · ${number.format(changed)} pixel đầu ra thay đổi`
          + ` · Chênh lớn nhất ${maximum} mức xám so với trước khi chỉnh.`;
      }
    }
  }

  function reflectSelection(updateNumber = true) {
    const index = selectedIndex();
    const original = originalInput.pixels[index], current = input.pixels[index];
    marker.style.left = `${100 * x / input.width}%`;
    marker.style.top = `${100 * y / input.height}%`;
    marker.style.width = `${100 / input.width}%`;
    marker.style.height = `${100 / input.height}%`;
    slider.value = current;
    if (updateNumber) valueInput.value = current;
    reset.disabled = !isEdited();
    byId('pixel-position').textContent = `Pixel (${x}, ${y}) · Gốc ${number.format(original)} → ${number.format(current)}`;
    canvas.dispatchEvent(new Event('input-pixel-change'));
  }

  function initialize() {
    reference = getReference(sample.value);
    scale = Number(scaleSelect.value);
    originalInput = reduceByArea(reference, scale);
    input = { ...originalInput, pixels: originalInput.pixels.slice() };
    originalOutputs = new Map([['original', reference.pixels]]);
    x = Math.floor(input.width / 2);
    y = Math.floor(input.height / 4);
    byId('dimensions').textContent = `${input.width} × ${input.height} px → ${reference.width} × ${reference.height} px`;
    reflectSelection();
    renderImages();
  }

  function selectPixel(column, row) {
    const nextX = clamp(column, 0, input.width - 1);
    const nextY = clamp(row, 0, input.height - 1);
    if (nextX === x && nextY === y) return;
    input.pixels[selectedIndex()] = originalInput.pixels[selectedIndex()];
    x = nextX;
    y = nextY;
    reflectSelection();
    renderImages();
  }

  function changeValue(value, updateNumber = true) {
    if (input.pixels[selectedIndex()] === value) return;
    input.pixels[selectedIndex()] = value;
    reflectSelection(updateNumber);
    if (frame === null) frame = requestAnimationFrame(renderImages);
  }

  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    selectPixel(Math.floor((event.clientX - rect.left) * input.width / rect.width),
      Math.floor((event.clientY - rect.top) * input.height / rect.height));
  });
  const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  canvas.addEventListener('keydown', event => {
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    selectPixel(x + direction[0], y + direction[1]);
  });
  slider.addEventListener('input', () => changeValue(Math.round(slider.valueAsNumber)));
  valueInput.addEventListener('input', () => {
    if (valueInput.validity.valid) changeValue(valueInput.valueAsNumber, false);
  });
  valueInput.addEventListener('blur', () => { valueInput.value = input.pixels[selectedIndex()]; });
  reset.addEventListener('click', () => changeValue(originalInput.pixels[selectedIndex()]));
  for (const select of [sample, scaleSelect]) select.addEventListener('change', initialize);
  for (const select of Object.values(methodSelects)) select.addEventListener('change', renderImages);
  initialize();

  return {
    changeValue,
    rowWindow(length) {
      const column = clamp(x - Math.floor(length / 2), 0, input.width - length);
      const start = y * input.width + column;
      return { y, column, index: x - column, samples: input.pixels.subarray(start, start + length) };
    },
  };
}

const pixelComparison = setupPixelComparison();

function compareRow() {
  const kind = byId('solver-case').value;
  const lowRow = kind === 'edge' ? 16 : 28;
  const input = kind === 'flat' ? null : reduceByArea(getReference(kind), 4);
  const row = input ? input.pixels.subarray(lowRow * input.width, (lowRow + 1) * input.width)
    : new Float64Array(REFERENCE_WIDTH / 4).fill(128);
  const selectedBudget = byId('row-delta').value;
  const tolerance = selectedBudget === 'strict' ? SPLINE_TOLERANCE : 16 * Number(selectedBudget);
  const result = compareSolvers(row, { tolerance, subdivisions: DENSE_SUBDIVISIONS });
  const last = result.history.at(-1);
  byId('solver-result').textContent =
    `${result.sweeps} vòng · Phần dư ${sci(result.residual)} · Ngưỡng ${sci(tolerance)}`;
  byId('solver-error').textContent =
    `Sai lệch trên 6.081 điểm ${sci(last.sampledError)} mức xám. Chặn ${sci(last.bound)} mức xám.`;
  const records = result.history.map(step => {
    const tr = document.createElement('tr');
    for (const value of [step.sweep, sci(step.residual), sci(step.sampledError), sci(step.bound)]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      tr.append(cell);
    }
    return tr;
  });
  byId('trace').replaceChildren(...records);
}

function compareWholeImage() {
  const delta = Number(byId('image-delta').value);
  const share = byId('image-share').value;
  const input = reduceByArea(getReference(byId('image-case').value), 4);
  const direct = enlarge(input, 4, 'spline');
  const approx = enlargeSplineGaussSeidel(input, 4, delta, share === 'same' ? undefined : Number(share));
  const maximum = maxDifference(approx.pixels, direct.pixels);
  paint(byId('thomas-image'), direct.width, direct.height, quantizePixels(direct.pixels), 'Ảnh spline tính bằng Thomas');

  const canvas = byId('image-error-map');
  canvas.width = direct.width;
  canvas.height = direct.height;
  const context = canvas.getContext('2d');
  const display = context.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < direct.pixels.length; i++) {
    const t = maximum ? Math.abs(approx.pixels[i] - direct.pixels[i]) / maximum : 0;
    const offset = i * 4;
    display.data[offset] = 250 - 232 * t;
    display.data[offset + 1] = 245 - 137 * t;
    display.data[offset + 2] = 232 - 118 * t;
    display.data[offset + 3] = 255;
  }
  context.putImageData(display, 0, 0);
  byId('image-bound-result').textContent =
    `Sai lệch cực đại ${sci(maximum)} · Chặn 2D ${sci(approx.bound)} · Mục tiêu ${number.format(delta)} mức xám`;
  const updates = approx.horizontal.totalSweeps * (input.width - 2)
    + approx.vertical.totalSweeps * (input.height - 2);
  byId('image-bound-detail').textContent =
    `Ngưỡng ngang ${sci(approx.toleranceX)}, ngưỡng dọc ${sci(approx.toleranceY)}. `
    + `Tối đa ${approx.horizontal.maxSweeps}/${approx.vertical.maxSweeps} vòng ngang/dọc. `
    + `Tổng ${number.format(updates)} lần cập nhật ẩn.`;
  byId('map-scale').textContent = `Thang màu tự chỉnh từ 0 đến ${sci(maximum)} mức xám trước làm tròn.`;
}

for (const id of ['solver-case', 'row-delta']) byId(id).addEventListener('change', compareRow);
for (const id of ['image-case', 'image-delta', 'image-share']) byId(id).addEventListener('change', compareWholeImage);
compareRow();
compareWholeImage();
