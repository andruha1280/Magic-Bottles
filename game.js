// ============================================================
//  ВОЛШЕБНЫЕ БУТЫЛКИ — финальная версия
//  10 уровней, таймер 10 мин, звуки, конфетти
// ============================================================

// ---------- 1. УРОВНИ (10 штук) ----------
const levels = [
  // 1
  [
    [1, 2, 1, 2],
    [2, 1, 2, 1],
    [], []
  ],
  // 2
  [
    [1, 2, 3, 1],
    [2, 3, 1, 2],
    [3, 1, 2, 3],
    [], []
  ],
  // 3
  [
    [1, 2, 3, 4],
    [2, 3, 4, 1],
    [3, 4, 1, 2],
    [4, 1, 2, 3],
    [], []
  ],
  // 4
  [
    [1, 2, 3, 1],
    [4, 3, 2, 4],
    [2, 1, 4, 3],
    [3, 4, 1, 2],
    [], []
  ],
  // 5
  [
    [1, 2, 3, 4],
    [5, 4, 3, 2],
    [2, 5, 1, 3],
    [4, 1, 5, 2],
    [3, 5, 4, 1],
    [], []
  ],
  // 6
  [
    [1, 2, 1, 3],
    [2, 3, 2, 4],
    [3, 4, 3, 1],
    [4, 1, 4, 2],
    [], []
  ],
  // 7
  [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 1],
    [4, 5, 1, 2],
    [5, 1, 2, 3],
    [], []
  ],
  // 8
  [
    [1, 2, 3, 1],
    [4, 5, 4, 2],
    [3, 1, 5, 3],
    [2, 4, 1, 5],
    [5, 3, 2, 4],
    [], []
  ],
  // 9
  [
    [1, 2, 3, 4],
    [5, 6, 1, 2],
    [3, 4, 5, 6],
    [2, 1, 4, 3],
    [6, 5, 2, 1],
    [4, 3, 6, 5],
    [], []
  ],
  // 10 (финальный)
  [
    [1, 2, 3, 4],
    [5, 6, 1, 2],
    [3, 4, 5, 6],
    [6, 1, 2, 3],
    [4, 5, 6, 1],
    [2, 3, 4, 5],
    [], []
  ]
];

// ---------- 2. ПАЛИТРА ----------
const COLORS = {
  1: '#FF6B6B',
  2: '#4ECDC4',
  3: '#FFE66D',
  4: '#A8E6CF',
  5: '#C7CEEA',
  6: '#FF9F68'
};

// ---------- 3. СОСТОЯНИЕ ----------
let currentLevel = 0;
let bottles = [];
let selectedBottle = null;

let animation = null;
const POUR_DURATION = 450;

let totalScore = 0;
let levelScore = 0;
let record = Number(localStorage.getItem('magicBottlesRecord') || 0);

// ---------- 4. КОНСТАНТЫ ----------
const BOTTLE_WIDTH = 60;
const BOTTLE_HEIGHT = 200;
const BOTTLE_SPACING = 22;
const LAYER_COUNT = 4;
const BOTTOM_PADDING = 10;

// ---------- 5. CANVAS ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ---------- 6. ЗВУКИ (Web Audio API) ----------
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API не поддерживается');
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playPourSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

function playWinSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  // Восходящее арпеджио: C5, E5, G5, C6
  const notes = [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = now + i * 0.12;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

// Разблокируем звук при первом клике
document.addEventListener('pointerdown', initAudio, { once: true });

// ---------- 7. HUD ----------
function updateHUD() {
  document.getElementById('levelNum').textContent = currentLevel + 1;
  document.getElementById('levelTotal').textContent = levels.length;
  document.getElementById('scoreVal').textContent = totalScore + levelScore;
  document.getElementById('recordVal').textContent = record;
}

// ---------- 8. ТАЙМЕР 10 МИНУТ ----------
const PLAY_LIMIT_MS = 10 * 60 * 1000; // 10 минут
let playTimer = null;
let gamePaused = false;

function startPlayTimer() {
  clearTimeout(playTimer);
  if (gamePaused) return;
  playTimer = setTimeout(showBreakOverlay, PLAY_LIMIT_MS);
}

function showBreakOverlay() {
  gamePaused = true;
  document.getElementById('breakOverlay').classList.remove('hidden');
}

function resumeGame() {
  gamePaused = false;
  document.getElementById('breakOverlay').classList.add('hidden');
  startPlayTimer();
}

function exitGame() {
  clearTimeout(playTimer);
  gamePaused = true;
  document.getElementById('breakOverlay').classList.add('hidden');
  document.getElementById('finalRecordVal').textContent = record;
  document.getElementById('exitOverlay').classList.remove('hidden');
}

document.getElementById('breakContinueBtn').addEventListener('click', resumeGame);
document.getElementById('breakExitBtn').addEventListener('click', exitGame);
document.getElementById('restartAllBtn').addEventListener('click', () => location.reload());

// ---------- 9. ЗАГРУЗКА УРОВНЯ ----------
function loadLevel(index) {
  bottles = levels[index].map(bottle => [...bottle]);
  selectedBottle = null;
  animation = null;
  document.getElementById('winOverlay').classList.add('hidden');
  stopConfetti();
  updateHUD();
  render();
}

// ---------- 10. ЛОГИКА ----------
function canPour(from, to) {
  if (from === to) return false;
  if (bottles[from].length === 0) return false;
  if (bottles[to].length >= LAYER_COUNT) return false;

  const fromColor = bottles[from][bottles[from].length - 1];
  if (bottles[to].length === 0) return true;

  const toColor = bottles[to][bottles[to].length - 1];
  return fromColor === toColor;
}

function pour(from, to) {
  if (!canPour(from, to)) {
    selectedBottle = null;
    render();
    return;
  }

  const colorId = bottles[from][bottles[from].length - 1];
  const color = COLORS[colorId] || '#888';

  playPourSound();

  animation = {
    from,
    to,
    color,
    progress: 0,
    startTime: performance.now()
  };
  selectedBottle = null;
  requestAnimationFrame(animatePour);
}

function checkWin() {
  return bottles.every(bottle =>
    bottle.length === 0 ||
    (bottle.length === LAYER_COUNT && bottle.every(c => c === bottle[0]))
  );
}

// ---------- 11. АНИМАЦИЯ ПЕРЕЛИВАНИЯ ----------
function animatePour(timestamp) {
  if (!animation) return;

  const elapsed = timestamp - animation.startTime;
  animation.progress = Math.min(1, elapsed / POUR_DURATION);

  render();

  if (animation.progress < 1) {
    requestAnimationFrame(animatePour);
  } else {
    const { from, to } = animation;
    animation = null;

    const color = bottles[from].pop();
    bottles[to].push(color);

    if (bottles[to].length > 1) levelScore += 5;
    updateHUD();

    if (checkWin()) {
      levelScore += 100;
      totalScore += levelScore;

      if (totalScore > record) {
        record = totalScore;
        localStorage.setItem('magicBottlesRecord', record);
      }
      updateHUD();

      render();
      playWinSound();
      showWinOverlay();
    } else {
      render();
    }
  }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ---------- 12. ОВЕРЛЕЙ ПОБЕДЫ + КОНФЕТТИ ----------
function showWinOverlay() {
  document.getElementById('levelScoreVal').textContent = levelScore;
  const overlay = document.getElementById('winOverlay');
  const nextBtn = document.getElementById('nextBtn');

  if (currentLevel < levels.length - 1) {
    nextBtn.textContent = '➡️ Следующий уровень';
    nextBtn.onclick = () => {
      currentLevel++;
      levelScore = 0;
      loadLevel(currentLevel);
    };
  } else {
    nextBtn.textContent = '🏆 Играть заново';
    nextBtn.onclick = () => {
      currentLevel = 0;
      totalScore = 0;
      levelScore = 0;
      loadLevel(0);
    };
  }

  overlay.classList.remove('hidden');
  startConfetti();
}

// ---------- 13. КОНФЕТТИ ----------
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiRAF = null;

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

function startConfetti() {
  resizeConfettiCanvas();
  confettiParticles = [];
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#C7CEEA', '#FF9F68'];

  for (let i = 0; i < 140; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: -20 - Math.random() * 300,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: -1 + Math.random() * 2,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vr: -0.1 + Math.random() * 0.2,
      life: 1
    });
  }

  if (confettiRAF) cancelAnimationFrame(confettiRAF);
  confettiLoop();
}

