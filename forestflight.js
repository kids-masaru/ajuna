(() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const context = canvas.getContext('2d', { alpha: false });
  const startScreen = document.getElementById('start-screen');
  const playScreen = document.getElementById('play-screen');
  const resultScreen = document.getElementById('result-screen');
  const stageFlash = document.getElementById('stage-flash');
  const startButton = document.getElementById('start-btn');
  const againButton = document.getElementById('again-btn');
  const landscapeButton = document.getElementById('landscape-btn');
  const stageDots = [...document.querySelectorAll('.stage-dot')];
  const seedMarks = [...document.querySelectorAll('.seed-mini')];

  const images = {
    scenes: loadImage('forestflight_scenes.png', '背景画像'),
    friends: loadImage('forestflight_characters.png', '森の仲間画像'),
    girl: loadImage('forestflight_girl_motion_v2.png', '女の子の動き画像'),
    top: loadImage('forestflight_spin_v2.png', 'コマの動き画像'),
    effects: loadImage('forestflight_effects_v2.png', '演出画像')
  };

  // 3つの遊びを1本のアニメーションループでつなぎ、画面遷移時の読み込み待ちをなくす。
  const state = {
    width: 960,
    height: 440,
    ratio: 1,
    phase: 'ready',
    phaseTime: 0,
    lastFrame: 0,
    animationId: 0,
    spinValue: 0,
    spinFailures: 0,
    landingFailures: 0,
    outcome: '',
    pointerId: null,
    pointerHeld: false,
    player: { x: 480, y: 250, targetX: 480, targetY: 250, vx: 0, vy: 0, radius: 34 },
    entities: [],
    particles: [],
    collected: 0,
    spawnAt: 0,
    hazardAt: 0,
    shieldUntil: 0,
    topAngle: 0,
    flightProgress: 0,
    landingProgress: 0,
    flashUntil: 0,
    audio: null
  };

  function loadImage(source, label) {
    const image = new Image();
    image.src = source;
    image.addEventListener('error', error => {
      console.warn(`${label}を読み込めませんでした。色と図形でゲームを続けます。`, error);
    });
    return image;
  }

  async function forceLandscape() {
    document.body.classList.add('forced-landscape');
    prepareAudio();
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('全画面表示を開始できないため、画面内で横向きにします。', error);
    }
    try {
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (error) {
      console.warn('端末の向きを固定できないため、画面内で横向きにします。', error);
    }
    setTimeout(resizeCanvas, 350);
  }

  function prepareAudio() {
    if (state.audio) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) state.audio = new AudioContextClass();
    } catch (error) {
      console.warn('効果音を準備できませんでしたが、ゲームは続けられます。', error);
    }
  }

  function playTone(frequency, duration = .18, type = 'sine', volume = .12) {
    if (!state.audio) return;
    try {
      const oscillator = state.audio.createOscillator();
      const gain = state.audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.001, state.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(volume, state.audio.currentTime + .02);
      gain.gain.exponentialRampToValueAtTime(.001, state.audio.currentTime + duration);
      oscillator.connect(gain).connect(state.audio.destination);
      oscillator.start();
      oscillator.stop(state.audio.currentTime + duration + .03);
    } catch (error) {
      console.warn('効果音を鳴らせませんでした。', error);
    }
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = .9;
      utterance.pitch = 1.12;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('読み上げを開始できませんでした。', error);
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    state.ratio = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    canvas.width = Math.round(state.width * state.ratio);
    canvas.height = Math.round(state.height * state.ratio);
    context.setTransform(state.ratio, 0, 0, state.ratio, 0, 0);
    if (state.phase === 'flight') clampPlayer();
  }

  function setHud(step) {
    stageDots.forEach((dot, index) => {
      dot.classList.toggle('done', index < step);
      dot.classList.toggle('now', index === step);
    });
    seedMarks.forEach((mark, index) => mark.classList.toggle('got', index < Math.min(3, state.collected)));
  }

  function showFlash(success) {
    stageFlash.classList.toggle('fail', !success);
    stageFlash.hidden = false;
    state.flashUntil = performance.now() + (success ? 680 : 540);
  }

  function hideFlashWhenReady(now) {
    if (!stageFlash.hidden && now >= state.flashUntil) stageFlash.hidden = true;
  }

  function startGame() {
    prepareAudio();
    if (state.audio && state.audio.state === 'suspended') {
      state.audio.resume().catch(error => console.warn('効果音を再開できませんでした。', error));
    }
    startScreen.hidden = true;
    resultScreen.hidden = true;
    playScreen.hidden = false;
    stageFlash.hidden = true;
    resizeCanvas();
    state.spinFailures = 0;
    state.landingFailures = 0;
    state.collected = 0;
    state.lastFrame = 0;
    beginSpin();
    cancelAnimationFrame(state.animationId);
    state.animationId = requestAnimationFrame(frame);
  }

  function beginSpin() {
    state.phase = 'spin';
    state.phaseTime = 0;
    state.outcome = '';
    state.spinValue = 0;
    state.topAngle = 0;
    setHud(0);
    speak('ひかる ところで タッチ！');
  }

  function spinWindow() {
    // 2回失敗した後は成功帯を広げ、遊びを止めず自然に先へ進めるようにする。
    return state.spinFailures >= 2 ? { start: .18, end: .84 } : { start: .28, end: .76 };
  }

  function judgeSpin() {
    if (state.phase !== 'spin') return;
    const window = spinWindow();
    state.phase = 'spinResult';
    state.phaseTime = 0;
    if (state.spinValue < window.start) state.outcome = 'weak';
    else if (state.spinValue > window.end) state.outcome = 'strong';
    else state.outcome = 'good';

    if (state.outcome === 'good') {
      showFlash(true);
      playTone(620, .2);
      setTimeout(() => playTone(860, .24), 110);
      speak('いい かいてん！');
      return;
    }
    state.spinFailures += 1;
    showFlash(false);
    playTone(state.outcome === 'weak' ? 210 : 160, .28, 'triangle');
    speak(state.outcome === 'weak' ? 'もう いっかい！' : 'おしい！ もう いっかい！');
  }

  function beginTakeoff() {
    state.phase = 'takeoff';
    state.phaseTime = 0;
    state.outcome = '';
    setHud(1);
    speak('そらへ しゅっぱつ！');
  }

  function beginFlight() {
    state.phase = 'flight';
    state.phaseTime = 0;
    state.flightProgress = 0;
    state.entities = [];
    state.particles = [];
    state.spawnAt = .7;
    state.hazardAt = 1.8;
    state.shieldUntil = 0;
    const startX = state.width * .24;
    const startY = state.height * .54;
    Object.assign(state.player, { x: startX, y: startY, targetX: startX, targetY: startY, vx: 0, vy: 0 });
  }

  function beginLanding() {
    state.phase = 'landing';
    state.phaseTime = 0;
    state.landingProgress = 0;
    state.pointerHeld = false;
    state.pointerId = null;
    state.entities = [];
    setHud(2);
    speak('ひかる ところで タッチ！');
  }

  function landingWindow() {
    // 回転と同じ救済を着地にも用意し、失敗の連続で嫌にならない難易度にする。
    return state.landingFailures >= 2 ? .16 : .11;
  }

  function judgeLanding(forcedLate = false) {
    if (state.phase !== 'landing') return;
    const targetProgress = .69;
    const difference = state.landingProgress - targetProgress;
    state.phase = 'landingResult';
    state.phaseTime = 0;
    if (!forcedLate && Math.abs(difference) <= landingWindow()) state.outcome = 'good';
    else state.outcome = difference < 0 ? 'early' : 'late';

    if (state.outcome === 'good') {
      showFlash(true);
      playTone(660, .2);
      setTimeout(() => playTone(940, .3), 130);
      speak('ぴったり！');
      return;
    }
    state.landingFailures += 1;
    showFlash(false);
    playTone(state.outcome === 'early' ? 230 : 170, .28, 'triangle');
    speak('おしい！ もう いっかい！');
  }

  function finishGame() {
    state.phase = 'finished';
    playScreen.hidden = true;
    resultScreen.hidden = false;
    speak('ついた！ もりの なかまが まっていたよ！');
  }

  function update(delta, now) {
    state.phaseTime += delta;
    state.topAngle += delta * (state.phase === 'spin' ? 2 : 12);
    updateParticles(delta);

    if (state.phase === 'spin') {
      // 4歳児が目で追って押せる速さにし、成功帯も十分な幅を持たせる。
      state.spinValue = .5 + Math.sin(state.phaseTime * 2.65 - Math.PI / 2) * .5;
      return;
    }
    if (state.phase === 'spinResult') {
      if (state.outcome === 'good') state.topAngle += delta * 18;
      if (state.phaseTime > (state.outcome === 'good' ? 1.55 : 1.3)) {
        if (state.outcome === 'good') beginTakeoff(); else beginSpin();
      }
      return;
    }
    if (state.phase === 'takeoff') {
      if (state.phaseTime > 2.65) beginFlight();
      return;
    }
    if (state.phase === 'flight') {
      // 約27秒で景色が進むため、以前のゆっくりした待ち時間を作らずテンポを保つ。
      state.flightProgress = Math.min(1, state.phaseTime / 27);
      updatePlayer(delta);
      updateFlightEntities(delta, now);
      if (state.phaseTime >= state.spawnAt) {
        spawnSeed();
        state.spawnAt += 2.7;
      }
      if (state.phaseTime >= state.hazardAt) {
        spawnCloud();
        state.hazardAt += 3.4;
      }
      if (state.flightProgress >= 1) beginLanding();
      return;
    }
    if (state.phase === 'landing') {
      state.landingProgress = Math.min(1.12, state.phaseTime / 3.6);
      if (state.landingProgress >= 1.08) judgeLanding(true);
      return;
    }
    if (state.phase === 'landingResult') {
      // 着地失敗時は飛行をやり直さず、着地場面だけを短く再挑戦できるようにする。
      if (state.outcome === 'good' && state.phaseTime > 2.15) finishGame();
      else if (state.outcome !== 'good' && state.phaseTime > 1.35) beginLanding();
    }
  }

  function updatePlayer(delta) {
    const player = state.player;
    if (state.pointerHeld) {
      const follow = 1 - Math.pow(.00001, delta);
      player.x += (player.targetX - player.x) * follow;
      player.y += (player.targetY - player.y) * follow;
      player.vx = (player.targetX - player.x) * 4;
      player.vy = (player.targetY - player.y) * 4;
    } else {
      player.vx *= Math.pow(.035, delta);
      player.vy *= Math.pow(.035, delta);
      player.x += player.vx * delta;
      player.y += player.vy * delta;
    }
    clampPlayer();
  }

  function clampPlayer() {
    const player = state.player;
    player.x = Math.max(75, Math.min(state.width - 75, player.x));
    player.y = Math.max(92, Math.min(state.height - 75, player.y));
  }

  function spawnSeed() {
    state.entities.push({ type: 'seed', x: state.width + 70, y: state.height * (.2 + Math.random() * .57), vx: -(250 + Math.random() * 40), radius: 24, spin: 0 });
  }

  function spawnCloud() {
    state.entities.push({ type: 'cloud', x: state.width + 100, y: state.height * (.18 + Math.random() * .62), vx: -(215 + Math.random() * 35), radius: 46, phase: Math.random() * 6 });
  }

  function updateFlightEntities(delta, now) {
    state.entities.forEach(entity => {
      entity.x += entity.vx * delta;
      entity.spin = (entity.spin || 0) + delta * 3;
      const hitDistance = state.player.radius + entity.radius * (entity.type === 'seed' ? .66 : .78);
      if (Math.hypot(state.player.x - entity.x, state.player.y - entity.y) < hitDistance) {
        if (entity.type === 'seed') collectSeed(entity);
        else hitCloud(entity, now);
      }
      if (entity.x < -130) entity.dead = true;
    });
    state.entities = state.entities.filter(entity => !entity.dead);
  }

  function collectSeed(entity) {
    entity.dead = true;
    state.collected += 1;
    scatter(entity.x, entity.y, '#ffe369', 16);
    setHud(1);
    playTone(900 + Math.min(state.collected, 6) * 35, .17);
  }

  function hitCloud(entity, now) {
    if (now < state.shieldUntil) return;
    entity.dead = true;
    state.shieldUntil = now + 1700;
    state.player.x = Math.max(80, state.player.x - 80);
    state.player.targetX = state.player.x;
    scatter(state.player.x, state.player.y, '#b9efff', 20);
    playTone(185, .25, 'triangle');
    try {
      if (navigator.vibrate) navigator.vibrate(55);
    } catch (error) {
      console.warn('端末を振動させられませんでしたが、ゲームは続けられます。', error);
    }
  }

  function scatter(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 55 + Math.random() * 130;
      state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .8 + Math.random() * .45, rotation: Math.random() * 6, color });
    }
  }

  function updateParticles(delta) {
    state.particles.forEach(particle => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 55 * delta;
      particle.rotation += delta * 5;
      particle.life -= delta;
    });
    state.particles = state.particles.filter(particle => particle.life > 0);
  }

  function drawBackground(sceneIndex, focalPoint = .52) {
    if (!images.scenes.complete || !images.scenes.naturalWidth) {
      context.fillStyle = sceneIndex === 1 ? '#6597dc' : '#a9e5ef';
      context.fillRect(0, 0, state.width, state.height);
      return;
    }
    const panelWidth = images.scenes.naturalWidth / 3;
    const desiredAspect = state.width / state.height;
    // アトラス境界を少し内側へ寄せ、隣の場面が細く見えるのを防ぐ。
    const safePanelWidth = panelWidth * .94;
    let sourceHeight = Math.min(safePanelWidth / desiredAspect, images.scenes.naturalHeight);
    let sourceWidth = sourceHeight * desiredAspect;
    const sourceX = sceneIndex * panelWidth + (panelWidth - sourceWidth) / 2;
    const sourceY = (images.scenes.naturalHeight - sourceHeight) * focalPoint;
    context.drawImage(images.scenes, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, state.width, state.height);
  }

  function drawCell(image, columns, rows, column, row, centerX, centerY, size, rotation = 0, alpha = 1) {
    if (!image.complete || !image.naturalWidth) return;
    const cellWidth = image.naturalWidth / columns;
    const cellHeight = image.naturalHeight / rows;
    context.save();
    context.globalAlpha = alpha;
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.drawImage(image, column * cellWidth, row * cellHeight, cellWidth, cellHeight, -size / 2, -size / 2, size, size);
    context.restore();
  }

  function drawSpinScene() {
    drawBackground(0, .66);
    const topX = state.width * .53;
    const groundY = state.height * .69;
    const girlSize = Math.min(230, state.height * .58);
    drawCell(images.girl, 3, 3, 2, 0, state.width * .29, groundY - girlSize * .26, girlSize);

    let topColumn = 0;
    let topRow = 0;
    let rotation = state.topAngle;
    if (state.phase === 'spin') topColumn = state.spinValue > .32 ? 1 : 0;
    if (state.phase === 'spinResult') {
      if (state.outcome === 'good') topColumn = 2;
      if (state.outcome === 'weak') { topColumn = Math.floor(state.phaseTime * 7) % 2; topRow = 1; rotation = 0; }
      if (state.outcome === 'strong') { topColumn = 2; topRow = 1; rotation = 0; }
    }
    drawCell(images.top, 3, 2, topColumn, topRow, topX, groundY, Math.min(190, state.height * .46), rotation);
    if (state.phase === 'spin') drawTimingMeter(state.spinValue, spinWindow(), false);
  }

  function drawTimingMeter(value, window, landing) {
    const width = Math.min(state.width * .58, 560);
    const height = Math.max(34, Math.min(52, state.height * .11));
    const x = (state.width - width) / 2;
    const y = state.height - height - 18;
    context.save();
    context.fillStyle = 'rgba(255,255,255,.94)';
    roundRect(x - 9, y - 9, width + 18, height + 18, height * .7);
    context.fill();
    const gradient = context.createLinearGradient(x, 0, x + width, 0);
    gradient.addColorStop(0, '#8ed1ef');
    gradient.addColorStop(window.start, '#8ed1ef');
    gradient.addColorStop(window.start + .01, '#66d48e');
    gradient.addColorStop(window.end - .01, '#66d48e');
    gradient.addColorStop(window.end, '#f6ba61');
    gradient.addColorStop(1, '#ef846d');
    context.fillStyle = gradient;
    roundRect(x, y, width, height, height / 2);
    context.fill();
    const markerX = x + value * width;
    context.fillStyle = '#fff';
    context.shadowColor = 'rgba(43,78,59,.45)';
    context.shadowBlur = 9;
    context.beginPath();
    context.arc(markerX, y + height / 2, height * .43, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = landing ? '#29a9b5' : '#e8872e';
    context.beginPath();
    context.arc(markerX, y + height / 2, height * .24, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function roundRect(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.roundRect(x, y, width, height, safeRadius);
  }

  function drawTakeoff() {
    drawBackground(0, .62);
    const progress = Math.min(1, state.phaseTime / 2.65);
    const topX = state.width * (.53 + progress * .15);
    const topY = state.height * (.69 - Math.max(0, progress - .52) * .76);
    drawCell(images.top, 3, 2, 2, 0, topX, topY, Math.min(180, state.height * .44), state.topAngle);

    const girlSize = Math.min(230, state.height * .58);
    let girlColumn = Math.floor(state.phaseTime * 8) % 2;
    let girlRow = 0;
    let girlX = state.width * (.23 + Math.min(progress / .55, 1) * .26);
    let girlY = state.height * .56;
    if (progress > .5 && progress <= .68) { girlColumn = 2; girlRow = 0; }
    if (progress > .68) {
      girlColumn = progress < .82 ? 0 : 1;
      girlRow = 1;
      const jump = Math.sin(Math.min(1, (progress - .68) / .32) * Math.PI);
      girlX = state.width * (.49 + (progress - .68) * .58);
      girlY = state.height * (.5 - jump * .23);
    }
    drawCell(images.girl, 3, 3, girlColumn, girlRow, girlX, girlY, girlSize, 0);
    if (progress > .72) drawSpeedLines(.4 + progress * .5);
  }

  function drawFlight(now) {
    const scene = state.flightProgress < .55 ? 1 : 2;
    drawBackground(scene, scene === 1 ? .5 : .58);
    drawParallax();
    drawSpeedLines(.75 + state.flightProgress * .25);
    state.entities.forEach(entity => entity.type === 'seed' ? drawSeed(entity) : drawCloud(entity));
    drawFlyingPlayer(now);
  }

  function drawParallax() {
    context.save();
    for (let index = 0; index < 5; index += 1) {
      const x = ((index * 240 - state.phaseTime * (80 + index * 9)) % (state.width + 300)) + 120;
      const y = 55 + (index % 3) * state.height * .27;
      context.fillStyle = `rgba(255,255,255,${.08 + index * .018})`;
      context.beginPath();
      context.ellipse(x, y, 105, 22, -.08, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawSpeedLines(strength) {
    context.save();
    context.lineCap = 'round';
    for (let index = 0; index < 18; index += 1) {
      const seed = (index * 83.17) % 997;
      const x = (state.width + 190 - ((state.phaseTime * (430 + seed % 160) + seed * 13) % (state.width + 300)));
      const y = 25 + ((seed * 7) % Math.max(40, state.height - 50));
      const length = 38 + seed % 95;
      context.strokeStyle = `rgba(255,255,255,${.16 + (seed % 20) / 100})`;
      context.lineWidth = 2 + (seed % 4);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + length * strength, y);
      context.stroke();
    }
    context.restore();
  }

  function drawFlyingPlayer(now) {
    const player = state.player;
    const bob = Math.sin(now / 110) * 4;
    const tilt = Math.max(-.12, Math.min(.12, (player.targetY - player.y) / 260));
    const topSize = Math.min(165, state.height * .38);
    const girlSize = Math.min(220, state.height * .54);
    const girlFrame = player.targetY < player.y - 9 ? 2 : player.targetY > player.y + 9 ? 0 : 1;
    if (now < state.shieldUntil) {
      context.save();
      context.strokeStyle = 'rgba(183,249,255,.92)';
      context.lineWidth = 7;
      context.shadowColor = '#c6fbff';
      context.shadowBlur = 20;
      context.beginPath();
      context.arc(player.x, player.y, girlSize * .34 + Math.sin(now / 80) * 4, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
    // 女の子とコマを別々に描き、コマだけを高速回転させても女の子が回らないようにする。
    drawCell(images.top, 3, 2, 2, 0, player.x, player.y + topSize * .23 + bob, topSize, state.topAngle);
    drawCell(images.girl, 3, 3, girlFrame, 1, player.x, player.y - girlSize * .12 + bob, girlSize, tilt);
  }

  function drawLanding() {
    drawBackground(2, .67);
    const targetX = state.width * .68;
    const groundY = state.height * .72;
    const targetSize = Math.min(180, state.height * .45) * (1 + Math.sin(state.phaseTime * 5) * .05);
    drawCell(images.effects, 3, 2, 2, 1, targetX, groundY, targetSize, 0, .92);

    const topX = state.width * (.08 + state.landingProgress * .87);
    const arc = Math.sin(Math.min(1, state.landingProgress) * Math.PI);
    const topY = groundY - 28 - arc * state.height * .44;
    const topSize = Math.min(160, state.height * .39);
    const girlSize = Math.min(215, state.height * .53);
    drawCell(images.top, 3, 2, 2, 0, topX, topY + topSize * .18, topSize, state.topAngle);
    drawCell(images.girl, 3, 3, state.landingProgress < .69 ? 2 : 0, 1, topX, topY - girlSize * .16, girlSize, 0);
    const windowSize = landingWindow();
    drawTimingMeter(state.landingProgress, { start: .69 - windowSize, end: .69 + windowSize }, true);
  }

  function drawLandingResult() {
    drawBackground(2, .67);
    const targetX = state.width * .68;
    const groundY = state.height * .72;
    const topSize = Math.min(175, state.height * .43);
    const girlSize = Math.min(230, state.height * .58);
    if (state.outcome === 'good') {
      drawCell(images.effects, 3, 2, 0, 0, targetX, groundY - 24, Math.min(240, state.height * .62), state.phaseTime * .4, .9);
      drawCell(images.top, 3, 2, 1, 0, targetX, groundY, topSize, state.topAngle * Math.max(0, 1 - state.phaseTime / 2));
      const frame = state.phaseTime < 1.1 ? 1 : 2;
      drawCell(images.girl, 3, 3, frame, 2, targetX, groundY - girlSize * .27, girlSize);
      return;
    }
    const early = state.outcome === 'early';
    const x = targetX + (early ? -state.width * .17 : state.width * .16);
    if (!early) drawCell(images.effects, 3, 2, 1, 1, x, groundY, Math.min(210, state.height * .53), 0, .9);
    drawCell(images.top, 3, 2, early ? Math.floor(state.phaseTime * 7) % 2 : 2, 1, x, groundY, topSize);
    drawCell(images.girl, 3, 3, 1, 2, x - (early ? 25 : -20), groundY - girlSize * .25, girlSize, early ? -.08 : .08);
  }

  function drawSeed(entity) {
    drawCell(images.friends, 3, 2, 2, 0, entity.x, entity.y, 72, Math.sin(entity.spin) * .14);
  }

  function drawCloud(entity) {
    context.save();
    context.translate(entity.x, entity.y + Math.sin(state.phaseTime * 2 + entity.phase) * 5);
    context.fillStyle = 'rgba(247,252,255,.91)';
    context.shadowColor = 'rgba(57,80,118,.18)';
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(-34, 8, entity.radius * .55, 0, Math.PI * 2);
    context.arc(0, -7, entity.radius * .78, 0, Math.PI * 2);
    context.arc(38, 9, entity.radius * .58, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawParticles() {
    state.particles.forEach(particle => {
      context.save();
      context.globalAlpha = Math.min(1, particle.life * 1.6);
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      context.beginPath();
      context.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  function drawScene(now) {
    if (state.phase === 'spin' || state.phase === 'spinResult') drawSpinScene();
    else if (state.phase === 'takeoff') drawTakeoff();
    else if (state.phase === 'flight') drawFlight(now);
    else if (state.phase === 'landing') drawLanding();
    else if (state.phase === 'landingResult') drawLandingResult();
    drawParticles();
  }

  function frame(now) {
    const delta = state.lastFrame ? Math.min(.034, (now - state.lastFrame) / 1000) : 0;
    state.lastFrame = now;
    hideFlashWhenReady(now);
    update(delta, now);
    drawScene(now);
    if (state.phase !== 'finished') state.animationId = requestAnimationFrame(frame);
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * state.width / rect.width,
      y: (event.clientY - rect.top) * state.height / rect.height
    };
  }

  function pointerStart(event) {
    if (!['spin', 'flight', 'landing'].includes(state.phase)) return;
    event.preventDefault();
    prepareAudio();
    if (state.phase === 'spin') { judgeSpin(); return; }
    if (state.phase === 'landing') { judgeLanding(); return; }
    state.pointerId = event.pointerId;
    state.pointerHeld = true;
    const point = pointerPosition(event);
    state.player.targetX = point.x;
    state.player.targetY = point.y;
    // 押した瞬間から指の位置へ合わせ、幼児の速い操作でもキャラクターを置き去りにしない。
    state.player.x = point.x;
    state.player.y = point.y;
    clampPlayer();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      console.warn('指の追跡を固定できないため、通常操作で続けます。', error);
    }
  }

  function pointerMove(event) {
    if (!state.pointerHeld || event.pointerId !== state.pointerId || state.phase !== 'flight') return;
    event.preventDefault();
    const point = pointerPosition(event);
    state.player.targetX = point.x;
    state.player.targetY = point.y;
    // 補間ではなく指の座標を直接使い、「触っている場所についてくる」感触を優先する。
    state.player.x = point.x;
    state.player.y = point.y;
    clampPlayer();
  }

  function pointerEnd(event) {
    if (state.pointerId !== null && event.pointerId !== state.pointerId) return;
    if (event) event.preventDefault();
    state.pointerHeld = false;
    state.pointerId = null;
  }

  landscapeButton.addEventListener('click', forceLandscape);
  startButton.addEventListener('click', startGame);
  againButton.addEventListener('click', startGame);
  canvas.addEventListener('pointerdown', pointerStart);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('lostpointercapture', pointerEnd);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.pointerHeld = false;
      state.pointerId = null;
    }
    state.lastFrame = 0;
  });
})();
