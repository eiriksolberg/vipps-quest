const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const message = document.querySelector('#message');

const VIEW = { width: 1280, height: 720 };
const WORLD_WIDTH = 6100;
const GRAVITY = 1800;
const keys = { left: false, right: false, jump: false };
const parallaxBackground = new Image();
parallaxBackground.src = './oslo-parallax.png';
const vippsi = new Image();
vippsi.src = './vippsi-running.png';
const vippsCoin = new Image();
vippsCoin.src = './vipps-coin.png';
const appla = new Image();
appla.src = './appla.png';
const applaReference = new Image();
const applaSprite = document.createElement('canvas');
let applaSourceReady = false;
applaReference.addEventListener('load', () => {
  const crop = { x: 22, y: 17, width: 190, height: 171 };
  applaSprite.width = crop.width;
  applaSprite.height = crop.height;
  const spriteContext = applaSprite.getContext('2d');
  spriteContext.drawImage(applaReference, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  const pixels = spriteContext.getImageData(0, 0, crop.width, crop.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const isBlueSky = blue > red * 1.1 && blue > green * 1.04 && blue > 125;
    const isGreenGround = green > red * 1.1 && green > blue * 1.13 && green > 85;
    if (isBlueSky || isGreenGround) pixels.data[index + 3] = 0;
  }
  spriteContext.putImageData(pixels, 0, 0);
  applaSourceReady = true;
});
applaReference.src = './appla-reference.png';

let lastTime = 0;
let elapsed = 0;
let camera = 0;
let state = 'playing';
let score = 2310;
let coinsCollected = 0;
let flash = 0;
let audioContext;
const particles = [];
const suits = {
  tap: { label: 'Tap to Pay', hud: 'TAP DASH', color: '#ff6630', cooldown: 2.4 },
  scan: { label: 'Scan QR', hud: 'SCAN MAGNET', color: '#b998ff', cooldown: 11 },
  gifts: { label: 'Money Gifts', hud: 'GIFT SHIELD', color: '#c9f36a', cooldown: 14 },
};
let activeSuit = 'tap';
let abilityCooldown = 0;
let dashTimer = 0;
let scanTimer = 0;
let shieldTimer = 0;

const player = {
  x: 160, y: 410, width: 54, height: 70, vx: 0, vy: 0,
  prevY: 410, facing: 1, onGround: false, coyote: 0, jumpBuffer: 0,
  lives: 3, invincible: 0, spawnX: 160, spawnY: 410, jumps: 0, boostLock: 0,
};

const platforms = [
  { x: -160, y: 570, width: 900, height: 250 },
  { x: 810, y: 508, width: 300, height: 312 },
  { x: 1190, y: 598, width: 420, height: 222 },
  { x: 1720, y: 526, width: 300, height: 294 },
  { x: 2100, y: 455, width: 250, height: 365 },
  { x: 2440, y: 580, width: 630, height: 240 },
  { x: 3160, y: 510, width: 300, height: 310 },
  { x: 3560, y: 430, width: 340, height: 390 },
  { x: 4010, y: 560, width: 390, height: 260 },
  { x: 4490, y: 500, width: 320, height: 320 },
  { x: 4910, y: 580, width: 1120, height: 240 },
];

const blocks = [
  { x: 410, y: 400, kind: 'question', hit: false },
  { x: 480, y: 400, kind: 'brick', hit: false },
  { x: 550, y: 400, kind: 'brick', hit: false },
  { x: 620, y: 400, kind: 'question', hit: false },
  { x: 1110, y: 410, kind: 'question', hit: false },
  { x: 1850, y: 388, kind: 'question', hit: false },
  { x: 1920, y: 388, kind: 'brick', hit: false },
  { x: 2670, y: 420, kind: 'question', hit: false },
  { x: 3330, y: 350, kind: 'question', hit: false },
  { x: 3720, y: 270, kind: 'question', hit: false },
  { x: 4690, y: 390, kind: 'question', hit: false },
];

const coinSeeds = [
  [280, 475], [345, 430], [410, 335], [530, 330], [650, 335], [915, 430],
  [1010, 382], [1300, 500], [1410, 520], [1790, 450], [1900, 320], [2130, 340],
  [2260, 290], [2520, 490], [2610, 445], [2740, 400], [2890, 445], [3030, 490],
  [3240, 430], [3360, 300], [3650, 340], [3775, 205], [4180, 470], [4300, 445],
  [4590, 430], [4750, 320], [5010, 510], [5120, 470], [5250, 430], [5380, 390],
  [5510, 350], [5640, 310], [5770, 270],
];

const coins = coinSeeds.map(([x, y], index) => ({ x, y, baseY: y, collected: false, phase: index * .43 }));

const enemies = [
  { x: 910, y: 458, min: 825, max: 1050, speed: 56, direction: 1, alive: true },
  { x: 1270, y: 548, min: 1220, max: 1540, speed: 62, direction: 1, alive: true },
  { x: 1790, y: 476, min: 1740, max: 1955, speed: 70, direction: -1, alive: true },
  { x: 2560, y: 530, min: 2470, max: 3000, speed: 64, direction: 1, alive: true },
  { x: 3640, y: 380, min: 3580, max: 3850, speed: 72, direction: 1, alive: true },
  { x: 4570, y: 450, min: 4510, max: 4760, speed: 70, direction: -1, alive: true },
  { x: 5300, y: 530, min: 5000, max: 5710, speed: 76, direction: 1, alive: true },
];

const goal = { x: 5870, y: 300, width: 44, height: 280 };
const gift = { x: 2200, y: 375, found: false };
const movingPlatforms = [
  { baseX: 1460, baseY: 527, width: 128, height: 52, rangeX: 82, rangeY: 0, speed: 1.25, phase: 0 },
  { baseX: 1980, baseY: 442, width: 118, height: 52, rangeX: 0, rangeY: 54, speed: 1.5, phase: 1.8 },
  { baseX: 3350, baseY: 492, width: 132, height: 52, rangeX: 95, rangeY: 20, speed: 1.05, phase: 2.6 },
  { baseX: 4270, baseY: 492, width: 118, height: 52, rangeX: 64, rangeY: 0, speed: 1.6, phase: .7 },
];
const boostPads = [
  { x: 1338, y: 576, width: 92 },
  { x: 2735, y: 558, width: 92 },
  { x: 5050, y: 558, width: 92 },
];

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = VIEW.width * ratio;
  canvas.height = VIEW.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

function roundedRect(x, y, width, height, radius, fill, stroke = '#25102d', line = 3) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}