function stopConfetti() {
  if (confettiRAF) {
    cancelAnimationFrame(confettiRAF);
    confettiRAF = null;
  }
  confettiParticles = [];
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

function confettiLoop() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  let alive = 0;
  confettiParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;       // гравитация
    p.vx *= 0.99;       // лёгкое сопротивление воздуха
    p.rot += p.vr;

    if (p.y > confettiCanvas.height + 40) {
      p.life = 0;
    } else {
      alive++;
    }

    if (p.life > 0) {
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot);
      confettiCtx.fillStyle = p.color;
      confettiCtx.globalAlpha = 0.9;
      confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      confettiCtx.restore();
    }
  });

  if (alive > 0) {
    confettiRAF = requestAnimationFrame(confettiLoop);
  } else {
    confettiRAF = null;
  }
}

// ---------- 14. ОТРИСОВКА ИГРЫ ----------
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const totalBottles = bottles.length;
  const totalWidth = totalBottles * (BOTTLE_WIDTH + BOTTLE_SPACING) - BOTTLE_SPACING;
  const startX = (canvas.width - totalWidth) / 2;
  const startY = canvas.height - BOTTLE_HEIGHT - 40;

  const p = animation ? easeInOut(animation.progress) : 0;

  bottles.forEach((bottle, i) => {
    const x = startX + i * (BOTTLE_WIDTH + BOTTLE_SPACING);
    const y = startY;

    drawBottle(x, y);

    let displayBottle = bottle;
    let extraTop = null;

    if (animation) {
      if (i === animation.from) {
        displayBottle = bottle.slice(0, -1);
        extraTop = { color: animation.color, fraction: 1 - p, fromBottom: false };
      } else if (i === animation.to) {
        displayBottle = bottle;
        extraTop = { color: animation.color, fraction: p, fromBottom: true };
      }
    }

    drawLiquid(x, y, displayBottle, extraTop);
    drawSelection(x, y, i);
    drawGlassHighlight(x, y);
  });

  if (animation) drawStream(startX, startY, p);
}

function drawBottle(x, y) {
  ctx.beginPath();
  ctx.roundRect(x, y, BOTTLE_WIDTH, BOTTLE_HEIGHT, [10, 10, 26, 26]);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawLiquid(x, y, bottle, extraTop) {
  const liquidHeight = BOTTLE_HEIGHT - BOTTOM_PADDING;
  const layerHeight = liquidHeight / LAYER_COUNT;

  bottle.forEach((colorId, layerIndex) => {
    const color = COLORS[colorId] || '#888';
    const layerY = y + BOTTLE_HEIGHT - BOTTOM_PADDING - (layerIndex + 1) * layerHeight;
    paintLayer(x, layerY, BOTTLE_WIDTH, layerHeight, color, layerIndex === 0);
  });

  if (extraTop && extraTop.fraction > 0.001) {
    const baseY = y + BOTTLE_HEIGHT - BOTTOM_PADDING - bottle.length * layerHeight;
    const h = layerHeight * extraTop.fraction;
    const layerY = extraTop.fromBottom ? baseY - h : baseY;
    paintLayer(x, layerY, BOTTLE_WIDTH, h, extraTop.color, false);
  }
}

function paintLayer(x, layerY, width, h, color, roundBottom) {
  const gradient = ctx.createLinearGradient(x, layerY, x + width, layerY);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.3, color);
  gradient.addColorStop(0.7, shadeColor(color, -15));
  gradient.addColorStop(1, shadeColor(color, -35));

  ctx.beginPath();
  if (roundBottom) {
    ctx.roundRect(x + 2, layerY, width - 4, h, [0, 0, 18, 18]);
  } else {
    ctx.rect(x + 2, layerY, width - 4, h);
  }
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(x + 7, layerY + 2, 4, Math.max(0, h - 4));
}

