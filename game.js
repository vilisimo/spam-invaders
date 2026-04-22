const C = document.getElementById('g');
const X = C.getContext('2d');
const W = 800, H = 600;
C.width = W; C.height = H;

let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window['webkitAudioContext'])(); }
    catch (e) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.15, vol = 0.15, delay = 0 }) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playNoise({ dur = 0.12, vol = 0.1, filterFreq = 2000, delay = 0 }) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const bufferSize = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const sfx = {
  throwPlane() {
    playNoise({ dur: 0.12, vol: 0.08, filterFreq: 3500 });
    playTone({ freq: 900, freqEnd: 400, type: 'triangle', dur: 0.1, vol: 0.06 });
  },
  hitSpam() {
    playTone({ freq: 320, freqEnd: 90, type: 'square', dur: 0.12, vol: 0.12 });
    playNoise({ dur: 0.08, vol: 0.1, filterFreq: 1200 });
  },
  hitLegit() {
    playTone({ freq: 380, freqEnd: 140, type: 'sawtooth', dur: 0.22, vol: 0.14 });
    playTone({ freq: 190, freqEnd: 70, type: 'sawtooth', dur: 0.28, vol: 0.1, delay: 0.04 });
  },
  hitVip() {
    playTone({ freq: 520, freqEnd: 130, type: 'sawtooth', dur: 0.18, vol: 0.16 });
    playTone({ freq: 260, freqEnd: 60, type: 'square', dur: 0.3, vol: 0.12, delay: 0.08 });
    playNoise({ dur: 0.25, vol: 0.08, filterFreq: 600, delay: 0.05 });
  },
  spamBreached() {
    playTone({ freq: 220, freqEnd: 55, type: 'sawtooth', dur: 0.35, vol: 0.16 });
    playNoise({ dur: 0.3, vol: 0.1, filterFreq: 400, delay: 0.02 });
    playTone({ freq: 110, freqEnd: 40, type: 'square', dur: 0.4, vol: 0.1, delay: 0.1 });
  },
  levelComplete() {
    playTone({ freq: 523, type: 'triangle', dur: 0.14, vol: 0.14 });
    playTone({ freq: 659, type: 'triangle', dur: 0.14, vol: 0.14, delay: 0.12 });
    playTone({ freq: 784, type: 'triangle', dur: 0.14, vol: 0.14, delay: 0.24 });
    playTone({ freq: 1047, type: 'triangle', dur: 0.28, vol: 0.16, delay: 0.36 });
  },
  gameOver() {
    playTone({ freq: 440, freqEnd: 110, type: 'sawtooth', dur: 0.5, vol: 0.18 });
    playTone({ freq: 330, freqEnd: 80, type: 'square', dur: 0.6, vol: 0.14, delay: 0.15 });
    playTone({ freq: 165, freqEnd: 45, type: 'sawtooth', dur: 0.7, vol: 0.12, delay: 0.35 });
    playNoise({ dur: 0.5, vol: 0.08, filterFreq: 300, delay: 0.2 });
  }
};

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.95;
  C.style.width = (W * scale) + 'px';
  C.style.height = (H * scale) + 'px';
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

let boothApiKey = '';
const SUBMIT_SCORES_URL = 'https://wix-conf-vilnius.base44.app/api/functions/submitScores';