function ellipse(x, y, radiusX, radiusY, fill, stroke, line = 3) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}

function wrap(value, span) { return ((value % span) + span) % span; }

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, '#8179db');
  sky.addColorStop(.44, '#e0b4cf');
  sky.addColorStop(.75, '#9bc8ef');
  sky.addColorStop(1, '#6a9fd4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Oslo moves slowly behind the nearer trees and platforms for a layered side-scrolling view.
  if (parallaxBackground.complete && parallaxBackground.naturalWidth) {
    const height = 540;
    const width = height * (parallaxBackground.naturalWidth / parallaxBackground.naturalHeight);
    const maxOffset = Math.max(0, width - VIEW.width);
    const offset = Math.min(maxOffset, camera * .04);
    ctx.save();
    ctx.globalAlpha = .92;
    ctx.drawImage(parallaxBackground, -offset, 4 + Math.sin(elapsed * .32) * 2, width, height);
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = .64;
  for (let index = 0; index < 7; index += 1) {
    const x = wrap(index * 270 - camera * .035 - elapsed * (4 + index), 1810) - 220;
    const y = 82 + (index % 3) * 52;
    drawCloud(x, y, .72 + (index % 2) * .16);
  }
  ctx.restore();

  ctx.fillStyle = 'rgb(62 128 201 / 30%)';
  ctx.fillRect(0, 458, VIEW.width, VIEW.height - 458);
  for (let i = 0; i < 15; i += 1) {
    const x = wrap(i * 156 - camera * .55 - elapsed * (10 + i % 3 * 5), 1500) - 110;
    roundedRect(x, 492 + (i % 4) * 29, 72 + (i % 5) * 24, 3, 3, 'rgb(255 255 255 / 48%)', null);
  }
}

function drawCloud(x, y, scale) {
  ctx.fillStyle = '#fffaff';
  ctx.beginPath();
  ctx.arc(x + 22 * scale, y + 27 * scale, 24 * scale, Math.PI, 0);
  ctx.arc(x + 53 * scale, y + 13 * scale, 33 * scale, Math.PI, 0);
  ctx.arc(x + 92 * scale, y + 31 * scale, 27 * scale, Math.PI, 0);
  ctx.lineTo(x + 116 * scale, y + 48 * scale);
  ctx.lineTo(x + 6 * scale, y + 48 * scale);
  ctx.closePath();
  ctx.fill();
}

function drawRollingHills() {
  const layers = [
    { baseY: 450, width: 250, height: 52, speed: .16, color: 'rgb(91 139 117 / 60%)' },
    { baseY: 492, width: 185, height: 76, speed: .3, color: 'rgb(47 112 82 / 78%)' },
  ];
  layers.forEach(layer => {
    const offset = wrap(camera * layer.speed, layer.width);
    ctx.save();
    ctx.fillStyle = layer.color;
    ctx.beginPath(); ctx.moveTo(-layer.width - offset, VIEW.height);
    for (let x = -layer.width - offset; x < VIEW.width + layer.width; x += layer.width) {
      ctx.quadraticCurveTo(x + layer.width * .5, layer.baseY - layer.height, x + layer.width, layer.baseY);
    }
    ctx.lineTo(VIEW.width + layer.width, VIEW.height); ctx.closePath(); ctx.fill();
    ctx.restore();
  });
}

function drawVippsLogo(x, y, size, color = '#fff') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px ui-rounded, Arial Rounded MT Bold, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('vipps', x, y);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, size * .1); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y + size * .13, size * .12, .18, Math.PI - .18); ctx.stroke();
  ctx.restore();
}

function drawVippsBillboard(x, y, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  roundedRect(0, 0, 120, 58, 10, '#ff6430', '#28122e', 3);
  roundedRect(8, 8, 104, 42, 6, '#fe7544', null);
  drawVippsLogo(60, 31, 22, '#fff8ef');
  ctx.restore();
}

function drawBackgroundDecorations() {
  drawRollingHills();
  const treeOffset = wrap(camera * .42, 210);
  ctx.save();
  for (let i = -2; i < 10; i += 1) {
    const x = i * 210 - treeOffset;
    const treeHeight = 62 + (i % 3) * 18;
    ellipse(x + 28, 520 - treeHeight, 34, treeHeight * .62, '#2f704d', null);
    ellipse(x + 61, 526 - treeHeight * .75, 38, treeHeight * .55, '#427c50', null);
    ellipse(x + 91, 531 - treeHeight * .58, 28, treeHeight * .43, '#6caa54', null);
  }
  for (let i = 0; i < 3; i += 1) drawVippsBillboard(i * 680 - wrap(camera * .27, 680) + 95, 365 + (i % 2) * 27, .62);
  ctx.restore();
}