function drawSelection(x, y, index) {
  if (selectedBottle === index) {
    ctx.beginPath();
    ctx.roundRect(x - 3, y - 3, BOTTLE_WIDTH + 6, BOTTLE_HEIGHT + 6, [12, 12, 28, 28]);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawGlassHighlight(x, y) {
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 10, 4, BOTTLE_HEIGHT - 40, 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fill();
}

function drawStream(startX, startY, p) {
  const fromX = startX + animation.from * (BOTTLE_WIDTH + BOTTLE_SPACING) + BOTTLE_WIDTH / 2;
  const toX = startX + animation.to * (BOTTLE_WIDTH + BOTTLE_SPACING) + BOTTLE_WIDTH / 2;
  const topY = startY - 20;

  const midX = (fromX + toX) / 2;
  const midY = topY - 40;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(fromX, topY);
  ctx.quadraticCurveTo(midX, midY, toX, topY);
  ctx.strokeStyle = animation.color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.shadowColor = animation.color;
  ctx.shadowBlur = 12;

  const alpha = Math.sin(Math.PI * p);
  ctx.globalAlpha = Math.max(0.15, alpha);
  ctx.stroke();
  ctx.restore();

  if (p > 0.1 && p < 0.95) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(toX, topY, 5, 0, Math.PI * 2);
    ctx.fillStyle = animation.color;
    ctx.shadowColor = animation.color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  }
}

// ---------- 15. ЦВЕТ ----------
function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// ---------- 16. КЛИКИ ----------
canvas.addEventListener('pointerdown', (e) => {
  if (animation || gamePaused) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  const totalBottles = bottles.length;
  const totalWidth = totalBottles * (BOTTLE_WIDTH + BOTTLE_SPACING) - BOTTLE_SPACING;
  const startX = (canvas.width - totalWidth) / 2;
  const startY = canvas.height - BOTTLE_HEIGHT - 40;

  for (let i = 0; i < totalBottles; i++) {
    const bx = startX + i * (BOTTLE_WIDTH + BOTTLE_SPACING);
    const by = startY;

    if (
      clickX >= bx && clickX <= bx + BOTTLE_WIDTH &&
      clickY >= by && clickY <= by + BOTTLE_HEIGHT
    ) {
      if (selectedBottle === null) {
        if (bottles[i].length > 0) {
          selectedBottle = i;
          render();
        }
      } else {
        pour(selectedBottle, i);
      }
      break;
    }
  }
});

// ---------- 17. "ЗАНОВО" ----------
document.getElementById('restartBtn').addEventListener('click', () => {
  if (animation || gamePaused) return;
  levelScore = Math.max(0, levelScore - 10);
  const saved = levelScore;
  bottles = levels[currentLevel].map(b => [...b]);
  selectedBottle = null;
  animation = null;
  levelScore = saved;
  updateHUD();
  render();
});

// ---------- 18. ЗАПУСК ----------
updateHUD();
loadLevel(0);
startPlayTimer();

// ---------- 19. ОКНО "ОБ ИГРЕ" ----------
document.getElementById('aboutBtn').addEventListener('click', () => {
  document.getElementById('aboutOverlay').classList.remove('hidden');
});

document.getElementById('aboutCloseBtn').addEventListener('click', () => {
  document.getElementById('aboutOverlay').classList.add('hidden');
});