let state = 'apikey';
let apiKeyInput = '';
const isValidApiKey = v => /^booth_[A-Za-z0-9]+$/.test(v);
let submitStatus = null;
let submitMessage = '';
let score = 0, lives = 3, level = 1;
let player, bullets, emails, particles;
let lastShot = 0, shootCooldown = 280;
let comboCount = 0, comboTimer = 0;
let leaderboard = JSON.parse(localStorage.getItem('spamInvadersLeaderboard') || '[]');
let emailInput = '', enteringEmail = false;
const isValidEmail = v => /^[^\s@]+@wix\.com$/i.test(v);
const gameOverMessages = [
  'PRINCE SUCCESSFULLY TRANSFERRED FUNDS',
  'PRINCE KEPT THE $47,000,000',
  'HOT SINGLES OVERRAN YOUR INBOX',
  'FINAL WARRANTY NOTICE (FINAL)',
  'BURIED UNDER V1AGR4 SHIPMENTS',
  'NIGERIAN PRINCE CASHED THE CHECK',
  'GIFT CARDS MAILED TO "CEO"',
  'CHAIN LETTER FULFILLED ITS CURSE',
  'FAKE IRS COLLECTED YOUR INBOX',
  '47 VIRUSES INSTALLED',
  'INBOX ENCRYPTED. SEND 0.5 BTC.',
  'AUTO-SUBSCRIBED TO 47 NEWSLETTERS',
  'WIDOW SUCCESSFULLY WIRED HER FORTUNE',
  'LONELY MILFS ESTABLISHED UPLINK',
  'BLUE PILLS AUTO-REORDERED MONTHLY',
  'CREDENTIALS SUCCESSFULLY PHISHED',
  'SINGLES IN YOUR AREA FOUND YOU',
  'FWD: FWD: FWD: RE: YOUR DEMISE',
  'MICROSOFT TECH SUPPORT REMOTED IN',
  'PRINCE NAMED HIS GOAT AFTER YOU',
  'FBI AGENT "JOHN" RETIRED ON YOUR SAVINGS',
  'ROMANIAN BRIDE FILED FOR DIVORCE ALREADY',
  'IRS AGENT ACCEPTED GIFT CARDS',
  'ANTIVIRUS SUBSCRIPTION AUTO-RENEWED',
  'EXTENDED CAR WARRANTY CLAIMED',
  'TOTALLY-LEGIT-INVOICE.PDF.EXE OPENED',
  'DNA TEST REVEALED NEW RELATIVES',
];
const bonusLifeMessages = [
  '⭐ {name} granted you RSUs! +1 Life',
  '⭐ {name} approved your promotion! +1 Life',
  '⭐ {name} vested you early! +1 Life',
  '⭐ WIX stock up 3%! +1 Life',
  '⭐ {name} mentioned you in all-hands! +1 Life',
  '⭐ Board approved bonus lives! +1 Life',
  '⭐ {name} added you to the cap table! +1 Life',
  '⭐ Exercise window extended! +1 Life',
  '⭐ SPF/DKIM/DMARC all passed! +1 Life',
  '⭐ Spam filter bounty: +1 Life',
  '⭐ Abuse@ team sends regards! +1 Life',
  '⭐ Honeypot caught 47 scammers! +1 Life',
  '⭐ {name} liked your Slack message! +1 Life',
  '⭐ {name} reposted your demo! +1 Life',
  '⭐ ESPP window opened! +1 Life',
  '⭐ Refresh grant landed! +1 Life',
  '⭐ Analyst upgraded WIX to BUY! +1 Life',
];
let gameOverMessage = gameOverMessages[0];
let flashMsg = '', flashTimer = 0;
let mailField = [];
let emailsHandled = 0;
let spawnTimer = 0;
let levelTransition = 0;
let specialSpawned = false;
let moveHoldTime = 0, moveHoldDir = 0;

const SPAM = [
  "🎰 YOU WON $1M!", "💊 Buy Pills Now", "🔥 Hot Singles!", "👑 Nigerian Prince",
  "📦 Free iPhone!", "🚨 Act NOW!!!", "💰 Easy Money!", "🎁 Claim Prize!",
  "⚠️ Verify Acct!", "🔒 Pwd Reset Scam", "📧 Fwd:Fwd:Fwd:", "🤑 Work From Home",
  "💎 Crypto 1000x!", "🏆 Congrats!!!", "🎪 Limited Offer!", "👻 Weird Trick!"
];
const LEGIT = [
  "📋 Sprint Review", "📊 Q4 Report", "🤝 Meeting Notes", "📅 Team Standup",
  "✅ PR Approved", "📨 Newsletter", "🔔 Deploy Done", "💼 Offer Letter",
  "📝 Design Review", "🎯 OKR Update"
];
const VIP = [
  { name: "Nir Zohar", label: "⭐ From: Nir Zohar" },
  { name: "Avishai Abrahami", label: "⭐ From: Avishai" },
  { name: "Yaniv Even-Haim", label: "⭐ From: Yaniv E-H" }
];

const MAIL_KINDS = ['env', 'at', 'plane'];
for (let i = 0; i < 28; i++) mailField.push({
  x: Math.random() * W,
  y: Math.random() * H,
  s: Math.random() * 0.6 + 0.7,
  sp: Math.random() * 0.25 + 0.08,
  rot: (Math.random() - 0.5) * 0.6,
  kind: MAIL_KINDS[Math.floor(Math.random() * MAIL_KINDS.length)],
  phase: Math.random() * Math.PI * 2
});

function getLevelParams() {
  let spd = 2.5 + (level - 1) * 0.6;
  let interval = Math.max(350, 1200 - (level - 1) * 80);
  let needed = 10 + (level - 1) * 5;
  let legitRatio = Math.min(0.45, 0.25 + level * 0.02);
  return { spd, interval, needed, legitRatio };
}

function initGame() {
  score = 0; lives = 3; level = 1;
  comboCount = 0; comboTimer = 0;
  emailsHandled = 0; levelTransition = 0;
  specialSpawned = false;
  submitStatus = null; submitMessage = '';
  player = { x: W / 2, y: H - 45, w: 70, h: 30, speed: 5.5 };
  bullets = []; emails = []; particles = [];
  spawnTimer = 0;
  moveHoldTime = 0; moveHoldDir = 0;
}

