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
  const friendButtons = [...document.querySelectorAll('.friend-face')];

  const images = {
    scenes: loadImage('forestflight_scenes.png', '背景画像'),
    friends: loadImage('forestflight_characters.png', '森の仲間画像'),
    friendStrip: loadImage('forestflight_friends_v2.png', '森の仲間専用画像'),
    girl: loadImage('forestflight_girl_motion_v2.png', '女の子の動き画像'),
    top: loadImage('forestflight_spin_v2.png', 'コマの動き画像'),
    topSpin: loadImage('forestflight_spin_horizontal_v3.png', 'コマの横回転画像'),
    effects: loadImage('forestflight_effects_v2.png', '演出画像')
  };

  // 飛行の進行に合わせ、森の仲間を1匹ずつ見つけられるようにする。
  const FRIEND_PLAN = [
    { at: .16, column: 0, y: .28, label: 'りすさん' },
    { at: .42, column: 1, y: .68, label: 'とりさん' },
    { at: .67, column: 2, y: .26, label: 'うさぎさん' }
  ];
  // 生成素材は鳥の翼幅が広いため、等分ではなく各キャラクターの実際の範囲を切り出す。
  const FRIEND_CROPS = [
    { x: 0, width: .32 },
    { x: .32, width: .41 },
    { x: .73, width: .27 }
  ];

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
    friendIndex: 0,
    shieldUntil: 0,
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
    state.friendIndex = 0;
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
    updateParticles(delta);

    if (state.phase === 'spin') {
      // 4歳児が目で追って押せる速さにし、成功帯も十分な幅を持たせる。
      state.spinValue = .5 + Math.sin(state.phaseTime * 2.65 - Math.PI / 2) * .5;
      return;
    }
    if (state.phase === 'spinResult') {
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
      while (state.friendIndex < FRIEND_PLAN.length && state.flightProgress >= FRIEND_PLAN[state.friendIndex].at) {
        spawnFriend(FRIEND_PLAN[state.friendIndex]);
        state.friendIndex += 1;
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
      // 指へ瞬間移動せず、少し遅れて追いつくことで飛んでいる重さと勢いを見せる。
      const follow = 1 - Math.pow(.001, delta);
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

  function spawnFriend(plan) {
    state.entities.push({
      type: 'friend',
      x: state.width + 90,
      y: state.height * plan.y,
      vx: -(92 + plan.column * 7),
      radius: 48,
      phase: Math.random() * 6,
      column: plan.column,
      label: plan.label,
      popUntil: 0
    });
  }

  function updateFlightEntities(delta, now) {
    state.entities.forEach(entity => {
      entity.x += entity.vx * delta;
      entity.spin = (entity.spin || 0) + delta * 3;
      if (entity.type === 'friend') {
        if (entity.x < -130) entity.dead = true;
        return;
      }
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

  function drawBackground(sceneIndex, focalPoint = .52, cropScale = .94, horizontalPan = 0) {
    if (!images.scenes.complete || !images.scenes.naturalWidth) {
      context.fillStyle = sceneIndex === 1 ? '#6597dc' : '#a9e5ef';
      context.fillRect(0, 0, state.width, state.height);
      return;
    }
    const panelWidth = images.scenes.naturalWidth / 3;
    const desiredAspect = state.width / state.height;
    // アトラス境界を少し内側へ寄せ、隣の場面が細く見えるのを防ぐ。
    const safePanelWidth = panelWidth * cropScale;
    let sourceHeight = Math.min(safePanelWidth / desiredAspect, images.scenes.naturalHeight);
    let sourceWidth = sourceHeight * desiredAspect;
    const horizontalRoom = Math.max(0, panelWidth - sourceWidth);
    const safePan = Math.max(-1, Math.min(1, horizontalPan));
    // パネルの範囲内で切り取り位置を動かし、背景自体が横へ流れるように見せる。
    const sourceX = sceneIndex * panelWidth + horizontalRoom / 2 + horizontalRoom / 2 * safePan;
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

  function drawHorizontalSpinTop(centerX, centerY, size, framesPerSecond = 11, alpha = 1) {
    // 画像全体を傾けず、6枚の周方向差分を切り替えて本物のコマらしい横回転に見せる。
    if (!images.topSpin.complete || !images.topSpin.naturalWidth) {
      // 新素材だけが読めない場合も、旧素材の直立コマを表示して遊びを続けられるようにする。
      drawCell(images.top, 3, 2, 2, 0, centerX, centerY, size, 0, alpha);
      return;
    }
    const frameIndex = Math.floor(performance.now() * framesPerSecond / 1000) % 6;
    drawCell(images.topSpin, 3, 2, frameIndex % 3, Math.floor(frameIndex / 3), centerX, centerY, size, 0, alpha);
  }

  function drawSpinScene() {
    drawBackground(0, .66);
    const topX = state.width * .53;
    const groundY = state.height * .69;
    const girlSize = Math.min(230, state.height * .58);
    drawCell(images.girl, 3, 3, 2, 0, state.width * .29, groundY - girlSize * .26, girlSize);

    const topSize = Math.min(190, state.height * .46);
    if (state.phase === 'spinResult' && state.outcome === 'good') {
      drawHorizontalSpinTop(topX, groundY, topSize, 10);
    } else {
      let topColumn = 0;
      let topRow = 0;
      if (state.phase === 'spinResult' && state.outcome === 'weak') { topColumn = Math.floor(state.phaseTime * 7) % 2; topRow = 1; }
      if (state.phase === 'spinResult' && state.outcome === 'strong') { topColumn = 2; topRow = 1; }
      drawCell(images.top, 3, 2, topColumn, topRow, topX, groundY, topSize);
    }
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
    drawHorizontalSpinTop(topX, topY, Math.min(180, state.height * .44), 11);

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
    if (scene === 1) {
      drawBackground(1, .5);
    } else {
      const treeApproach = Math.min(1, Math.max(0, (state.flightProgress - .55) / .45));
      // 木のうろの場面は、横流れと接近ズームを同時に進めて飛行感を出す。
      drawBackground(2, .58 + treeApproach * .04, .94 - treeApproach * .1, -.5 + treeApproach * .8);
    }
    drawParallax();
    drawSpeedLines(.75 + state.flightProgress * .25);
    state.entities.forEach(entity => {
      if (entity.type === 'seed') drawSeed(entity);
      else if (entity.type === 'friend') drawFriend(entity, now);
      else drawCloud(entity);
    });
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
    // 女の子とコマを別々に描き、コマだけを横回転させても女の子が回らないようにする。
    drawHorizontalSpinTop(player.x, player.y + topSize * .23 + bob, topSize, 12);
    drawCell(images.girl, 3, 3, girlFrame, 1, player.x, player.y - girlSize * .12 + bob, girlSize, tilt);
  }

  function drawLanding() {
    const approach = Math.min(1, Math.max(0, state.landingProgress));
    // 飛行シーンの最終位置から連続して、木のうろへ近づいていく。
    drawBackground(2, .62 + approach * .04, .84 - approach * .1, .3 + approach * .5);
    const targetX = state.width * .68;
    const groundY = state.height * .72;
    const targetSize = Math.min(180, state.height * .45) * (1 + Math.sin(state.phaseTime * 5) * .05);
    drawCell(images.effects, 3, 2, 2, 1, targetX, groundY, targetSize, 0, .92);

    const topX = state.width * (.08 + state.landingProgress * .87);
    const arc = Math.sin(Math.min(1, state.landingProgress) * Math.PI);
    const topY = groundY - 28 - arc * state.height * .44;
    const topSize = Math.min(160, state.height * .39);
    const girlSize = Math.min(215, state.height * .53);
    drawHorizontalSpinTop(topX, topY + topSize * .18, topSize, 11);
    drawCell(images.girl, 3, 3, state.landingProgress < .69 ? 2 : 0, 1, topX, topY - girlSize * .16, girlSize, 0);
    const windowSize = landingWindow();
    drawTimingMeter(state.landingProgress, { start: .69 - windowSize, end: .69 + windowSize }, true);
  }

  function drawLandingResult() {
    drawBackground(2, .66, .74, .8);
    const targetX = state.width * .68;
    const groundY = state.height * .72;
    const topSize = Math.min(175, state.height * .43);
    const girlSize = Math.min(230, state.height * .58);
    if (state.outcome === 'good') {
      drawCell(images.effects, 3, 2, 0, 0, targetX, groundY - 24, Math.min(240, state.height * .62), state.phaseTime * .4, .9);
      if (state.phaseTime < 1.2) drawHorizontalSpinTop(targetX, groundY, topSize, Math.max(2, 10 - state.phaseTime * 6));
      else drawCell(images.top, 3, 2, 0, 0, targetX, groundY, topSize);
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

  function drawFriend(entity, now) {
    const bob = Math.sin(state.phaseTime * 3 + entity.phase) * 8;
    const popProgress = Math.max(0, (entity.popUntil - now) / 680);
    const popScale = 1 + Math.sin(popProgress * Math.PI) * .48;
    const baseSize = entity.column === 1 ? 118 : 108;
    if (popProgress > 0) {
      context.save();
      context.globalAlpha = popProgress * .65;
      context.fillStyle = '#fff3a5';
      context.beginPath();
      context.arc(entity.x, entity.y + bob, baseSize * .52 * popScale, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    drawFriendSprite(entity.column, entity.x, entity.y + bob, baseSize * popScale, Math.sin(state.phaseTime * 2 + entity.phase) * .045);
  }

  function drawFriendSprite(column, centerX, centerY, height, rotation) {
    if (!images.friendStrip.complete || !images.friendStrip.naturalWidth) return;
    const crop = FRIEND_CROPS[column];
    const sourceX = images.friendStrip.naturalWidth * crop.x;
    const sourceWidth = images.friendStrip.naturalWidth * crop.width;
    const destinationWidth = height * sourceWidth / images.friendStrip.naturalHeight;
    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.drawImage(images.friendStrip, sourceX, 0, sourceWidth, images.friendStrip.naturalHeight, -destinationWidth / 2, -height / 2, destinationWidth, height);
    context.restore();
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
    const point = pointerPosition(event);
    if (popFriendAt(point, performance.now())) return;
    state.pointerId = event.pointerId;
    state.pointerHeld = true;
    state.player.targetX = point.x;
    state.player.targetY = point.y;
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
  }

  function pointerEnd(event) {
    if (state.pointerId !== null && event.pointerId !== state.pointerId) return;
    if (event) event.preventDefault();
    state.pointerHeld = false;
    state.pointerId = null;
  }

  function popFriendAt(point, now) {
    const friend = state.entities.find(entity => entity.type === 'friend' && Math.hypot(point.x - entity.x, point.y - entity.y) <= entity.radius * 1.45);
    if (!friend) return false;
    friend.popUntil = now + 680;
    scatter(friend.x, friend.y, '#fff08a', 12);
    playTone(760 + friend.column * 120, .2);
    speak(friend.label);
    return true;
  }

  landscapeButton.addEventListener('click', forceLandscape);
  startButton.addEventListener('click', startGame);
  againButton.addEventListener('click', startGame);
  friendButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      prepareAudio();
      button.classList.remove('popped');
      // 連続でタップしても、毎回大きく弾む反応を再生する。
      void button.offsetWidth;
      button.classList.add('popped');
      playTone(760 + index * 120, .2);
      speak(['りすさん', 'とりさん', 'うさぎさん'][index]);
    });
  });
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