function movingPlatformRect(platform) {
  const wave = elapsed * platform.speed + platform.phase;
  return {
    x: platform.baseX + Math.sin(wave) * platform.rangeX,
    y: platform.baseY + Math.cos(wave) * platform.rangeY,
    width: platform.width,
    height: platform.height,
  };
}

function drawMovingPlatform(platform) {
  const rect = movingPlatformRect(platform);
  drawPlatform(rect);
  ctx.save();
  ctx.strokeStyle = '#7a4938'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(rect.x + 24, rect.y + rect.height); ctx.lineTo(rect.x + 24, rect.y + rect.height + 25); ctx.moveTo(rect.x + rect.width - 24, rect.y + rect.height); ctx.lineTo(rect.x + rect.width - 24, rect.y + rect.height + 25); ctx.stroke();
  ctx.restore();
}

function drawBoostPad(pad) {
  ctx.save(); ctx.translate(pad.x, pad.y);
  roundedRect(0, 0, pad.width, 23, 9, '#cbb5ff', '#25102d', 3);
  roundedRect(7, 5, pad.width - 14, 12, 6, '#e6dcff', null);
  ctx.strokeStyle = '#25102d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(24, 13); ctx.lineTo(37, 5); ctx.lineTo(37, 10); ctx.lineTo(58, 10); ctx.moveTo(pad.width - 24, 13); ctx.lineTo(pad.width - 37, 5); ctx.lineTo(pad.width - 37, 10); ctx.lineTo(pad.width - 58, 10); ctx.stroke();
  ctx.restore();
}

function spawnBurst(x, y, color, amount = 8, speed = 130) {
  for (let i = 0; i < amount; i += 1) {
    const angle = (Math.PI * 2 * i) / amount + Math.random() * .4;
    const velocity = speed * (.55 + Math.random() * .55);
    particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - 35, size: 3 + Math.random() * 5, life: .35 + Math.random() * .3, maxLife: .65, color });
  }
  if (particles.length > 150) particles.splice(0, particles.length - 150);
}

function updateParticles(dt) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.life -= dt;
    if (particle.life <= 0) { particles.splice(index, 1); continue; }
    particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 500 * dt;
  }
}

function drawParticles() {
  particles.forEach(particle => {
    ctx.save(); ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ellipse(particle.x, particle.y, particle.size, particle.size, particle.color, null);
    ctx.restore();
  });
}