function spawnEmail() {
  let params = getLevelParams();
  // VIP check: once per level, ~30% chance each spawn after halfway
  let isVip = false;
  if (!specialSpawned && emailsHandled > params.needed * 0.5 && Math.random() < 0.08) {
    isVip = true;
    specialSpawned = true;
  }
  let isLegit = isVip ? true : Math.random() < params.legitRatio;
  let lane = 45 + Math.random() * (W - 90);
  let vipData = isVip ? VIP[Math.floor(Math.random() * VIP.length)] : null;
  emails.push({
    x: lane, y: -40,
    w: 72, h: 42,
    vy: params.spd,
    legit: isLegit,
    vip: isVip,
    vipData: vipData,
    label: isVip ? vipData.label : (isLegit ? LEGIT[Math.floor(Math.random() * LEGIT.length)] : SPAM[Math.floor(Math.random() * SPAM.length)]),
    bobOffset: Math.random() * Math.PI * 2,
    flash: 0,
    rotation: (Math.random() - 0.5) * 0.1
  });
}

function submitScores() {
  submitStatus = 'pending';
  submitMessage = 'Submitting scores…';
  fetch(SUBMIT_SCORES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: boothApiKey,
      scores: leaderboard.map(e => e.email)
    })
  })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
    .then(() => { submitStatus = 'success'; submitMessage = '✓ Scores submitted to leaderboard'; })
    .catch(err => { submitStatus = 'error'; submitMessage = '✗ Score submission failed: ' + err.message; });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
      life: 1, decay: Math.random() * 0.03 + 0.02, color, size: Math.random() * 3 + 1
    });
  }
}

let keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  keys[e.code] = true;
  if (state === 'apikey') {
    if (e.key === 'Backspace') {
      apiKeyInput = apiKeyInput.slice(0, -1);
    } else if (e.key === 'Enter') {
      if (isValidApiKey(apiKeyInput)) {
        boothApiKey = apiKeyInput;
        state = 'menu';
      }
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && apiKeyInput.length < 80) {
      apiKeyInput += e.key;
    }
    if (e.key !== 'v' || !(e.metaKey || e.ctrlKey)) e.preventDefault();
    return;
  }
  if (state === 'menu' && e.key === ' ') { state = 'play'; initGame(); }
  if (state === 'menu' && (e.key === 'l' || e.key === 'L')) { window.location.href = 'leaderboard.html'; }
  if (state === 'over' && enteringEmail) {
    if (e.key === 'Backspace') {
      emailInput = emailInput.slice(0, -1);
    } else if (e.key === 'Enter') {
      if (isValidEmail(emailInput)) {
        const email = emailInput.toLowerCase();
        const existing = leaderboard.find(e => e.email === email);
        if (!existing || score > existing.score) {
          leaderboard = leaderboard.filter(e => e.email !== email);
          leaderboard.push({ email, score, level });
          leaderboard.sort((a, b) => b.score - a.score);
          leaderboard = leaderboard.slice(0, 10);
          localStorage.setItem('spamInvadersLeaderboard', JSON.stringify(leaderboard));
        }
        submitScores();
        enteringEmail = false;
        state = 'leaderboard';
      }
    } else if (e.key.length === 1 && emailInput.length < 40) {
      emailInput += e.key;
    }
    e.preventDefault();
  }
  if (state === 'leaderboard' && e.key === ' ') state = 'menu';
});
document.addEventListener('keyup', e => { keys[e.key] = false; keys[e.code] = false; });
document.addEventListener('paste', e => {
  if (state !== 'apikey') return;
  const text = (e.clipboardData || window['clipboardData']).getData('text').trim();
  apiKeyInput = (apiKeyInput + text).slice(0, 80);
  e.preventDefault();
});

function advanceLevel() {
  emailsHandled++;
  let params = getLevelParams();
  if (emailsHandled >= params.needed && state === 'play') {
    level++;
    emailsHandled = 0;
    specialSpawned = false;
    levelTransition = 2000;
    emails = [];
    flashMsg = `📬 LEVEL ${level}!`; flashTimer = 1800;
    score += level * 30;
    sfx.levelComplete();
  }
}

