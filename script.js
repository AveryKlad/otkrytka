const cover   = document.getElementById('cover');
const spreads = document.querySelectorAll('.spread');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

let currentIndex = 0;         // 0 = обложка, 1..N = развороты
const total = spreads.length + 1;
let isAnimating = false;      // блокируем клики, пока идёт анимация

// ---------- ЗВУК ----------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function playPageFlip(direction = 1) {
  ensureAudio();
  if (!audioCtx) return;
  const duration = 0.35;
  const sr = audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, sr * duration, sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    const env = Math.pow(Math.sin(Math.PI * t), 1.4);
    data[i] = (Math.random() * 2 - 1) * env * 0.35;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = direction > 0 ? 1800 : 1400;
  filter.Q.value = 0.7;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.35;
  src.connect(filter).connect(gain).connect(audioCtx.destination);
  src.start();
}

// ---------- УТИЛИТЫ ----------
function hideSpread(spread) {
  // Полностью скрыть разворот и вернуть половинки в базовое состояние
  spread.classList.remove('active');
  const halves = spread.querySelectorAll('.page-half');
  halves.forEach(h => {
    h.classList.remove('turning');
    h.classList.add(h === halves[0] ? 'flipped-left' : 'flipped-right');
  });
}

function showSpread(spread) {
  // Показать разворот; половинки «приходят» из перевёрнутого состояния
  const halves = spread.querySelectorAll('.page-half');
  halves.forEach(h => {
    h.classList.remove('turning', 'flipped-left', 'flipped-right');
  });
  spread.classList.add('active');
}

// ---------- ЛОГИКА ----------
function update(withoutAnimation = false) {
  if (withoutAnimation) {
    // Просто расставить финальные состояния без анимации
    if (currentIndex === 0) cover.classList.remove('flipped');
    else cover.classList.add('flipped');

    spreads.forEach((spread, i) => {
      const n = i + 1;
      if (n === currentIndex) showSpread(spread);
      else hideSpread(spread);
    });
  }
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex >= total - 1;
}

function next() {
  if (isAnimating) return;
  if (currentIndex >= total - 1) return;
  isAnimating = true;
  playPageFlip(1);

  const prevIndex = currentIndex;
  currentIndex++;

  // 1) УХОДИТ текущий разворот (или обложка)
  if (prevIndex === 0) {
    cover.classList.add('flipped');
  } else {
    const leaving = spreads[prevIndex - 1];
    const halves = leaving.querySelectorAll('.page-half');
    halves[0].classList.add('turning');
    halves[1].classList.add('turning');
    halves[0].classList.add('flipped-left');   // левая уходит сразу
    setTimeout(() => {
      halves[1].classList.add('flipped-right'); // правая — следом
    }, 250);
    setTimeout(() => {
      leaving.classList.remove('active');
    }, 1100);
  }

  // 2) ПРИХОДИТ следующий разворот (если это не последняя страница)
  const entering = spreads[currentIndex - 1];
  if (entering) {
    // Даём половинкам «прилететь» из перевёрнутого состояния
    // → сначала ставим их в перевёрнутое, потом снимаем
    const halves = entering.querySelectorAll('.page-half');
    halves[0].classList.add('flipped-left');
    halves[1].classList.add('flipped-right');

    entering.classList.add('active');

    // Форсируем reflow, чтобы transition сработал
    void entering.offsetWidth;

    setTimeout(() => {
      halves[0].classList.remove('flipped-left');
      halves[1].classList.remove('flipped-right');
    }, 200); // небольшая задержка — обложка/предыдущий лист чуть опережают
  }

  // 3) Финальная синхронизация
  setTimeout(() => {
    isAnimating = false;
    update(true);
  }, 1300);
}

function prev() {
  if (isAnimating) return;
  if (currentIndex === 0) return;
  isAnimating = true;
  playPageFlip(-1);

  const leavingIndex = currentIndex;
  currentIndex--;

  // 1) УХОДИТ текущий разворот
  const leaving = spreads[leavingIndex - 1];
  if (leaving) {
    const halves = leaving.querySelectorAll('.page-half');
    halves[0].classList.add('turning');
    halves[1].classList.add('turning');
    halves[1].classList.add('flipped-right');
    setTimeout(() => halves[0].classList.add('flipped-left'), 250);
    setTimeout(() => leaving.classList.remove('active'), 1100);
  }

  // 2) ПРИХОДИТ предыдущий разворот (или обложка)
  if (currentIndex === 0) {
    cover.classList.remove('flipped');
  } else {
    const entering = spreads[currentIndex - 1];
    const halves = entering.querySelectorAll('.page-half');
    halves[0].classList.add('flipped-left');
    halves[1].classList.add('flipped-right');
    entering.classList.add('active');
    void entering.offsetWidth;
    setTimeout(() => {
      halves[0].classList.remove('flipped-left');
      halves[1].classList.remove('flipped-right');
    }, 200);
  }

  setTimeout(() => {
    isAnimating = false;
    update(true);
  }, 1300);
}

nextBtn.addEventListener('click', next);
prevBtn.addEventListener('click', prev);
cover.addEventListener('click', next);
spreads.forEach(s => s.addEventListener('click', next));

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
});

document.addEventListener('pointerdown', ensureAudio, { once: true });

// Стартовое состояние — только обложка, все развороты скрыты
update(true);