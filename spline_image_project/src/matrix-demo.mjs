// Runs in the same offline module as the spline core and the image comparison.
function setupMatrixDemo() {
  const subscripts = '₀₁₂₃₄₅₆₇';
  const sampleCount = subscripts.length;
  const unknowns = sampleCount - 2;
  const preset = byId('matrix-preset'), delta = byId('matrix-delta');
  const linkedControls = byId('matrix-linked-controls'), linkedSlider = byId('matrix-pixel-slider');
  const stepButton = byId('matrix-step'), sweepButton = byId('matrix-sweep');
  const playButton = byId('matrix-play'), resetButton = byId('matrix-reset');
  const format = value => value !== 0 && Math.abs(value) < 0.001 ? sci(value) : number.format(value);
  const sampleInputs = Array.from(subscripts, subscript => {
    const label = document.createElement('label');
    label.textContent = 'f' + subscript;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '255';
    input.step = 'any';
    input.required = true;
    label.append(input);
    byId('matrix-samples').append(label);
    return input;
  });

  const heading = byId('matrix-head').insertRow();
  const headings = ['Hệ số A', ...Array.from(subscripts.slice(1, -1), sub => 'M' + sub),
    'Vế phải b', 'M̃ hiện tại', 'M Thomas', 'Phần dư r'];
  for (const label of headings) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    heading.append(cell);
  }
  const rows = Array.from({ length: unknowns }, (_, i) => {
    const row = byId('matrix-body').insertRow();
    const label = document.createElement('th');
    label.scope = 'row';
    label.textContent = 'Hàng ' + (i + 1);
    row.append(label);
    for (let j = 0; j < unknowns; j++) {
      const cell = row.insertCell();
      const distance = Math.abs(i - j);
      cell.textContent = distance === 0 ? '4' : distance === 1 ? '1' : '0';
      cell.className = distance <= 1 ? 'matrix-active' : 'matrix-zero';
    }
    const values = Array.from({ length: 4 }, () => row.insertCell());
    values[0].classList.add('matrix-vector');
    values[1].classList.add('matrix-active');
    return { row, values };
  });

  let samples, rhs, thomas, estimate, tolerance, next, sweeps, residual, lastStep;
  let timer = null, valid = true;
  const atStop = () => next === 0 && (residual <= tolerance || sweeps >= MAX_SWEEPS);

  function stopPlayback() {
    clearInterval(timer);
    timer = null;
  }

  function reset() {
    stopPlayback();
    const entered = sampleInputs.map(input => input.valueAsNumber);
    valid = sampleInputs.every((input, i) => input.validity.valid && Number.isFinite(entered[i]));
    if (valid) {
      samples = entered;
      rhs = splineRhs(samples);
      thomas = solveThomas(rhs);
      estimate = new Float64Array(unknowns);
      tolerance = 16 * Number(delta.value);
      next = sweeps = 0;
      residual = residualInfinity(rhs, estimate);
      lastStep = null;
    }
    render();
  }

  function selectPreset() {
    const linked = preset.value === 'pixel' ? pixelComparison.rowWindow(sampleCount) : null;
    linkedControls.hidden = !linked;
    sampleInputs.forEach((input, i) => {
      input.readOnly = Boolean(linked);
      input.parentElement.classList.toggle('linked-pixel', i === linked?.index);
    });
    if (linked) {
      sampleInputs.forEach((input, i) => { input.value = linked.samples[i]; });
      linkedSlider.value = linked.samples[linked.index];
      byId('matrix-linked-note').textContent =
        `Pixel (${linked.column + linked.index}, ${linked.y}) ứng với f${subscripts[linked.index]}. `
        + 'Hệ dùng điều kiện biên tự nhiên tại hai đầu đoạn 8 mẫu. Sửa pixel sẽ đưa phép lặp về vòng 0.';
    } else if (preset.value === 'flat') {
      for (const input of sampleInputs) input.value = '128';
    } else {
      const image = reduceByArea(getReference(preset.value), 4);
      const row = preset.value === 'edge' ? 16 : 28;
      const start = row * image.width + 45;
      sampleInputs.forEach((input, i) => { input.value = image.pixels[start + i]; });
    }
    reset();
  }

  function stepOperands() {
    const i = next;
    const left = estimate[i - 1] ?? 0;
    const right = estimate[i + 1] ?? 0;
    return { i, left, right, value: gaussSeidelValue(rhs[i], left, right) };
  }

  function advance() {
    lastStep = stepOperands();
    estimate[next] = lastStep.value;
    next++;
    if (next === unknowns) {
      next = 0;
      sweeps++;
    }
    residual = residualInfinity(rhs, estimate);
    if (atStop()) stopPlayback();
  }

  function render() {
    const stopped = atStop();
    const playing = timer !== null;
    stepButton.disabled = sweepButton.disabled = !valid || stopped || playing;
    playButton.disabled = !valid || stopped;
    resetButton.disabled = !valid;
    playButton.textContent = playing ? 'Tạm dừng' : 'Chạy tự động';
    byId('matrix-input-error').hidden = valid;

    const active = lastStep ?? (stopped ? null : stepOperands());
    for (const [i, { row, values }] of rows.entries()) {
      row.classList.toggle('matrix-current', active?.i === i);
      const numbers = [rhs[i], estimate[i], thomas[i], splineResidualAt(rhs, estimate, i)];
      values.forEach((cell, j) => {
        cell.textContent = format(numbers[j]);
        cell.title = String(numbers[j]);
      });
    }
    byId('matrix-status').textContent = stopped
      ? (residual <= tolerance ? `Đạt ngưỡng sau ${sweeps} vòng.` : `Đã quét ${sweeps} vòng và còn trên ngưỡng.`)
      : `Đã xong ${sweeps} vòng · Tiếp theo cập nhật M${subscripts[next + 1]}.`;
    byId('matrix-summary').textContent =
      `‖r‖∞ = ${format(residual)} · Ngưỡng 16δ = ${format(tolerance)} · `
      + `Chặn spline ‖r‖∞ / 16 = ${format(rowErrorBound(residual))} mức xám.`;

    const i = active?.i ?? 0;
    const node = subscripts[i + 1];
    byId('matrix-rhs-equation').textContent = `b${node} = 6(f${subscripts[i]} − 2f${node} + f${subscripts[i + 2]})`
      + ` = 6(${format(samples[i])} − 2 × ${format(samples[i + 1])} + ${format(samples[i + 2])}) = ${format(rhs[i])}`;
    byId('matrix-update-equation').textContent = active
      ? `${lastStep ? 'Vừa tính' : 'Bước kế tiếp'} · M̃${node} = (b${node} − M̃${subscripts[i]} mới − M̃${subscripts[i + 2]} cũ) / 4`
        + ` = (${format(rhs[i])} − (${format(active.left)}) − (${format(active.right)})) / 4 ≈ ${format(active.value)}`
      : 'Nghiệm khởi tạo đã đạt ngưỡng phần dư.';
  }

  preset.addEventListener('change', selectPreset);
  byId('pixel-matrix-link').addEventListener('click', () => {
    preset.value = 'pixel';
    selectPreset();
  });
  byId('input-canvas').addEventListener('input-pixel-change', () => {
    if (preset.value === 'pixel') selectPreset();
  });
  linkedSlider.addEventListener('input', () => pixelComparison.changeValue(Math.round(linkedSlider.valueAsNumber)));
  delta.addEventListener('change', reset);
  resetButton.addEventListener('click', reset);
  for (const input of sampleInputs) {
    input.addEventListener('input', () => {
      preset.value = 'custom';
      reset();
    });
  }
  stepButton.addEventListener('click', () => { advance(); render(); });
  sweepButton.addEventListener('click', () => {
    do { advance(); } while (next !== 0);
    render();
  });
  playButton.addEventListener('click', () => {
    if (timer === null) {
      timer = setInterval(() => { advance(); render(); }, 360);
    } else {
      stopPlayback();
    }
    render();
  });
  selectPreset();
}

setupMatrixDemo();