function update(dt) {
  if (state !== 'play') return;
  if (levelTransition > 0) { levelTransition -= dt; return; }

  let params = getLevelParams();

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnEmail();
    spawnTimer = params.interval + (Math.random() - 0.5) * params.interval * 0.4;
  }

  let dir = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) dir -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) dir += 1;
  if (dir !== 0 && dir === moveHoldDir) moveHoldTime += dt;
  else { moveHoldTime = 0; moveHoldDir = dir; }
  // Speed boost: ramps from 1x to 2x over 400ms of continuous hold
  let boost = 1 + Math.min(1, Math.max(0, moveHoldTime - 120) / 400);
  player.x += dir * player.speed * boost;
  player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

  if (keys[' '] && Date.now() - lastShot > shootCooldown) {
    bullets.push({ x: player.x, y: player.y - 18, vy: -9 });
    lastShot = Date.now();
    sfx.throwPlane();
  }

  bullets = bullets.filter(b => { b.y += b.vy; return b.y > -10; });

  if (comboTimer > 0) comboTimer -= dt; else comboCount = 0;
  if (flashTimer > 0) flashTimer -= dt;

  emails.forEach(e => { e.y += e.vy; e.flash = Math.max(0, e.flash - 0.05); });

  // Bullet vs email
  bullets = bullets.filter(b => {
    for (let i = emails.length - 1; i >= 0; i--) {
      let e = emails[i];
      if (Math.abs(b.x - e.x) < e.w / 2 + 2 && Math.abs(b.y - e.y) < e.h / 2 + 2) {
        if (e.vip) {
          lives--;
          score = Math.max(0, score - 100);
          flashMsg = `❌ You destroyed ${e.vipData.name}'s email! -100`; flashTimer = 1500;
          spawnParticles(e.x, e.y, '#ff44ff', 20);
          comboCount = 0;
          sfx.hitVip();
        } else if (e.legit) {
          lives--;
          score = Math.max(0, score - 50);
          flashMsg = '❌ Legit email destroyed! -50'; flashTimer = 1200;
          spawnParticles(e.x, e.y, '#ff4444', 15);
          comboCount = 0;
          sfx.hitLegit();
        } else {
          comboCount++; comboTimer = 2000;
          let pts = 10 * (1 + Math.floor(comboCount / 3));
          score += pts;
          if (comboCount >= 3) { flashMsg = `🔥 Combo x${comboCount}! +${pts}`; flashTimer = 800; }
          spawnParticles(e.x, e.y, '#ff6600', 12);
          sfx.hitSpam();
        }
        advanceLevel();
        emails.splice(i, 1);
        return false;
      }
    }
    return true;
  });

  // Emails reaching bottom / hitting mailman
  emails = emails.filter(e => {
    let hitMailman = e.y >= player.y - 20 && e.y <= player.y + 15 && Math.abs(e.x - player.x) < (player.w / 2 + e.w / 2 - 5);
    let fellPast = e.y > H + 20;

    if (hitMailman) {
      if (e.vip) {
        lives = Math.min(lives + 1, 5);
        score += 50;
        flashMsg = bonusLifeMessages[Math.floor(Math.random() * bonusLifeMessages.length)].replace('{name}', e.vipData.name); flashTimer = 1500;
        spawnParticles(e.x, e.y, '#ffdd44', 20);
      } else if (e.legit) {
        // Legit caught by mailman — delivered
        score += 15;
        spawnParticles(e.x, e.y, '#44ff88', 8);
      } else {
        // Spam hit the mailman — lose life
        lives--;
        flashMsg = '💀 Spam slipped past the mailman!'; flashTimer = 1000;
        spawnParticles(e.x, e.y, '#ff4444', 15);
        comboCount = 0;
        sfx.spamBreached();
      }
      advanceLevel();
      return false;
    }

    if (fellPast) {
      if (e.vip) {
        // Missed VIP — no penalty, just missed opportunity
        flashMsg = `📭 Missed ${e.vipData.name}'s email!`; flashTimer = 1000;
        spawnParticles(e.x, H, '#ffaa44', 8);
      } else if (e.legit) {
        // Legit passed through — that's fine, delivered
        score += 15;
        spawnParticles(e.x, H, '#44ff88', 6);
      } else {
        // Spam passed through — lose life
        lives--;
        flashMsg = '💀 Spam reached inbox!'; flashTimer = 1000;
        spawnParticles(e.x, H, '#ff4444', 12);
        comboCount = 0;
        sfx.spamBreached();
      }
      advanceLevel();
      return false;
    }
    return true;
  });

  particles = particles.filter(p => { p.x += p.vx; p.y += p.vy; p.life -= p.decay; return p.life > 0; });
  mailField.forEach(m => { m.y += m.sp; if (m.y > H + 20) { m.y = -20; m.x = Math.random() * W; } });

  if (lives <= 0) {
    state = 'over'; enteringEmail = true; emailInput = '';
    gameOverMessage = gameOverMessages[Math.floor(Math.random() * gameOverMessages.length)];
    sfx.gameOver();
  }
}

function drawEnvelope(x, y, w, h, color, borderColor, rot) {
  X.save();
  X.translate(x, y);
  X.rotate(rot || 0);
  X.fillStyle = color;
  X.strokeStyle = borderColor;
  X.lineWidth = 2;
  X.beginPath(); X.roundRect(-w/2, -h/2, w, h, 5); X.fill(); X.stroke();
  X.beginPath();
  X.moveTo(-w/2, -h/2);
  X.lineTo(0, h * 0.05);
  X.lineTo(w/2, -h/2);
  X.strokeStyle = borderColor; X.lineWidth = 1.5; X.stroke();
  X.restore();
}

function drawBgEnvelope(x, y, s, rot) {
  let w = 28 * s, h = 18 * s;
  X.save();
  X.translate(x, y);
  X.rotate(rot);
  X.strokeStyle = 'rgba(180,210,255,0.18)';
  X.lineWidth = 1.2;
  X.strokeRect(-w/2, -h/2, w, h);
  X.beginPath();
  X.moveTo(-w/2, -h/2); X.lineTo(0, h * 0.15); X.lineTo(w/2, -h/2);
  X.stroke();
  X.restore();
}