function drawPlatform(platform) {
  const { x, y, width, height } = platform;
  const dirt = ctx.createLinearGradient(x, y, x, y + height);
  dirt.addColorStop(0, '#ed7039');
  dirt.addColorStop(.12, '#d9592d');
  dirt.addColorStop(1, '#a83d2a');
  roundedRect(x, y + 13, width, height, 13, dirt, '#4a2232', 3);
  roundedRect(x + 5, y + 32, width - 10, 10, 4, 'rgb(255 155 85 / 26%)', null);
  roundedRect(x, y - 9, width, 35, 15, '#8bc64c', '#274a35', 3);
  roundedRect(x + 7, y - 2, width - 14, 19, 10, '#b6e263', null);
  ctx.fillStyle = 'rgb(96 55 43 / 24%)';
  for (let dot = 0; dot < width / 36; dot += 1) {
    const dx = x + 18 + ((dot * 41) % Math.max(32, width - 36));
    const dy = y + 48 + ((dot * 47) % Math.max(40, height - 54));
    ctx.beginPath(); ctx.arc(dx, dy, 3 + dot % 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#467e37';
  for (let leaf = 0; leaf < width / 34; leaf += 1) {
    const lx = x + 12 + leaf * 34;
    ellipse(lx, y + 19, 12, 9, '#467e37', null);
  }
  ctx.strokeStyle = '#e7f896'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let blade = 0; blade < width / 48; blade += 1) {
    const bx = x + 18 + blade * 48;
    ctx.beginPath(); ctx.moveTo(bx, y + 4); ctx.quadraticCurveTo(bx + 2, y - 8 - blade % 4, bx + 7, y - 10); ctx.stroke();
  }
}

function drawBlock(block) {
  const bounce = block.hit ? Math.max(0, Math.sin((elapsed - block.hitAt) * 18)) * -10 : 0;
  const { x, y } = block;
  ctx.save(); ctx.translate(x, y + bounce);
  if (block.kind === 'question') {
    roundedRect(0, 0, 64, 64, 8, block.hit ? '#c99c73' : '#ff6b32', '#3c1728', 4);
    roundedRect(5, 5, 54, 9, 4, 'rgb(255 191 100 / 68%)', null);
    ctx.fillStyle = '#fff7e9'; ctx.strokeStyle = '#3c1728'; ctx.lineWidth = 3;
    ctx.font = '900 49px Arial Rounded MT Bold, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText('?', 32, 36); ctx.fillText('?', 32, 36);
  } else {
    roundedRect(0, 0, 64, 64, 7, '#8d4939', '#3c1728', 4);
    ctx.strokeStyle = '#c3734f'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(64, 30); ctx.moveTo(32, 0); ctx.lineTo(32, 30); ctx.moveTo(14, 30); ctx.lineTo(14, 64); ctx.moveTo(50, 30); ctx.lineTo(50, 64); ctx.stroke();
  }
  ctx.restore();
}

function drawVippsCoin(x, y, size, spin = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(spin, 1);
  if (vippsCoin.complete && vippsCoin.naturalWidth) {
    ctx.drawImage(vippsCoin, -size / 2, -size / 2, size, size);
    ctx.restore();
    return;
  }
  const scale = size / 62;
  ctx.scale(scale, scale);
  ellipse(0, 0, 23, 31, '#f68d1f', '#633226', 3);
  ellipse(-3, -3, 15, 22, '#ffb72b', '#fff3b7', 2);
  ctx.strokeStyle = '#fffaf4'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 1, 7, .12, Math.PI - .12); ctx.stroke();
  ctx.beginPath(); ctx.arc(-7, -8, 2, 0, Math.PI * 2); ctx.arc(7, -8, 2, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawCoin(coin) {
  if (coin.collected) return;
  const y = coin.baseY + Math.sin(elapsed * 3 + coin.phase) * 8;
  const spin = .66 + Math.abs(Math.sin(elapsed * 3.4 + coin.phase)) * .34;
  drawVippsCoin(coin.x, y, 66, spin);
}

function drawAppleLogo(x, y, size) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(size / 42, size / 42);
  ctx.fillStyle = '#fffdf7';
  ctx.beginPath();
  ctx.moveTo(-1, -12);
  ctx.bezierCurveTo(-8, -17, -18, -12, -21, -3);
  ctx.bezierCurveTo(-25, 8, -20, 22, -13, 28);
  ctx.bezierCurveTo(-8, 33, -3, 33, 1, 30);
  ctx.bezierCurveTo(4, 28, 8, 28, 12, 30);
  ctx.bezierCurveTo(16, 33, 20, 31, 24, 27);
  ctx.bezierCurveTo(31, 19, 34, 7, 30, -1);
  ctx.bezierCurveTo(27, -7, 22, -10, 17, -10);
  ctx.bezierCurveTo(12, -10, 9, -7, 5, -7);
  ctx.bezierCurveTo(1, -7, -2, -10, -7, -10);
  ctx.bezierCurveTo(-5, -11, -3, -12, -1, -12);
  ctx.closePath();
  ctx.fill();
  ctx.save(); ctx.translate(10, -22); ctx.rotate(-.48);
  ellipse(0, 0, 8, 3.5, '#fffdf7', null);
  ctx.restore();
  ctx.restore();
}

function drawAppla(enemy) {
  if (!enemy.alive) return;
  const x = enemy.x;
  const y = enemy.y + Math.sin(elapsed * 7 + enemy.x) * 1.5;
  if (applaSourceReady) {
    ctx.save();
    ellipse(x, y + 29, 36, 8, 'rgb(35 17 39 / 30%)', null);
    ctx.drawImage(applaSprite, x - 49, y - 60, 98, 88);
    ctx.restore();
    return;
  }
  if (appla.complete && appla.naturalWidth) {
    ctx.save();
    ellipse(x, y + 29, 36, 8, 'rgb(35 17 39 / 30%)', null);
    ctx.drawImage(appla, x - 48, y - 59, 96, 96);
    ctx.restore();
    return;
  }
  ctx.save(); ctx.translate(x, y);
  ellipse(0, 27, 36, 8, 'rgb(35 17 39 / 30%)', null);
  ellipse(0, 16, 26, 16, '#f6c08c', '#25102d', 3);
  ellipse(-19, 24, 16, 11, '#6c362d', '#25102d', 3);
  ellipse(19, 24, 16, 11, '#6c362d', '#25102d', 3);
  const cap = ctx.createLinearGradient(0, -44, 0, 20);
  cap.addColorStop(0, '#ce8862'); cap.addColorStop(.48, '#9e573d'); cap.addColorStop(1, '#65342e');
  ctx.beginPath();
  ctx.moveTo(-34, 13);
  ctx.bezierCurveTo(-37, -8, -26, -37, -2, -43);
  ctx.bezierCurveTo(21, -45, 36, -19, 37, 9);
  ctx.bezierCurveTo(37, 18, 28, 20, 18, 20);
  ctx.lineTo(-22, 20);
  ctx.bezierCurveTo(-30, 20, -34, 18, -34, 13);
  ctx.closePath();
  ctx.fillStyle = cap; ctx.fill(); ctx.strokeStyle = '#25102d'; ctx.lineWidth = 3.5; ctx.stroke();
  drawAppleLogo(0, -18, 25);
  ctx.strokeStyle = '#35192a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-7, -3); ctx.moveTo(15, 0); ctx.lineTo(7, -3); ctx.stroke();
  ellipse(-10, 6, 4, 5, '#25102d', null); ellipse(10, 6, 4, 5, '#25102d', null);
  ctx.restore();
}

function drawGift() {
  const bounce = gift.found ? 0 : Math.sin(elapsed * 2) * 3;
  ctx.save(); ctx.translate(gift.x, gift.y + bounce);
  roundedRect(0, 20, 75, 60, 7, '#dfccff', '#25102d', 4);
  roundedRect(6, 10, 63, 28, 7, '#eee6ff', '#25102d', 4);
  ctx.fillStyle = '#f15d2b'; ctx.fillRect(32, 14, 11, 66);
  ctx.fillStyle = '#ff7437'; ctx.beginPath(); ctx.ellipse(28, 9, 16, 8, -.4, 0, Math.PI * 2); ctx.ellipse(47, 9, 16, 8, .4, 0, Math.PI * 2); ctx.fill();
  roundedRect(12, 40, 52, 24, 5, '#d6ff7b', '#25102d', 2);
  ctx.fillStyle = '#1d3b25'; ctx.font = '900 15px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+100', 38, 52);
  ctx.restore();
}

