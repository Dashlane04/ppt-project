// Whole-image animation. Each frame is resampled from the source of its phase.
function setupResizeDemo() {
  const sampleSelect = byId('resize-sample'), factorSelect = byId('resize-factor');
  const methodSelect = byId('resize-method'), track = byId('resize-progress');
  const canvas = byId('resize-canvas'), playButton = byId('resize-play');
  const phaseSteps = 100, endStep = 2 * phaseSteps;
  const millisecondsPerStep = 30, halfwayHold = 600;
  const phaseDuration = phaseSteps * millisecondsPerStep;
  let reference, small, step = 0, animationFrame = null, startTime, lastDraw;

  for (const [key, label] of Object.entries(SAMPLE_NAMES)) sampleSelect.add(new Option(label, key));
  for (const [key, label] of Object.entries(METHOD_NAMES)) {
    if (key !== 'original') methodSelect.add(new Option(label, key));
  }
  methodSelect.value = 'spline';

  function draw(position) {
    step = position;
    const shrinking = step <= phaseSteps;
    const proportion = Math.abs(step - phaseSteps) / phaseSteps;
    const width = Math.round(small.width + proportion * (reference.width - small.width));
    const height = Math.round(small.height + proportion * (reference.height - small.height));
    let image;
    let stage;
    if (step === 0) {
      image = reference;
      stage = 'Ảnh gốc';
    } else if (step === phaseSteps) {
      image = small;
      stage = 'Ảnh nhỏ nhất';
    } else if (shrinking) {
      image = resizeByArea(reference, width, height);
      stage = 'Thu nhỏ theo diện tích';
    } else {
      image = resizeImage(small, width, height, methodSelect.value);
      stage = step === endStep ? 'Ảnh phóng lại' : 'Phóng lại bằng nội suy';
    }
    const pixels = step === 0 ? image.pixels : quantizePixels(image.pixels);
    const dimensions = `${image.width} × ${image.height} px`;
    paint(canvas, image.width, image.height, pixels, `${stage}, ${dimensions}`);
    canvas.style.width = `${100 * image.width / reference.width}%`;
    byId('resize-stage').textContent = stage;
    byId('resize-dimensions').textContent = dimensions;
    track.value = step;
    track.setAttribute('aria-valuetext', `${stage}, ${dimensions}`);
    const mae = byId('resize-mae');
    mae.hidden = step !== endStep;
    if (step === endStep) {
      mae.textContent = `MAE so với ảnh gốc ${number.format(imageMae(pixels, reference.pixels))} mức xám.`;
    }
  }

  function updatePlayLabel() {
    playButton.textContent = animationFrame !== null ? 'Tạm dừng'
      : step === endStep ? 'Chạy lại' : step === 0 ? 'Chạy' : 'Tiếp tục';
  }

  function pause() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    updatePlayLabel();
  }

  function seek(position) {
    pause();
    draw(position);
    updatePlayLabel();
  }

  function tick(now) {
    const elapsed = now - startTime;
    const active = elapsed - clamp(elapsed - phaseDuration, 0, halfwayHold);
    const position = clamp(Math.floor(active / millisecondsPerStep), 0, endStep);
    if (position !== step && (now - lastDraw >= 40 || position === phaseSteps || position === endStep)) {
      draw(position);
      lastDraw = now;
    }
    if (position < endStep) animationFrame = requestAnimationFrame(tick);
    else pause();
  }

  function resetSource() {
    reference = getReference(sampleSelect.value);
    small = reduceByArea(reference, Number(factorSelect.value));
    seek(0);
  }

  playButton.addEventListener('click', () => {
    if (animationFrame !== null) {
      pause();
      return;
    }
    if (step === endStep) draw(0);
    startTime = performance.now() - step * millisecondsPerStep - (step > phaseSteps ? halfwayHold : 0);
    lastDraw = -Infinity;
    animationFrame = requestAnimationFrame(tick);
    updatePlayLabel();
  });
  track.addEventListener('input', () => seek(track.valueAsNumber));
  for (const button of document.querySelectorAll('[data-resize-stop]')) {
    button.addEventListener('click', () => seek(Number(button.dataset.resizeStop)));
  }
  for (const select of [sampleSelect, factorSelect]) select.addEventListener('change', resetSource);
  methodSelect.addEventListener('change', () => draw(step));
  resetSource();
}

setupResizeDemo();