function drawBgAt(x, y, s, phase) {
  X.save();
  X.translate(x, y);
  X.fillStyle = `rgba(170,200,255,${0.12 + Math.sin(phase) * 0.05})`;
  X.font = `${Math.floor(20 * s)}px Courier New`;
  X.textAlign = 'center';
  X.fillText('@', 0, 0);
  X.restore();
}

function drawBgPlane(x, y, s, phase) {
  X.save();
  X.translate(x, y);
  X.rotate(-0.45 + Math.sin(phase) * 0.05);
  X.strokeStyle = 'rgba(190,215,255,0.22)';
  X.lineWidth = 1.3;
  X.lineJoin = 'round';
  const sz = 15 * s;
  X.beginPath();
  X.moveTo(sz, 0);
  X.lineTo(-sz, -sz * 0.5);
  X.lineTo(-sz * 0.25, 0);
  X.lineTo(-sz * 0.6, sz * 0.45);
  X.closePath();
  X.stroke();
  X.beginPath();
  X.moveTo(sz, 0);
  X.lineTo(-sz * 0.25, 0);
  X.stroke();
  X.restore();
}

function drawAirmailBorder() {
  const stripe = 10;
  for (let i = 0; i < W + H; i += stripe * 2) {
    X.fillStyle = 'rgba(210,60,80,0.10)';
    X.fillRect(i, 0, stripe, 6);
    X.fillRect(i - H, H - 6, stripe, 6);
    X.fillStyle = 'rgba(70,110,200,0.10)';
    X.fillRect(i + stripe, 0, stripe, 6);
    X.fillRect(i - H + stripe, H - 6, stripe, 6);
  }
}

