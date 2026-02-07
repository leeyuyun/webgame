(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const state = {
    mode: "start",
    width: canvas.width,
    height: canvas.height,
    time: 0,
    score: 0,
    lives: 3,
    elapsed: 0,
    spawnTimer: 0,
    shotCooldown: 0,
    keys: new Set(),
    player: {
      x: canvas.width / 2,
      y: canvas.height - 80,
      w: 34,
      h: 34,
      speed: 300,
    },
    bullets: [],
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

  function resetGame() {
    state.mode = "playing";
    state.time = 0;
    state.score = 0;
    state.lives = 3;
    state.elapsed = 0;
    state.spawnTimer = 0;
    state.shotCooldown = 0;
    state.player.x = state.width / 2;
    state.player.y = state.height - 80;
    state.bullets = [];
    state.enemies = [];
  }

  function spawnEnemy() {
    const tier = 1 + Math.floor(state.elapsed / 25);
    const speedScale = Math.min(2.2, 1 + tier * 0.18);
    const size = 18 + Math.random() * 16;
    state.enemies.push({
      x: 28 + Math.random() * (state.width - 56),
      y: -30,
      r: size,
      speed: (70 + Math.random() * 90) * speedScale,
      hp: 1 + (Math.random() < Math.min(0.55, tier * 0.09) ? 1 : 0),
      drift: (Math.random() - 0.5) * 70,
    });
  }

  function fire() {
    if (state.shotCooldown > 0 || state.mode !== "playing") {
      return;
    }
    state.shotCooldown = 0.15;
    state.bullets.push({ x: state.player.x, y: state.player.y - 18, vy: -520, r: 4 });
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

  function updatePlaying(dt) {
    state.elapsed += dt;
    state.shotCooldown = Math.max(0, state.shotCooldown - dt);

    const horizontal = (state.keys.has("ArrowRight") || state.keys.has("d") ? 1 : 0) -
      (state.keys.has("ArrowLeft") || state.keys.has("a") ? 1 : 0);
    const vertical = (state.keys.has("ArrowDown") || state.keys.has("s") ? 1 : 0) -
      (state.keys.has("ArrowUp") || state.keys.has("w") ? 1 : 0);

    state.player.x += horizontal * state.player.speed * dt;
    state.player.y += vertical * state.player.speed * dt;
    state.player.x = Math.max(24, Math.min(state.width - 24, state.player.x));
    state.player.y = Math.max(36, Math.min(state.height - 36, state.player.y));

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      const base = 0.95 - Math.min(0.55, state.elapsed * 0.01);
      state.spawnTimer = Math.max(0.23, base + Math.random() * 0.35);
    }

    for (const b of state.bullets) {
      b.y += b.vy * dt;
    }
    state.bullets = state.bullets.filter((b) => b.y > -20);

    for (const e of state.enemies) {
      e.y += e.speed * dt;
      e.x += Math.sin((state.time + e.y) * 0.01) * e.drift * dt;
    }

    for (let ei = state.enemies.length - 1; ei >= 0; ei -= 1) {
      const e = state.enemies[ei];
      if (e.y > state.height + 30) {
        state.enemies.splice(ei, 1);
        state.lives -= 1;
        if (state.lives <= 0) {
          state.mode = "gameover";
        }
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
            state.score += 100;
            state.enemies.splice(ei, 1);
          }
          break;
        }
      }
    }

    for (const e of state.enemies) {
      const dx = Math.abs(e.x - state.player.x);
      const dy = Math.abs(e.y - state.player.y);
      if (dx < e.r + state.player.w * 0.45 && dy < e.r + state.player.h * 0.45) {
        state.mode = "gameover";
        state.lives = 0;
      }
    }

    if (state.score >= 2500) {
      state.mode = "victory";
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

  function drawBullets() {
    ctx.fillStyle = "#fff8c1";
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemies() {
    for (const e of state.enemies) {
      ctx.fillStyle = e.hp > 1 ? "#7a1022" : "#b4283e";
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - e.r);
      ctx.lineTo(e.x + e.r * 0.9, e.y + e.r * 0.8);
      ctx.lineTo(e.x, e.y + e.r * 0.35);
      ctx.lineTo(e.x - e.r * 0.9, e.y + e.r * 0.8);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawHud() {
    ctx.fillStyle = "rgba(7, 20, 37, 0.68)";
    ctx.fillRect(12, 10, 340, 44);
    ctx.strokeStyle = "#abd5ff";
    ctx.strokeRect(12, 10, 340, 44);
    ctx.fillStyle = "#eff8ff";
    ctx.font = "22px Consolas";
    ctx.fillText(`SCORE ${state.score}`, 24, 39);
    ctx.fillText(`LIFE ${Math.max(0, state.lives)}`, 210, 39);
  }

  function drawCenterPanel(lines, subline) {
    const w = 630;
    const h = 230;
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
        "WASD/ARROW: MOVE",
        "SPACE: FIRE | F: FULLSCREEN",
        "ENTER: START MISSION",
      ], "擊落 2500 分即勝利，敵機突破防線會扣生命。");
      return;
    }

    drawBullets();
    drawEnemies();
    drawPlayer();
    drawHud();

    if (state.mode === "gameover") {
      drawCenterPanel([
        "MISSION FAILED",
        `FINAL SCORE ${state.score}`,
        "PRESS ENTER TO RETRY",
      ], "零式編隊已潰散。重整後再出擊。");
    }

    if (state.mode === "victory") {
      drawCenterPanel([
        "MISSION COMPLETE",
        `FINAL SCORE ${state.score}`,
        "PRESS ENTER TO PLAY AGAIN",
      ], "你守住了制空權。");
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
    elapsedSec: Number(state.elapsed.toFixed(2)),
    player: {
      x: Number(state.player.x.toFixed(1)),
      y: Number(state.player.y.toFixed(1)),
      speed: state.player.speed,
      shotCooldownSec: Number(state.shotCooldown.toFixed(2)),
    },
    bullets: state.bullets.map((b) => ({ x: Number(b.x.toFixed(1)), y: Number(b.y.toFixed(1)) })),
    enemies: state.enemies.map((e) => ({
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