function drawFlag() {
  const wave = Math.sin(elapsed * 3) * 5;
  ctx.save(); ctx.translate(goal.x, goal.y);
  ctx.strokeStyle = '#25102d'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, goal.height); ctx.stroke();
  ellipse(0, 0, 17, 17, '#ff6b30', '#25102d', 4);
  ctx.beginPath(); ctx.moveTo(4, 35); ctx.quadraticCurveTo(66, 42 + wave, 103, 72); ctx.quadraticCurveTo(56, 93 + wave, 4, 101); ctx.closePath();
  ctx.fillStyle = '#ff6530'; ctx.fill(); ctx.strokeStyle = '#25102d'; ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeStyle = '#fff8f1'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(53, 72, 15, .25, Math.PI - .25); ctx.stroke();
  ctx.beginPath(); ctx.arc(39, 56, 2.5, 0, Math.PI * 2); ctx.arc(66, 56, 2.5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawSign(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#6b3d2d'; roundedRect(36, 50, 13, 170, 4, '#72422e', '#25102d', 3);
  const labels = [['↟', 'Send'], ['▣', 'Betal'], ['▤', 'Del']];
  labels.forEach(([icon, text], index) => {
    const py = index * 48;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(130, py); ctx.lineTo(149, py + 19); ctx.lineTo(130, py + 38); ctx.lineTo(0, py + 38); ctx.closePath();
    ctx.fillStyle = '#fff6f7'; ctx.fill(); ctx.strokeStyle = '#25102d'; ctx.lineWidth = 3; ctx.stroke();
    roundedRect(8, py + 6, 25, 25, 5, index === 1 ? '#b890ff' : '#ff6b30', '#25102d', 2);
    ctx.fillStyle = '#25102d'; ctx.font = '900 18px Arial Rounded MT Bold, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, 46, py + 20);
    ctx.font = '900 17px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(icon, 20, py + 20);
  });
  ctx.restore();
}

function drawSuitOverlay() {
  const pulse = 1 + Math.sin(elapsed * 8) * .08;
  if (activeSuit === 'tap') {
    roundedRect(26, 24, 19, 17, 6, '#ff6932', '#25102d', 2);
    ctx.strokeStyle = '#fff8ed'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(44, 32, 7, -.8, .8); ctx.stroke();
    ctx.beginPath(); ctx.arc(44, 32, 11, -.72, .72); ctx.stroke();
  }
  if (activeSuit === 'scan') {
    roundedRect(-27, -2, 54, 14, 6, '#b998ff', '#25102d', 2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    [[-17, 3, -11, 3], [-17, 3, -17, 8], [17, 3, 11, 3], [17, 3, 17, 8]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
  }
  if (activeSuit === 'gifts') {
    ctx.fillStyle = '#ff6331'; ctx.fillRect(-4, 24, 8, 40);
    ellipse(-8, 22, 12, 5, '#ff6331', '#25102d', 1.5);
    ellipse(8, 22, 12, 5, '#ff6331', '#25102d', 1.5);
  }
  if (scanTimer > 0) {
    ctx.strokeStyle = `rgb(197 170 255 / ${.35 + .25 * Math.sin(elapsed * 12)})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 22, 55 * pulse, 0, Math.PI * 2); ctx.stroke();
  }
  if (shieldTimer > 0) {
    ellipse(0, 20, 65 * pulse, 74 * pulse, 'rgb(201 243 106 / 15%)', '#d8ff76', 3);
  }
  if (dashTimer > 0) {
    ctx.strokeStyle = '#fff5bd'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let index = 0; index < 3; index += 1) {
      ctx.beginPath(); ctx.moveTo(-45 - index * 12, 28 + index * 13); ctx.lineTo(-18 - index * 8, 28 + index * 13); ctx.stroke();
    }
  }
}

function drawPlayer() {
  if (vippsi.complete && vippsi.naturalWidth) {
    const x = player.x + player.width / 2;
    const y = player.y;
    const stride = player.onGround ? Math.sin(elapsed * 15) * Math.min(1.6, Math.abs(player.vx) / 175) : -2;
    ctx.save();
    ctx.translate(x, y + stride);
    ctx.scale(player.facing, 1);
    if (player.invincible > 0 && Math.floor(elapsed * 18) % 2 === 0) ctx.globalAlpha = .4;
    if (!player.onGround) ctx.rotate(Math.max(-.09, Math.min(.09, player.vy / 700 * .07)));
    ellipse(0, 78, 39, 8, 'rgb(42 23 47 / 25%)', null);
    ctx.drawImage(vippsi, -68, -51, 136, 136);
    drawSuitOverlay();
    ctx.restore();
    return;
  }
  const x = player.x + player.width / 2;
  const y = player.y + player.height / 2;
  const walking = Math.min(1, Math.abs(player.vx) / 300);
  const legSwing = player.onGround ? Math.sin(elapsed * 16) * 12 * walking : 8;
  ctx.save(); ctx.translate(x, y); ctx.scale(player.facing, 1);
  if (player.invincible > 0 && Math.floor(elapsed * 18) % 2 === 0) ctx.globalAlpha = .4;
  ellipse(0, 38, 34, 8, 'rgb(42 23 47 / 30%)', null);
  // legs
  ctx.strokeStyle = '#ff662d'; ctx.lineWidth = 18; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-13, 19); ctx.lineTo(-17 + legSwing, 35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(13, 19); ctx.lineTo(17 - legSwing, 35); ctx.stroke();
  ellipse(-17 + legSwing, 37, 14, 9, '#fff8f2', '#25102d', 2);
  ellipse(17 - legSwing, 37, 14, 9, '#fff8f2', '#25102d', 2);
  // hoodie body and round hood with ears
  roundedRect(-29, -2, 58, 42, 20, '#fffdf9', '#25102d', 3);
  ellipse(0, -19, 36, 35, '#fffdf9', '#25102d', 3);
  ellipse(-25, -47, 10, 12, '#fffdf9', '#25102d', 3);
  ellipse(25, -47, 10, 12, '#fffdf9', '#25102d', 3);
  ellipse(0, -16, 25, 23, '#ff6b2f', '#e14720', 2);
  // arms
  ctx.strokeStyle = '#fffdf9'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(-25, 6); ctx.lineTo(-40, 17); ctx.stroke(); ctx.beginPath(); ctx.moveTo(25, 6); ctx.lineTo(40, -1); ctx.stroke();
  ellipse(-42, 18, 9, 9, '#ff6b2f', '#25102d', 2); ellipse(43, -2, 9, 9, '#ff6b2f', '#25102d', 2);
  // face
  ellipse(-9, -20, 5, 8, '#fff', '#25102d', 2); ellipse(9, -20, 5, 8, '#fff', '#25102d', 2);
  ellipse(-8, -19, 2, 4, '#25102d', null); ellipse(10, -19, 2, 4, '#25102d', null);
  ctx.strokeStyle = '#25102d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -10, 9, .2, Math.PI - .2); ctx.stroke();
  ctx.strokeStyle = '#ded3d4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, 12); ctx.lineTo(-7, 24); ctx.moveTo(7, 12); ctx.lineTo(7, 24); ctx.stroke();
  drawSuitOverlay();
  ctx.restore();
}

function drawHud() {
  ctx.save();
  ctx.fillStyle = 'rgb(255 255 255 / 62%)'; ctx.fillRect(0, 0, VIEW.width, 94);
  ctx.fillStyle = '#1e1035'; ctx.font = '900 28px ui-rounded, Arial Rounded MT Bold, sans-serif'; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText('VIPPS QUEST', 44, 46);
  // life token
  ellipse(270, 45, 25, 25, '#fffdf9', '#25102d', 3); ellipse(270, 47, 14, 13, '#ff6b2f', null);
  ctx.font = '900 25px ui-rounded, Arial Rounded MT Bold, sans-serif'; ctx.fillText(`× ${String(player.lives).padStart(2, '0')}`, 306, 47);
  // Vipps-smile coin
  drawVippsCoin(452, 45, 55, .82);
  ctx.fillStyle = '#1e1035'; ctx.textAlign = 'left'; ctx.fillText(`× ${String(coinsCollected).padStart(2, '0')}`, 482, 47);
  ctx.textAlign = 'center'; ctx.fillText('WORLD  1-1', 804, 46);
  ctx.textAlign = 'right'; ctx.fillText(`SCORE  ${String(score).padStart(6, '0')}`, 1234, 46);
  const readyText = abilityCooldown > 0 ? `${Math.ceil(abilityCooldown)}s` : 'READY';
  roundedRect(620, 62, 146, 24, 9, '#f0e8ff', '#25102d', 2);
  ctx.fillStyle = suits[activeSuit].color; ctx.font = '900 12px ui-rounded, Arial Rounded MT Bold, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${suits[activeSuit].hud} · ${readyText}`, 693, 75);
  ctx.restore();
}

function drawOverlay() {
  if (state === 'playing') return;
  ctx.fillStyle = 'rgb(21 13 41 / 52%)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  roundedRect(335, 228, 610, 258, 26, 'rgb(255 250 255 / 96%)', '#25102d', 5);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#25102d'; ctx.font = '900 48px ui-rounded, Arial Rounded MT Bold, sans-serif';
  ctx.fillText(state === 'won' ? 'LEVEL COMPLETE!' : 'ONE MORE TRY?', 640, 304);
  ctx.fillStyle = '#e54a21'; ctx.font = '900 24px ui-rounded, Arial Rounded MT Bold, sans-serif';
  ctx.fillText(state === 'won' ? `You collected ${coinsCollected} coins and unlocked a little joy.` : 'Appla sent you back to the start.', 640, 358);
  roundedRect(489, 396, 302, 54, 16, '#ff6b30', '#25102d', 4);
  ctx.fillStyle = '#fff'; ctx.font = '900 22px ui-rounded, Arial Rounded MT Bold, sans-serif'; ctx.fillText('Press R to play again', 640, 423);
}

function draw() {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawSky();
  drawBackgroundDecorations();
  ctx.save(); ctx.translate(-camera, 0);
  platforms.forEach(drawPlatform);
  movingPlatforms.forEach(drawMovingPlatform);
  boostPads.forEach(drawBoostPad);
  drawSign(70, 366);
  blocks.forEach(drawBlock);
  coins.forEach(drawCoin);
  drawGift();
  drawParticles();
  enemies.forEach(drawAppla);
  drawFlag();
  drawPlayer();
  ctx.restore();
  drawHud();
  drawOverlay();
  if (flash > 0) {
    ctx.fillStyle = `rgb(255 255 255 / ${flash * .28})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function playerBox() { return { x: player.x + 5, y: player.y + 3, width: player.width - 10, height: player.height - 5 }; }

function playTone(frequency, duration = .08, type = 'sine') {
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(.045, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  } catch { /* Sound is an optional enhancement. */ }
}

function collectCoin(coin) {
  coin.collected = true;
  coinsCollected += 1;
  score += 100;
  spawnBurst(coin.x, coin.baseY, '#fff2a6', 7, 120);
  playTone(600 + coinsCollected * 8, .08, 'triangle');
}

function bumpBlock(block) {
  if (block.hit || block.kind !== 'question') return;
  block.hit = true; block.hitAt = elapsed;
  score += 150;
  const reward = { x: block.x + 32, y: block.y - 17, baseY: block.y - 17, collected: false, phase: 0 };
  coins.push(reward);
  spawnBurst(block.x + 32, block.y + 12, '#ffd372', 8, 150);
  playTone(360, .1, 'square');
}

function hurt() {
  if (player.invincible > 0 || state !== 'playing') return;
  if (shieldTimer > 0) {
    shieldTimer = 0;
    player.invincible = .8;
    flash = .55;
    spawnBurst(player.x + player.width / 2, player.y + player.height / 2, '#d8ff76', 16, 210);
    playTone(760, .16, 'sine');
    message.textContent = 'Money Gifts shield blocked Appla!';
    return;
  }
  player.lives -= 1;
  flash = 1;
  playTone(120, .22, 'sawtooth');
  if (player.lives <= 0) {
    state = 'lost';
    message.textContent = 'Appla got you this time — press R for another run.';
    return;
  }
  player.x = player.spawnX; player.y = player.spawnY; player.vx = 0; player.vy = -330; player.jumps = 1; player.invincible = 1.6;
  camera = Math.max(0, player.x - 240);
  message.textContent = 'Ouch — you still have this.';
}

function restart() {
  state = 'playing'; score = 2310; coinsCollected = 0; flash = 0; gift.found = false;
  abilityCooldown = 0; dashTimer = 0; scanTimer = 0; shieldTimer = 0;
  coins.splice(0, coins.length, ...coinSeeds.map(([x, y], index) => ({ x, y, baseY: y, collected: false, phase: index * .43 })));
  blocks.forEach(block => { block.hit = false; delete block.hitAt; });
  enemies.forEach(enemy => { enemy.alive = true; });
  Object.assign(player, { x: 160, y: 410, vx: 0, vy: 0, lives: 3, invincible: 0, jumpBuffer: 0, jumps: 0, boostLock: 0 });
  camera = 0;
  message.textContent = 'Double-jump, use launch pads, collect coins and reach the flag.';
}

function update(dt) {
  elapsed += dt;
  flash = Math.max(0, flash - dt * 2.6);
  abilityCooldown = Math.max(0, abilityCooldown - dt);
  dashTimer = Math.max(0, dashTimer - dt);
  scanTimer = Math.max(0, scanTimer - dt);
  shieldTimer = Math.max(0, shieldTimer - dt);
  updateParticles(dt);
  if (state !== 'playing') return;

  player.invincible = Math.max(0, player.invincible - dt);
  player.boostLock = Math.max(0, player.boostLock - dt);
  player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.coyote = Math.max(0, player.coyote - dt);
  const direction = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const targetVelocity = direction * 355;
  player.vx += (targetVelocity - player.vx) * Math.min(1, dt * (direction ? 14 : 9));
  if (direction) player.facing = direction;

  // Vippsi gets two forgiving, high jumps: a strong ground jump plus one air jump.
  if (player.jumpBuffer > 0 && player.jumps < 2) {
    player.vy = -865; player.onGround = false; player.coyote = 0; player.jumpBuffer = 0; player.jumps += 1;
    spawnBurst(player.x + player.width / 2, player.y + player.height, '#fff7ee', 7, 145);
    playTone(250, .075, 'triangle');
  }
  if (!keys.jump && player.vy < -290) player.vy += GRAVITY * 1.15 * dt;

  player.prevY = player.y;
  player.vy += GRAVITY * dt;
  player.x += player.vx * dt;
  player.x = Math.max(-20, Math.min(WORLD_WIDTH - player.width, player.x));
  player.y += player.vy * dt;
  player.onGround = false;

  for (const platform of [...platforms, ...movingPlatforms.map(movingPlatformRect)]) {
    const p = playerBox();
    if (p.x + p.width <= platform.x || p.x >= platform.x + platform.width) continue;
    if (player.vy >= 0 && player.prevY + player.height <= platform.y + 12 && player.y + player.height >= platform.y) {
      if (player.vy > 230) spawnBurst(player.x + player.width / 2, platform.y, '#daf496', 5, 100);
      player.y = platform.y - player.height; player.vy = 0; player.onGround = true; player.coyote = .11; player.jumps = 0;
    } else if (player.vy < 0 && player.prevY >= platform.y + platform.height - 12 && player.y <= platform.y + platform.height) {
      player.y = platform.y + platform.height; player.vy = 0;
    }
  }

  for (const block of blocks) {
    const b = { x: block.x, y: block.y, width: 64, height: 64 };
    const p = playerBox();
    if (!overlaps(p, b)) continue;
    if (player.vy < 0 && player.prevY >= block.y + 58) {
      player.y = block.y + 64; player.vy = 0; bumpBlock(block);
    } else if (player.vy >= 0 && player.prevY + player.height <= block.y + 8) {
      player.y = block.y - player.height; player.vy = 0; player.onGround = true; player.coyote = .11; player.jumps = 0;
    } else {
      player.vx *= -.25;
    }
  }

  for (const pad of boostPads) {
    const p = playerBox();
    const landsOnPad = p.x + p.width > pad.x && p.x < pad.x + pad.width && player.vy >= 0 && player.prevY + player.height <= pad.y + 30 && player.y + player.height >= pad.y;
    if (landsOnPad && player.boostLock <= 0) {
      player.vy = -1080; player.onGround = false; player.jumps = 1; player.boostLock = .22;
      spawnBurst(player.x + player.width / 2, pad.y + 7, '#d8c3ff', 13, 230);
      playTone(520, .12, 'square');
    }
  }

  for (const coin of coins) {
    if (!coin.collected && scanTimer > 0) {
      const targetX = player.x + player.width / 2;
      const targetY = player.y + player.height / 2;
      const dx = targetX - coin.x;
      const dy = targetY - coin.baseY;
      const distance = Math.hypot(dx, dy);
      if (distance > 1 && distance < 310) {
        const pull = 260 + (1 - distance / 310) * 540;
        coin.x += (dx / distance) * pull * dt;
        coin.baseY += (dy / distance) * pull * dt;
      }
    }
    if (!coin.collected && overlaps(playerBox(), { x: coin.x - 22, y: coin.baseY - 30, width: 44, height: 60 })) collectCoin(coin);
  }
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.speed * enemy.direction * dt;
    if (enemy.x < enemy.min || enemy.x > enemy.max) { enemy.direction *= -1; enemy.x = Math.max(enemy.min, Math.min(enemy.max, enemy.x)); }
    const box = { x: enemy.x - 27, y: enemy.y - 18, width: 54, height: 42 };
    if (overlaps(playerBox(), box)) {
      if (dashTimer > 0) {
        enemy.alive = false; score += 250; spawnBurst(enemy.x, enemy.y, '#fff5db', 12, 220); playTone(510, .1, 'square');
      } else if (player.vy > 155 && player.y + player.height - enemy.y < 28) {
        enemy.alive = false; player.vy = -465; player.jumps = 1; score += 250; spawnBurst(enemy.x, enemy.y, '#fff5db', 12, 180); playTone(420, .12, 'square');
      } else hurt();
    }
  }
  if (!gift.found && overlaps(playerBox(), { x: gift.x, y: gift.y, width: 75, height: 80 })) {
    gift.found = true; score += 1000; flash = 1; message.textContent = 'Gift unlocked: +1000 joy points!'; playTone(880, .22, 'sine');
  }
  if (overlaps(playerBox(), { x: goal.x - 18, y: goal.y, width: 124, height: goal.height })) {
    state = 'won'; score += 500; message.textContent = 'Level complete! Press R to adventure again.'; playTone(660, .35, 'triangle');
  }
  if (player.y > VIEW.height + 180) hurt();
  const targetCamera = Math.max(0, Math.min(WORLD_WIDTH - VIEW.width, player.x - VIEW.width * .42));
  camera += (targetCamera - camera) * Math.min(1, dt * 5);
}

function requestJump() {
  keys.jump = true; player.jumpBuffer = .14;
}

function selectSuit(suit) {
  if (!suits[suit]) return;
  activeSuit = suit;
  document.querySelectorAll('[data-suit]').forEach(button => {
    const isActive = button.dataset.suit === suit;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  const prompts = {
    tap: 'Tap to Pay suit selected — press E or ✦ to dash.',
    scan: 'Scan QR suit selected — press E or ✦ to attract nearby coins.',
    gifts: 'Money Gifts suit selected — press E or ✦ for a shield.',
  };
  message.textContent = prompts[suit];
  playTone(suit === 'tap' ? 500 : suit === 'scan' ? 640 : 760, .06, 'triangle');
}

function useSuitAbility() {
  if (state !== 'playing' || abilityCooldown > 0) return;
  const suit = suits[activeSuit];
  abilityCooldown = suit.cooldown;
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;
  if (activeSuit === 'tap') {
    dashTimer = .42;
    player.vx = player.facing * 920;
    player.vy = Math.min(player.vy, -85);
    player.invincible = Math.max(player.invincible, .46);
    spawnBurst(centerX, centerY, '#ff6b30', 14, 270);
    message.textContent = 'Tap to Pay dash! Appla cannot stop you.';
    playTone(760, .12, 'square');
  } else if (activeSuit === 'scan') {
    scanTimer = 7;
    spawnBurst(centerX, centerY, '#c9b2ff', 18, 180);
    message.textContent = 'Scan QR magnet is active for 7 seconds.';
    playTone(640, .16, 'sine');
  } else {
    shieldTimer = 9;
    spawnBurst(centerX, centerY, '#d8ff76', 18, 180);
    message.textContent = 'Money Gifts shield is active for 9 seconds.';
    playTone(820, .16, 'sine');
  }
}

const codeToKey = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
};

window.addEventListener('keydown', event => {
  if (event.code === 'KeyR') { restart(); return; }
  if (event.code === 'Digit1') { selectSuit('tap'); return; }
  if (event.code === 'Digit2') { selectSuit('scan'); return; }
  if (event.code === 'Digit3') { selectSuit('gifts'); return; }
  if (event.code === 'KeyE' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') { event.preventDefault(); useSuitAbility(); return; }
  const key = codeToKey[event.code];
  if (!key) return;
  event.preventDefault();
  if (key === 'jump' && !keys.jump) requestJump(); else keys[key] = true;
});
window.addEventListener('keyup', event => {
  const key = codeToKey[event.code];
  if (!key) return;
  event.preventDefault(); keys[key] = false;
});
window.addEventListener('blur', () => Object.keys(keys).forEach(key => { keys[key] = false; }));

document.querySelectorAll('[data-key]').forEach(button => {
  const key = button.dataset.key;
  const down = event => {
    event.preventDefault(); button.classList.add('is-pressed');
    if (key === 'jump') requestJump(); else if (key === 'ability') useSuitAbility(); else keys[key] = true;
  };
  const up = event => { event.preventDefault(); button.classList.remove('is-pressed'); if (key !== 'ability') keys[key] = false; };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('pointerleave', up);
});

document.querySelectorAll('[data-suit]').forEach(button => {
  button.addEventListener('click', () => selectSuit(button.dataset.suit));
});

function loop(time) {
  const dt = Math.min(.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

resize();
window.addEventListener('resize', resize);
requestAnimationFrame(loop);