function draw() {
  let grad = X.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0e1a3a'); grad.addColorStop(1, '#1a2750');
  X.fillStyle = grad; X.fillRect(0, 0, W, H);

  if (state === 'apikey') {
    const blink = Date.now() % 1000 < 500;
    const keyValid = isValidApiKey(apiKeyInput);
    const fieldX = W/2 - 280;
    const fieldW = 560;
    const keyColor = keyValid ? '#66ff99' : '#ffcc33';

    X.textAlign = 'center';
    X.fillStyle = '#ff6600'; X.font = 'bold 42px Courier New';
    X.fillText('📧 SPAM INVADERS 📧', W/2, 150);

    X.fillStyle = '#aaccff'; X.font = '18px Courier New';
    X.fillText('Enter your booth API key to begin:', W/2, 230);

    X.textAlign = 'left';
    X.fillStyle = keyColor; X.font = 'bold 16px Courier New';
    X.fillText('🔑  BOOTH API KEY', fieldX, 280);
    X.strokeStyle = keyColor;
    X.lineWidth = 2;
    X.strokeRect(fieldX, 290, fieldW, 42);
    X.fillStyle = '#ffffff'; X.font = 'bold 18px Courier New';
    X.fillText(apiKeyInput + (blink ? '▌' : ''), fieldX + 10, 318);

    X.textAlign = 'center';
    if (apiKeyInput.length === 0) {
      X.fillStyle = '#ffaa44'; X.font = 'bold 14px Courier New';
      X.fillText('⚠  Paste or type your key (format: booth_…)', W/2, 360);
    } else if (!keyValid) {
      X.fillStyle = '#ff6666'; X.font = 'bold 14px Courier New';
      X.fillText('⚠  Invalid key format — expected booth_… ', W/2, 360);
    } else {
      X.fillStyle = '#66ff99'; X.font = 'bold 14px Courier New';
      X.fillText('✓  Press ENTER to continue', W/2, 360);
    }
    return;
  }

  X.strokeStyle = 'rgba(255,255,255,0.025)';
  X.lineWidth = 1;
  for (let y = 0; y < H; y += 24) {
    X.beginPath(); X.moveTo(0, y); X.lineTo(W, y); X.stroke();
  }

  drawAirmailBorder();

  mailField.forEach(m => {
    let phase = Date.now() * 0.0008 + m.phase;
    if (m.kind === 'env') drawBgEnvelope(m.x, m.y, m.s, m.rot + Math.sin(phase) * 0.05);
    else if (m.kind === 'at') drawBgAt(m.x, m.y, m.s, phase);
    else drawBgPlane(m.x, m.y, m.s, phase);
  });

  if (state === 'menu') {
    X.textAlign = 'center';
    X.fillStyle = '#ff6600'; X.font = 'bold 48px Courier New';
    X.fillText('📧 SPAM INVADERS 📧', W/2, 130);

    X.fillStyle = '#aaccff'; X.font = '18px Courier New';
    X.fillText('Defend your inbox from spam!', W/2, 185);

    X.fillStyle = '#ff4444'; X.font = '15px Courier New';
    X.fillText('🔫 SHOOT spam emails (dark red) to block them', W/2, 248);
    X.fillStyle = '#44ff44';
    X.fillText('📬 Let legit emails (green) pass through safely', W/2, 278);
    X.fillStyle = '#ffdd44';
    X.fillText('⭐ Catch VIP emails (gold) for extra lives!', W/2, 308);
    X.fillStyle = '#ff8866';
    X.fillText('💀 Spam that gets past the mailman costs a life', W/2, 338);

    X.fillStyle = '#88aaff'; X.font = '14px Courier New';
    X.fillText('← → or A/D to move  |  SPACE to shoot', W/2, 398);

    X.fillStyle = '#fff'; X.font = 'bold 22px Courier New';
    let pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    X.globalAlpha = pulse;
    X.fillText('[ PRESS SPACE TO START ]', W/2, 458);
    X.globalAlpha = 1;

    X.fillStyle = '#ffcc66'; X.font = '16px Courier New';
    X.fillText('[ PRESS L FOR LEADERBOARD ]', W/2, 490);

    // Sample envelopes
    drawEnvelope(W/2 - 200, 530, 72, 42, '#4a2020', '#cc6644', -0.06);
    X.fillStyle = '#ffccaa'; X.font = '8px Courier New'; X.textAlign = 'center';
    X.fillText('🎰 YOU WON $1M!', W/2 - 200, 534);
    X.fillStyle = '#ff6666'; X.font = '10px Courier New';
    X.fillText('SPAM', W/2 - 200, 564);

    drawEnvelope(W/2, 530, 72, 42, '#c8f0d8', '#44cc88', 0);
    X.fillStyle = '#1a5533'; X.font = '8px Courier New';
    X.fillText('📋 Sprint Review', W/2, 534);
    X.fillStyle = '#66ff88'; X.font = '10px Courier New';
    X.fillText('LEGIT', W/2, 564);

    drawEnvelope(W/2 + 200, 530, 72, 42, '#fff3c0', '#ddaa22', 0.06);
    X.fillStyle = '#665500'; X.font = '8px Courier New';
    X.fillText('⭐ From: Nir Zohar', W/2 + 200, 534);
    X.fillStyle = '#ffdd44'; X.font = '10px Courier New';
    X.fillText('VIP', W/2 + 200, 564);

    X.fillStyle = '#555'; X.font = '11px Courier New'; X.textAlign = 'center';
    X.fillText('A Wix Emails Production 🚀', W/2, H - 15);
    return;
  }

  if (state === 'play' || state === 'over') {
    X.fillStyle = 'rgba(100,150,255,0.04)';
    X.fillRect(0, H - 65, W, 65);
    X.strokeStyle = 'rgba(100,150,255,0.15)';
    X.setLineDash([5, 5]);
    X.beginPath(); X.moveTo(0, H - 65); X.lineTo(W, H - 65); X.stroke();
    X.setLineDash([]);

    // Emails
    emails.forEach(e => {
      let bob = Math.sin(Date.now() * 0.003 + e.bobOffset) * 1.5;
      let ey = e.y + bob;

      if (e.vip) {
        // Gold envelope with sparkle
        drawEnvelope(e.x, ey, e.w, e.h, '#fff3c0', '#ddaa22', e.rotation);
        X.shadowColor = '#ffdd44';
        X.shadowBlur = 10 + Math.sin(Date.now() * 0.008) * 5;
        X.fillStyle = 'rgba(255,221,68,0.15)';
        X.beginPath(); X.roundRect(e.x - e.w/2 - 4, ey - e.h/2 - 4, e.w + 8, e.h + 8, 8); X.fill();
        X.shadowBlur = 0;
        X.fillStyle = '#665500';
      } else if (e.legit) {
        drawEnvelope(e.x, ey, e.w, e.h, '#c8f0d8', '#44cc88', e.rotation);
        X.shadowColor = '#44ff88';
        X.shadowBlur = 5 + Math.sin(Date.now() * 0.005) * 2;
        X.fillStyle = 'rgba(68,255,136,0.06)';
        X.beginPath(); X.roundRect(e.x - e.w/2 - 2, ey - e.h/2 - 2, e.w + 4, e.h + 4, 6); X.fill();
        X.shadowBlur = 0;
        X.fillStyle = '#1a5533';
      } else {
        let f = e.flash;
        let r = Math.floor(74 + f * 180), g = Math.floor(32 + f * 100), b2 = Math.floor(32 + f * 80);
        drawEnvelope(e.x, ey, e.w, e.h, `rgb(${r},${g},${b2})`, '#cc6644', e.rotation);
        X.fillStyle = '#ffccaa';
      }
      X.font = '8px Courier New'; X.textAlign = 'center';
      let lbl = e.label.length > 14 ? e.label.slice(0, 14) : e.label;
      X.fillText(lbl, e.x, ey + 4);
    });

    // Bullets
    bullets.forEach(b => {
      X.shadowColor = '#aaccff'; X.shadowBlur = 6;
      X.fillStyle = '#f8fbff';
      X.strokeStyle = '#5a6a80';
      X.lineWidth = 1;
      X.beginPath();
      X.moveTo(b.x, b.y - 7);
      X.lineTo(b.x - 6, b.y + 4);
      X.lineTo(b.x + 6, b.y + 4);
      X.closePath();
      X.fill();
      X.stroke();
      X.strokeStyle = '#c8d4e8';
      X.beginPath();
      X.moveTo(b.x, b.y - 7);
      X.lineTo(b.x, b.y + 2);
      X.stroke();
      X.shadowBlur = 0;
    });

    // Player - Mailman
    const px = player.x, py = player.y;

    // Legs
    X.fillStyle = '#1a2a4a';
    X.fillRect(px - 13, py + 10, 9, 6);
    X.fillRect(px + 4, py + 10, 9, 6);
    // Shoes
    X.fillStyle = '#0a0a0a';
    X.fillRect(px - 14, py + 14, 11, 3);
    X.fillRect(px + 3, py + 14, 11, 3);

    // Body (blue uniform)
    X.fillStyle = '#2a5db8';
    X.beginPath(); X.roundRect(px - 18, py - 4, 36, 16, 3); X.fill();
    X.strokeStyle = '#4a7dd8'; X.lineWidth = 1.5; X.stroke();

    // Arms
    X.fillStyle = '#2a5db8';
    X.fillRect(px - 22, py - 2, 6, 13);
    X.fillRect(px + 16, py - 2, 6, 13);
    // Hands
    X.fillStyle = '#f0c8a0';
    X.beginPath(); X.arc(px - 19, py + 12, 2.5, 0, Math.PI * 2); X.fill();
    X.beginPath(); X.arc(px + 19, py + 12, 2.5, 0, Math.PI * 2); X.fill();

    // Mail bag strap across chest
    X.strokeStyle = '#6b4423'; X.lineWidth = 2;
    X.beginPath();
    X.moveTo(px - 15, py - 5); X.lineTo(px + 18, py + 10);
    X.stroke();

    // Mail satchel
    X.fillStyle = '#a87050';
    X.beginPath(); X.roundRect(px + 14, py + 3, 16, 13, 2); X.fill();
    X.strokeStyle = '#6b4423'; X.lineWidth = 1.5; X.stroke();
    // Envelope peeking out of bag
    X.fillStyle = '#fff';
    X.fillRect(px + 17, py + 6, 8, 6);
    X.strokeStyle = '#888'; X.lineWidth = 0.5; X.strokeRect(px + 17, py + 6, 8, 6);
    X.beginPath();
    X.moveTo(px + 17, py + 6); X.lineTo(px + 21, py + 9); X.lineTo(px + 25, py + 6);
    X.stroke();

    // Chest badge (gold)
    X.fillStyle = '#ffdd44';
    X.fillRect(px - 14, py - 1, 5, 4);
    // Buttons
    X.fillRect(px - 1, py, 2, 2);
    X.fillRect(px - 1, py + 5, 2, 2);

    // Neck
    X.fillStyle = '#f0c8a0';
    X.fillRect(px - 3, py - 8, 6, 5);

    // Head
    X.fillStyle = '#f0c8a0';
    X.beginPath(); X.arc(px, py - 12, 7, 0, Math.PI * 2); X.fill();
    X.strokeStyle = '#b08060'; X.lineWidth = 1; X.stroke();
    // Eyes
    X.fillStyle = '#000';
    X.fillRect(px - 3, py - 13, 1.5, 1.5);
    X.fillRect(px + 1.5, py - 13, 1.5, 1.5);

    // Cap (postal cap)
    X.fillStyle = '#1a3a78';
    X.beginPath(); X.roundRect(px - 10, py - 22, 20, 8, 3); X.fill();
    X.strokeStyle = '#3a5a98'; X.lineWidth = 1.5; X.stroke();
    // Brim
    X.fillStyle = '#0a1a3a';
    X.beginPath(); X.roundRect(px - 12, py - 16, 24, 3, 1); X.fill();
    // Envelope emblem on cap
    X.fillStyle = '#ffdd44';
    X.fillRect(px - 3, py - 20, 6, 4);
    X.strokeStyle = '#8a6a00'; X.lineWidth = 0.5; X.strokeRect(px - 3, py - 20, 6, 4);
    X.beginPath();
    X.moveTo(px - 3, py - 20); X.lineTo(px, py - 18); X.lineTo(px + 3, py - 20);
    X.stroke();

    X.fillStyle = '#aaddff'; X.font = '9px Courier New'; X.textAlign = 'center';
    X.fillText('MAILMAN', px, py + 28);

    // Particles
    particles.forEach(p => {
      X.globalAlpha = p.life; X.fillStyle = p.color;
      X.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
      X.globalAlpha = 1;
    });

    // HUD
    let params = getLevelParams();
    X.textAlign = 'left'; X.fillStyle = '#fff'; X.font = 'bold 18px Courier New';
    X.fillText(`Score: ${score}`, 15, 28);
    X.fillText(`Level: ${level}`, 15, 52);

    let prog = emailsHandled / params.needed;
    X.fillStyle = '#333'; X.fillRect(200, 14, 200, 16);
    X.fillStyle = '#44aaff'; X.fillRect(200, 14, 200 * prog, 16);
    X.strokeStyle = '#66ccff'; X.lineWidth = 1; X.strokeRect(200, 14, 200, 16);
    X.fillStyle = '#fff'; X.font = '11px Courier New'; X.textAlign = 'center';
    X.fillText(`${emailsHandled}/${params.needed}`, 300, 27);

    X.textAlign = 'right'; X.font = '16px serif';
    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += '❤️ ';
    X.fillText(hearts, W - 15, 28);

    if (comboCount >= 3 && comboTimer > 0) {
      X.textAlign = 'center';
      X.fillStyle = `rgba(255,180,0,${Math.min(1, comboTimer / 1000)})`;
      X.font = 'bold 16px Courier New';
      X.fillText(`🔥 COMBO x${comboCount}`, W/2, 75);
    }

    if (flashTimer > 0) {
      X.textAlign = 'center';
      X.globalAlpha = Math.min(1, flashTimer / 300);
      X.fillStyle = '#ffffff'; X.font = 'bold 22px Courier New';
      X.fillText(flashMsg, W/2, H / 2 - 40);
      X.globalAlpha = 1;
    }

    if (levelTransition > 0) {
      X.fillStyle = `rgba(0,0,0,${Math.min(0.5, levelTransition / 2000)})`;
      X.fillRect(0, 0, W, H);
    }
  }

  if (state === 'over') {
    X.fillStyle = 'rgba(0,0,0,0.75)'; X.fillRect(0, 0, W, H);
    X.textAlign = 'center';
    X.fillStyle = '#ff4444'; X.font = 'bold 28px Courier New';
    X.fillText(gameOverMessage, W/2, 170);
    X.fillStyle = '#fff'; X.font = '22px Courier New';
    X.fillText(`Final Score: ${score}`, W/2, 230);
    X.fillText(`Reached Level: ${level}`, W/2, 265);

    if (enteringEmail) {
      const blink = Date.now() % 1000 < 500;
      const emailValid = isValidEmail(emailInput);
      const fieldX = W/2 - 200;
      const fieldW = 400;
      const emailColor = emailValid ? '#66ff99' : '#ffcc33';

      X.textAlign = 'center';
      X.fillStyle = '#aaccff'; X.font = '18px Courier New';
      X.fillText('Save your score to the leaderboard:', W/2, 320);

      X.textAlign = 'left';
      X.fillStyle = emailColor; X.font = 'bold 16px Courier New';
      X.fillText('✱  EMAIL REQUIRED', fieldX, 360);
      X.strokeStyle = emailColor;
      X.lineWidth = 2;
      X.strokeRect(fieldX, 370, fieldW, 40);
      X.fillStyle = '#ffffff'; X.font = 'bold 22px Courier New';
      X.fillText(emailInput + (blink ? '▌' : ''), fieldX + 10, 398);

      X.textAlign = 'center';
      if (emailInput.length === 0) {
        X.fillStyle = '#ffaa44'; X.font = 'bold 14px Courier New';
        X.fillText('⚠  Enter your @wix.com email to save your score', W/2, 432);
      } else if (!emailValid) {
        X.fillStyle = '#ff6666'; X.font = 'bold 14px Courier New';
        X.fillText('⚠  Email must end in @wix.com (e.g. you@wix.com)', W/2, 432);
      } else {
        X.fillStyle = '#66ff99'; X.font = 'bold 14px Courier New';
        X.fillText('✓  Press ENTER to submit', W/2, 432);
      }
    }

    if (submitStatus) {
      X.textAlign = 'center';
      X.font = 'bold 14px Courier New';
      X.fillStyle = submitStatus === 'success' ? '#66ff99'
        : submitStatus === 'error' ? '#ff6666'
        : '#aaccff';
      X.fillText(submitMessage, W/2, H - 40);
    }
  }

  if (state === 'leaderboard') {
    X.fillStyle = 'rgba(0,0,0,0.88)'; X.fillRect(0, 0, W, H);
    X.textAlign = 'center';
    X.fillStyle = '#ffcc00'; X.font = 'bold 36px Courier New';
    X.fillText('🏆 LEADERBOARD 🏆', W/2, 80);

    leaderboard.forEach((entry, i) => {
      let y = 130 + i * 38;
      let medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      X.fillStyle = i < 3 ? '#ffdd66' : '#aaaacc';
      X.font = `${i < 3 ? 'bold ' : ''}18px Courier New`;
      X.textAlign = 'left';
      X.fillText(`${medal} ${(i+1+'').padStart(2)}. ${entry.email.padEnd(28)} ${(entry.score+'').padStart(6)}pts  Lv.${entry.level}`, W/2 - 320, y);
    });

    if (leaderboard.length === 0) {
      X.fillStyle = '#666'; X.textAlign = 'center'; X.font = '18px Courier New';
      X.fillText('No scores yet!', W/2, 200);
    }

    X.textAlign = 'center'; X.fillStyle = '#88aaff'; X.font = '16px Courier New';
    X.fillText('[ PRESS SPACE TO PLAY AGAIN ]', W/2, 540);
  }
}

let lastTime = 0;
function loop(time) {
  let dt = time - lastTime; lastTime = time;
  if (dt > 100) dt = 16;
  update(dt); draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
