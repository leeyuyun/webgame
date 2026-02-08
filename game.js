(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const PLAYER_LEVELS = [
    { level: 1, unlockScore: 0, label: "SINGLE" },
    { level: 2, unlockScore: 700, label: "DUAL" },
    { level: 3, unlockScore: 1700, label: "TRIPLE" },
    { level: 4, unlockScore: 3200, label: "ACE WING" },
  ];
  const ENEMY_LEVELS = [
    { level: 1, unlockScore: 0, label: "SCOUT SWARM" },
    { level: 2, unlockScore: 1100, label: "INTERCEPT WING" },
    { level: 3, unlockScore: 2500, label: "SIEGE FLEET" },
    { level: 4, unlockScore: 4000, label: "METEOR STORM" },
  ];
  const WIN_SCORE = 5600;

  const state = {
    mode: "start",
    width: canvas.width,
    height: canvas.height,
    time: 0,
    score: 0,
    lives: 5,
    elapsed: 0,
    spawnTimer: 0,
    shotCooldown: 0,
    level: 1,
    weaponLabel: PLAYER_LEVELS[0].label,
    nextUpgradeScore: PLAYER_LEVELS[1].unlockScore,
    enemyLevel: 1,
    enemyLabel: ENEMY_LEVELS[0].label,
    nextEnemyUpgradeScore: ENEMY_LEVELS[1].unlockScore,
    upgradeFlashTimer: 0,
    enemyUpgradeFlashTimer: 0,
    keys: new Set(),
    player: {
      x: canvas.width / 2,
      y: canvas.height - 80,
      w: 34,
      h: 34,
      speed: 390,
      invulnTimer: 0,
    },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    stars: [],
  };

  for (let i = 0; i < 80; i += 1) {
    state.stars.push({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      speed: 20 + Math.random() * 55,
      size: 1 + Math.random() * 2,
    });
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
  }

  function pickWeighted(weightedItems) {
    const total = weightedItems.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of weightedItems) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.value;
      }
    }
    return weightedItems[weightedItems.length - 1].value;
  }

  function getTierByScore(levelRows, score) {
    let active = levelRows[0];
    for (const row of levelRows) {
      if (score >= row.unlockScore) {
        active = row;
      }
    }
    return active;
  }

  function getNextTarget(levelRows, score, fallback) {
    for (const row of levelRows) {
      if (score < row.unlockScore) {
        return row.unlockScore;
      }
    }
    return fallback;
  }

  function weaponProfile(level) {
    if (level === 1) {
      return {
        cooldown: 0.17,
        speed: 620,
        pattern: [{ offsetX: 0, angle: 0 }],
      };
    }
    if (level === 2) {
      return {
        cooldown: 0.14,
        speed: 680,
        pattern: [
          { offsetX: -12, angle: -0.02 },
          { offsetX: 12, angle: 0.02 },
        ],
      };
    }
    if (level === 3) {
      return {
        cooldown: 0.12,
        speed: 730,
        pattern: [
          { offsetX: -16, angle: -0.13 },
          { offsetX: 0, angle: 0 },
          { offsetX: 16, angle: 0.13 },
        ],
      };
    }
    return {
      cooldown: 0.1,
      speed: 760,
      pattern: [
        { offsetX: -28, angle: -0.18 },
        { offsetX: -8, angle: -0.05 },
        { offsetX: 8, angle: 0.05 },
        { offsetX: 28, angle: 0.18 },
      ],
    };
  }

  function enemyArchetype(enemyLevel) {
    if (enemyLevel === 1) {
      return pickWeighted([{ value: "drone", weight: 1 }]);
    }
    if (enemyLevel === 2) {
      return pickWeighted([
        { value: "drone", weight: 0.5 },
        { value: "interceptor", weight: 0.5 },
      ]);
    }
    if (enemyLevel === 3) {
      return pickWeighted([
        { value: "drone", weight: 0.25 },
        { value: "interceptor", weight: 0.45 },
        { value: "gunship", weight: 0.3 },
      ]);
    }
    return pickWeighted([
      { value: "interceptor", weight: 0.3 },
      { value: "gunship", weight: 0.35 },
      { value: "meteor", weight: 0.35 },
    ]);
  }

  function spawnEnemyByType(type) {
    const x = 28 + Math.random() * (state.width - 56);
    const base = {
      x,
      y: -34,
      seed: Math.random() * 1000,
      drift: 0,
      shootTimer: 0,
      canShoot: false,
      bulletSpeed: 0,
      splitOnDeath: false,
    };

    if (type === "interceptor") {
      return {
        ...base,
        type,
        r: randRange(18, 25),
        hp: randInt(1, 2 + (state.enemyLevel >= 4 ? 1 : 0)),
        speed: randRange(130, 200) * (1 + state.elapsed * 0.0015),
        drift: randRange(90, 160) * (Math.random() < 0.5 ? -1 : 1),
        reward: 145,
      };
    }
    if (type === "gunship") {
      return {
        ...base,
        type,
        r: randRange(28, 35),
        hp: randInt(3, 4 + (state.enemyLevel >= 4 ? 1 : 0)),
        speed: randRange(85, 130) * (1 + state.elapsed * 0.0012),
        drift: randRange(25, 55) * (Math.random() < 0.5 ? -1 : 1),
        reward: 235,
        canShoot: true,
        bulletSpeed: randRange(240, 305),
        shootTimer: randRange(0.8, 1.8),
      };
    }
    if (type === "meteor") {
      return {
        ...base,
        type,
        r: randRange(30, 44),
        hp: randInt(4, 6),
        speed: randRange(75, 125) * (1 + state.elapsed * 0.0011),
        drift: randRange(12, 32) * (Math.random() < 0.5 ? -1 : 1),
        reward: 290,
        splitOnDeath: true,
      };
    }
    return {
      ...base,
      type: "drone",
      r: randRange(20, 31),
      hp: randInt(1, 1 + (state.enemyLevel >= 3 ? 1 : 0)),
      speed: randRange(80, 158) * (1 + state.elapsed * 0.0015),
      drift: randRange(35, 90) * (Math.random() < 0.5 ? -1 : 1),
      reward: 125,
    };
  }

  function resetGame() {
    state.mode = "playing";
    state.time = 0;
    state.score = 0;
    state.lives = 5;
    state.elapsed = 0;
    state.spawnTimer = 0;
    state.shotCooldown = 0;
    state.level = 1;
    state.weaponLabel = PLAYER_LEVELS[0].label;
    state.nextUpgradeScore = PLAYER_LEVELS[1].unlockScore;
    state.enemyLevel = 1;
    state.enemyLabel = ENEMY_LEVELS[0].label;
    state.nextEnemyUpgradeScore = ENEMY_LEVELS[1].unlockScore;
    state.upgradeFlashTimer = 0;
    state.enemyUpgradeFlashTimer = 0;
    state.player.x = state.width / 2;
    state.player.y = state.height - 80;
    state.player.invulnTimer = 0;
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
  }

  function refreshProgression() {
    const nextPlayer = getTierByScore(PLAYER_LEVELS, state.score);
    if (nextPlayer.level > state.level) {
      state.level = nextPlayer.level;
      state.weaponLabel = nextPlayer.label;
      state.upgradeFlashTimer = 2.2;
    }
    state.nextUpgradeScore = getNextTarget(PLAYER_LEVELS, state.score, WIN_SCORE);

    const nextEnemy = getTierByScore(ENEMY_LEVELS, state.score);
    if (nextEnemy.level > state.enemyLevel) {
      state.enemyLevel = nextEnemy.level;
      state.enemyLabel = nextEnemy.label;
      state.enemyUpgradeFlashTimer = 2.2;
    }
    state.nextEnemyUpgradeScore = getNextTarget(ENEMY_LEVELS, state.score, WIN_SCORE);

    if (state.score >= WIN_SCORE) {
      state.mode = "victory";
    }
  }

  function spawnEnemy() {
    const type = enemyArchetype(state.enemyLevel);
    const enemy = spawnEnemyByType(type);
    state.enemies.push(enemy);
  }

  function fire() {
    if (state.shotCooldown > 0 || state.mode !== "playing") {
      return;
    }
    const profile = weaponProfile(state.level);
    state.shotCooldown = profile.cooldown;
    for (const shot of profile.pattern) {
      const vx = Math.sin(shot.angle) * profile.speed;
      const vy = -Math.cos(shot.angle) * profile.speed;
      state.bullets.push({
        x: state.player.x + shot.offsetX,
        y: state.player.y - 18,
        vx,
        vy,
        r: 4,
      });
    }
  }

  function updateStars(dt) {
    for (const s of state.stars) {
      s.y += s.speed * dt;
      if (s.y > state.height + 4) {
        s.y = -4;
        s.x = Math.random() * state.width;
      }
    }
  }

  function nearestEnemyDeltaX() {
    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const e of state.enemies) {
      if (e.y > state.player.y + 100) {
        continue;
      }
      const dx = e.x - state.player.x;
      const dy = e.y - state.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        best = dx;
      }
    }
    return best;
  }

  function pursuitBoost(horizontal) {
    const dx = nearestEnemyDeltaX();
    if (dx === null || horizontal === 0) {
      return 0;
    }
    if (Math.sign(dx) !== Math.sign(horizontal)) {
      return 0;
    }
    const distance = Math.abs(dx);
    if (distance < 24) {
      return 0;
    }
    return Math.min(280, distance * 0.8);
  }

  function spawnEnemyShot(enemy) {
    const dx = state.player.x - enemy.x;
    const dy = Math.max(50, state.player.y - enemy.y);
    const len = Math.max(1, Math.hypot(dx, dy));
    const spread = state.enemyLevel >= 4 ? 2 : 1;
    for (let i = 0; i < spread; i += 1) {
      const bias = spread === 1 ? 0 : (i === 0 ? -0.12 : 0.12);
      const nx = dx / len + bias;
      const ny = dy / len;
      const nlen = Math.max(1, Math.hypot(nx, ny));
      state.enemyBullets.push({
        x: enemy.x,
        y: enemy.y + enemy.r * 0.2,
        vx: (nx / nlen) * enemy.bulletSpeed * 0.65,
        vy: (ny / nlen) * enemy.bulletSpeed,
        r: spread === 1 ? 4 : 3.5,
      });
    }
  }

  function spawnMeteorShards(x, y) {
    const shardCount = 2;
    for (let i = 0; i < shardCount; i += 1) {
      state.enemies.push({
        x: x + (i === 0 ? -16 : 16),
        y,
        seed: Math.random() * 1000,
        drift: randRange(100, 160) * (i === 0 ? -1 : 1),
        shootTimer: 0,
        canShoot: false,
        bulletSpeed: 0,
        splitOnDeath: false,
        type: "interceptor",
        r: randRange(14, 18),
        hp: 1,
        speed: randRange(160, 210),
        reward: 90,
      });
    }
  }

  function loseLife() {
    if (state.player.invulnTimer > 0) {
      return;
    }
    state.lives -= 1;
    state.player.invulnTimer = 1.25;
    if (state.lives <= 0) {
      state.mode = "gameover";
    }
  }

  function updatePlaying(dt) {
    state.elapsed += dt;
    state.shotCooldown = Math.max(0, state.shotCooldown - dt);
    state.upgradeFlashTimer = Math.max(0, state.upgradeFlashTimer - dt);
    state.enemyUpgradeFlashTimer = Math.max(0, state.enemyUpgradeFlashTimer - dt);
    state.player.invulnTimer = Math.max(0, state.player.invulnTimer - dt);

    const horizontal = (state.keys.has("ArrowRight") || state.keys.has("d") ? 1 : 0) -
      (state.keys.has("ArrowLeft") || state.keys.has("a") ? 1 : 0);
    const vertical = (state.keys.has("ArrowDown") || state.keys.has("s") ? 1 : 0) -
      (state.keys.has("ArrowUp") || state.keys.has("w") ? 1 : 0);
    const manualBoost = state.keys.has("Shift") ? 120 : 0;
    const chaseBoost = pursuitBoost(horizontal);
    const horizontalSpeed = state.player.speed + manualBoost + chaseBoost;

    state.player.x += horizontal * horizontalSpeed * dt;
    state.player.y += vertical * (state.player.speed + manualBoost) * dt;
    state.player.x = Math.max(24, Math.min(state.width - 24, state.player.x));
    state.player.y = Math.max(36, Math.min(state.height - 36, state.player.y));

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      const spawnBase = [0.95, 0.84, 0.72, 0.62][state.enemyLevel - 1];
      state.spawnTimer = Math.max(0.17, spawnBase + Math.random() * 0.22);
    }

    if (state.keys.has(" ")) {
      fire();
    }

    for (const b of state.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    state.bullets = state.bullets.filter((b) => b.y > -24 && b.y < state.height + 24 && b.x > -20 && b.x < state.width + 20);

    for (const e of state.enemies) {
      if (e.type === "interceptor") {
        e.x += Math.sin(state.time * 7 + e.seed) * e.drift * dt;
      } else if (e.type === "meteor") {
        e.x += Math.sin(state.time * 3 + e.seed) * e.drift * dt;
      } else {
        e.x += Math.sin((state.time + e.y) * 0.01) * e.drift * dt;
      }
      e.y += e.speed * dt;
      e.x = Math.max(16, Math.min(state.width - 16, e.x));

      if (e.canShoot && e.y > 50) {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          spawnEnemyShot(e);
          e.shootTimer = randRange(0.8, 1.8);
        }
      }
    }

    for (const eb of state.enemyBullets) {
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
    }
    state.enemyBullets = state.enemyBullets.filter(
      (b) => b.y > -20 && b.y < state.height + 28 && b.x > -24 && b.x < state.width + 24
    );

    for (let ei = state.enemies.length - 1; ei >= 0; ei -= 1) {
      const e = state.enemies[ei];
      if (e.y > state.height + 38) {
        state.enemies.splice(ei, 1);
        loseLife();
      }
    }

    for (let ei = state.enemies.length - 1; ei >= 0; ei -= 1) {
      const e = state.enemies[ei];
      for (let bi = state.bullets.length - 1; bi >= 0; bi -= 1) {
        const b = state.bullets[bi];
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        if (dx * dx + dy * dy <= (e.r + b.r) * (e.r + b.r)) {
          state.bullets.splice(bi, 1);
          e.hp -= 1;
          if (e.hp <= 0) {
            const wasMeteor = e.type === "meteor" && e.splitOnDeath;
            const ex = e.x;
            const ey = e.y;
            const reward = e.reward + state.enemyLevel * 8;
            state.score += reward;
            state.enemies.splice(ei, 1);
            if (wasMeteor) {
              spawnMeteorShards(ex, ey);
            }
            refreshProgression();
          }
          break;
        }
      }
    }

    for (let ei = state.enemies.length - 1; ei >= 0; ei -= 1) {
      const e = state.enemies[ei];
      const dx = Math.abs(e.x - state.player.x);
      const dy = Math.abs(e.y - state.player.y);
      if (state.player.invulnTimer <= 0 && dx < e.r + state.player.w * 0.45 && dy < e.r + state.player.h * 0.45) {
        state.enemies.splice(ei, 1);
        loseLife();
      }
    }

    for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
      const b = state.enemyBullets[i];
      const dx = b.x - state.player.x;
      const dy = b.y - state.player.y;
      const hitRadius = b.r + state.player.w * 0.32;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        state.enemyBullets.splice(i, 1);
        loseLife();
      }
    }
  }

  function drawBackdrop() {
    const g = ctx.createLinearGradient(0, 0, 0, state.height);
    g.addColorStop(0, "#74b9ff");
    g.addColorStop(0.5, "#3f8ad6");
    g.addColorStop(1, "#1d4f86");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (const s of state.stars) {
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    for (let i = 0; i < 4; i += 1) {
      const y = 110 + i * 120;
      ctx.fillRect(0, y, state.width, 2);
    }
  }

  function drawPlayer() {
    const p = state.player;
    const blink = state.player.invulnTimer > 0 && Math.floor(state.time * 16) % 2 === 0;
    if (!blink) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = "#ffe36f";
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(14, 18);
      ctx.lineTo(0, 11);
      ctx.lineTo(-14, 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c93f36";
      ctx.fillRect(-4, -13, 8, 10);
      ctx.restore();
    }

    if (state.level >= 4) {
      for (const offset of [-34, 34]) {
        ctx.save();
        ctx.translate(p.x + offset, p.y + 8);
        ctx.fillStyle = "#ffcc5a";
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(8, 10);
        ctx.lineTo(0, 6);
        ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawBullets() {
    ctx.fillStyle = "#fff8c1";
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemyBullets() {
    ctx.fillStyle = "#ffb0a7";
    for (const b of state.enemyBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemy(enemy) {
    if (enemy.type === "gunship") {
      ctx.fillStyle = "#7d1f2f";
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y - enemy.r);
      ctx.lineTo(enemy.x + enemy.r * 0.95, enemy.y - enemy.r * 0.1);
      ctx.lineTo(enemy.x + enemy.r * 0.7, enemy.y + enemy.r * 0.55);
      ctx.lineTo(enemy.x - enemy.r * 0.7, enemy.y + enemy.r * 0.55);
      ctx.lineTo(enemy.x - enemy.r * 0.95, enemy.y - enemy.r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f59eb1";
      ctx.fillRect(enemy.x - 6, enemy.y - 6, 12, 10);
      return;
    }
    if (enemy.type === "meteor") {
      ctx.fillStyle = "#7b3b16";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a56b3a";
      ctx.beginPath();
      ctx.arc(enemy.x - enemy.r * 0.3, enemy.y - enemy.r * 0.15, enemy.r * 0.2, 0, Math.PI * 2);
      ctx.arc(enemy.x + enemy.r * 0.22, enemy.y + enemy.r * 0.2, enemy.r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (enemy.type === "interceptor") {
      ctx.fillStyle = enemy.hp > 1 ? "#6f1848" : "#b11f69";
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y - enemy.r);
      ctx.lineTo(enemy.x + enemy.r, enemy.y);
      ctx.lineTo(enemy.x, enemy.y + enemy.r * 0.8);
      ctx.lineTo(enemy.x - enemy.r, enemy.y);
      ctx.closePath();
      ctx.fill();
      return;
    }
    ctx.fillStyle = enemy.hp > 1 ? "#7a1022" : "#b4283e";
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y - enemy.r);
    ctx.lineTo(enemy.x + enemy.r * 0.9, enemy.y + enemy.r * 0.8);
    ctx.lineTo(enemy.x, enemy.y + enemy.r * 0.35);
    ctx.lineTo(enemy.x - enemy.r * 0.9, enemy.y + enemy.r * 0.8);
    ctx.closePath();
    ctx.fill();
  }

  function drawEnemies() {
    for (const enemy of state.enemies) {
      drawEnemy(enemy);
    }
  }

  function drawHud() {
    ctx.fillStyle = "rgba(7, 20, 37, 0.7)";
    ctx.fillRect(12, 10, 780, 96);
    ctx.strokeStyle = "#abd5ff";
    ctx.strokeRect(12, 10, 780, 96);
    ctx.fillStyle = "#eff8ff";
    ctx.font = "21px Consolas";
    ctx.fillText(`SCORE ${state.score}`, 24, 37);
    ctx.fillText(`LIFE ${Math.max(0, state.lives)}`, 188, 37);
    ctx.fillText(`P-LV ${state.level}`, 320, 37);
    ctx.fillText(`${state.weaponLabel}`, 448, 37);
    ctx.fillText(`E-LV ${state.enemyLevel}`, 610, 37);
    ctx.font = "18px Consolas";
    ctx.fillText(`ENEMY ${state.enemyLabel}`, 24, 66);
    ctx.fillText(`NEXT P ${state.nextUpgradeScore}`, 24, 92);
    ctx.fillText(`NEXT E ${state.nextEnemyUpgradeScore}`, 230, 92);
    ctx.fillText(`WIN ${WIN_SCORE}`, 456, 92);
    ctx.fillText(`SHIFT: BOOST`, 610, 92);

    if (state.upgradeFlashTimer > 0) {
      const alpha = 0.32 + Math.sin(state.time * 20) * 0.18;
      ctx.fillStyle = `rgba(255, 220, 90, ${Math.max(0.12, alpha)})`;
      ctx.fillRect(0, 114, state.width, 32);
      ctx.fillStyle = "#11253f";
      ctx.font = "24px Consolas";
      ctx.fillText(`PLAYER UPGRADE -> ${state.weaponLabel}`, state.width / 2 - 235, 137);
    }
    if (state.enemyUpgradeFlashTimer > 0) {
      const alpha = 0.28 + Math.sin(state.time * 18) * 0.2;
      ctx.fillStyle = `rgba(255, 130, 130, ${Math.max(0.11, alpha)})`;
      ctx.fillRect(0, 148, state.width, 30);
      ctx.fillStyle = "#330f14";
      ctx.font = "22px Consolas";
      ctx.fillText(`ENEMY WAVE UPGRADE -> ${state.enemyLabel}`, state.width / 2 - 255, 170);
    }
  }

  function drawCenterPanel(lines, subline) {
    const w = 760;
    const h = 270;
    const x = (state.width - w) / 2;
    const y = (state.height - h) / 2;
    ctx.fillStyle = "rgba(3, 9, 20, 0.78)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#ffd447";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#ffeaa0";
    ctx.font = "46px Consolas";
    ctx.fillText(lines[0], x + 44, y + 74);

    ctx.fillStyle = "#eaf4ff";
    ctx.font = "24px Consolas";
    for (let i = 1; i < lines.length; i += 1) {
      ctx.fillText(lines[i], x + 44, y + 74 + i * 38);
    }

    if (subline) {
      ctx.fillStyle = "#aad8ff";
      ctx.font = "20px Consolas";
      ctx.fillText(subline, x + 44, y + h - 26);
    }
  }

  function render() {
    drawBackdrop();

    if (state.mode === "start") {
      drawCenterPanel([
        "ZERO OPERATION",
        "WASD/ARROW: MOVE  |  SHIFT: CHASE BOOST",
        "SPACE (HOLD): CONTINUOUS FIRE",
        "PLAYER UPGRADES: 700 / 1700 / 3200",
        "ENEMY UPGRADES: 1100 / 2500 / 4000",
      ], "達到 5600 分勝利，ENTER 開始任務。");
      return;
    }

    drawBullets();
    drawEnemyBullets();
    drawEnemies();
    drawPlayer();
    drawHud();

    if (state.mode === "gameover") {
      drawCenterPanel([
        "MISSION FAILED",
        `FINAL SCORE ${state.score}`,
        `PLAYER LV ${state.level} (${state.weaponLabel})`,
        `ENEMY LV ${state.enemyLevel} (${state.enemyLabel})`,
        "PRESS ENTER TO RETRY",
      ], "雙方都會隨分數升級，保持火力與走位節奏。");
    }

    if (state.mode === "victory") {
      drawCenterPanel([
        "MISSION COMPLETE",
        `FINAL SCORE ${state.score}`,
        `PLAYER LV ${state.level} (${state.weaponLabel})`,
        `ENEMY LV ${state.enemyLevel} (${state.enemyLabel})`,
        "PRESS ENTER TO PLAY AGAIN",
      ], "你已完成玩家與敵軍雙進階的全階段作戰。");
    }
  }

  function update(dt) {
    state.time += dt;
    updateStars(dt);
    if (state.mode === "playing") {
      updatePlaying(dt);
    }
  }

  function frame(now) {
    if (!frame.last) {
      frame.last = now;
    }
    const dt = Math.min(0.033, (now - frame.last) / 1000);
    frame.last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      canvas.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  window.render_game_to_text = () => JSON.stringify({
    mode: state.mode,
    coordinateSystem: "origin=(0,0) top-left; +x right; +y down",
    score: state.score,
    lives: state.lives,
    playerLevel: state.level,
    weapon: state.weaponLabel,
    nextPlayerUpgradeScore: state.nextUpgradeScore,
    enemyLevel: state.enemyLevel,
    enemyWave: state.enemyLabel,
    nextEnemyUpgradeScore: state.nextEnemyUpgradeScore,
    winScore: WIN_SCORE,
    elapsedSec: Number(state.elapsed.toFixed(2)),
    player: {
      x: Number(state.player.x.toFixed(1)),
      y: Number(state.player.y.toFixed(1)),
      speed: state.player.speed,
      shotCooldownSec: Number(state.shotCooldown.toFixed(2)),
      shiftBoostActive: state.keys.has("Shift"),
      invulnSec: Number(state.player.invulnTimer.toFixed(2)),
    },
    bullets: state.bullets.map((b) => ({ x: Number(b.x.toFixed(1)), y: Number(b.y.toFixed(1)) })),
    enemyBullets: state.enemyBullets.map((b) => ({ x: Number(b.x.toFixed(1)), y: Number(b.y.toFixed(1)) })),
    enemies: state.enemies.map((e) => ({
      type: e.type,
      x: Number(e.x.toFixed(1)),
      y: Number(e.y.toFixed(1)),
      hp: e.hp,
      speed: Number(e.speed.toFixed(1)),
    })),
  });

  window.advanceTime = (ms) => {
    const dt = 1 / 60;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) {
      update(dt);
    }
    render();
  };

  window.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    state.keys.add(key);

    if (key === " ") {
      e.preventDefault();
      fire();
    }

    if (key === "Enter") {
      if (state.mode === "start" || state.mode === "gameover" || state.mode === "victory") {
        resetGame();
      }
    }

    if (key === "f") {
      toggleFullscreen();
    }
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    state.keys.delete(key);
  });

  document.addEventListener("fullscreenchange", () => {
    render();
  });

  render();
  requestAnimationFrame(frame);
})();
