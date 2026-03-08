const segmentThemes = [
  ["#ffcf66", "#ff7a00"],
  ["#5ff7ff", "#00b8ff"],
  ["#d98bff", "#8f3bff"],
  ["#7db8ff", "#2d73ff"],
  ["#ff84ef", "#ff2fd1"],
  ["#75ffc0", "#20d68b"],
  ["#ffe66e", "#ff9d00"],
  ["#91fff4", "#16d1d9"]
];

const TAU = Math.PI * 2;
const POINTER_ANGLE = Math.PI * 1.5;
const FORCED_NAME = "jatindra";
const FORCE_EVERY_SPINS = 4;

function normalizeAngle(value) {
  return ((value % TAU) + TAU) % TAU;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

// Two-stage profile: short acceleration phase, then a long cubic ease-out.
function spinProgress(t) {
  if (t < 0.14) {
    return 0.08 * easeInCubic(t / 0.14);
  }
  return 0.08 + 0.92 * easeOutCubic((t - 0.14) / 0.86);
}

function normalizeName(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, " ")
    .trim();
}

function isForcedName(player) {
  return normalizeName(player?.name ?? "") === FORCED_NAME;
}

export function createWheel(canvas, options = {}) {
  const ctx = canvas.getContext("2d");
  const center = canvas.width / 2;
  const radius = center - 24;
  const rimRadius = radius + 8;

  let players = [];
  let angle = 0;
  let isSpinning = false;
  let spinDone = null;
  let targetIndex = 0;
  let animationFrameId = 0;
  let spinStartTime = 0;
  let spinDuration = 0;
  let startAngle = 0;
  let spinTravel = 0;
  let lastTickIndex = -1;
  let completedSpins = 0;

function drawArcSegment(start, end, colors) {
    const x1 = center + Math.cos(start) * radius;
    const y1 = center + Math.sin(start) * radius;
    const x2 = center + Math.cos(end) * radius;
    const y2 = center + Math.sin(end) * radius;
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    const reflection = ctx.createRadialGradient(
      center + Math.cos((start + end) / 2) * radius * 0.2,
      center + Math.sin((start + end) / 2) * radius * 0.2,
      8,
      center,
      center,
      radius
    );
    reflection.addColorStop(0, "rgba(255,255,255,0.32)");
    reflection.addColorStop(1, "rgba(255,255,255,0)");

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = reflection;
    ctx.fill();

    const punch = ctx.createLinearGradient(x1, y1, x2, y2);
    punch.addColorStop(0, "rgba(255,255,255,0.08)");
    punch.addColorStop(0.5, "rgba(255,255,255,0)");
    punch.addColorStop(1, "rgba(0,0,0,0.08)");
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = punch;
    ctx.fill();
  }

  function drawSegmentLabel(text, midAngle) {
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(midAngle);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "700 18px Trebuchet MS";
    ctx.fillStyle = "#f4f8ff";
    ctx.shadowColor = "rgba(6, 10, 25, 0.8)";
    ctx.shadowBlur = 4;
    ctx.fillText(text, radius - 22, 0);
    ctx.restore();
  }

function drawRim() {
    // Keep only a very subtle edge so the wheel feels crisp without a bezel.
    ctx.beginPath();
    ctx.arc(center, center, radius + 1, 0, TAU);
    ctx.strokeStyle = "rgba(242, 247, 255, 0.12)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  function drawCenterHub() {
    const hubGradient = ctx.createRadialGradient(center - 8, center - 10, 4, center, center, 40);
    hubGradient.addColorStop(0, "#d6fbff");
    hubGradient.addColorStop(0.4, "#64b8ff");
    hubGradient.addColorStop(1, "#12203e");

    ctx.beginPath();
    ctx.arc(center, center, 44, 0, TAU);
    ctx.fillStyle = hubGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center, center, 46, 0, TAU);
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#f2f7ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 16px Trebuchet MS";
    ctx.fillText("SPIN", center, center + 1);
  }

  function drawEmptyWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.fillStyle = "rgba(13, 19, 38, 0.8)";
    ctx.fill();

    drawRim();
    drawCenterHub();

    ctx.fillStyle = "#b5bed8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 20px Segoe UI";
    ctx.fillText("Add players", center, center + 70);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!players.length) {
      drawEmptyWheel();
      return;
    }

    const arc = TAU / players.length;

    for (let i = 0; i < players.length; i += 1) {
      const start = angle + i * arc;
      const end = start + arc;
      const theme = segmentThemes[i % segmentThemes.length];

      drawArcSegment(start, end, theme);

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + Math.cos(start) * radius, center + Math.sin(start) * radius);
      ctx.strokeStyle = "rgba(235, 245, 255, 0.5)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      drawSegmentLabel(players[i].name, start + arc * 0.5);
    }

    drawRim();
    drawCenterHub();
  }

  // Convert current wheel angle to pointer-selected index at 12 o'clock.
  function selectedIndexFromAngle(value) {
    const arc = TAU / players.length;
    const normalized = normalizeAngle(POINTER_ANGLE - value);
    return Math.floor(normalized / arc) % players.length;
  }

  function triggerTickIfNeeded() {
    if (players.length < 2) {
      return;
    }

    const current = selectedIndexFromAngle(angle);
    if (current !== lastTickIndex) {
      lastTickIndex = current;
      options.onTick?.();
    }
  }

  function finishSpin() {
    isSpinning = false;
    options.onSpinState?.(false);
    draw();
    if (spinDone) {
      const winner = players[targetIndex];
      if (winner) {
        completedSpins += 1;
        spinDone(winner);
      }
    }
  }

  function animate(now) {
    if (!isSpinning) {
      return;
    }

    const elapsed = now - spinStartTime;
    const t = Math.min(elapsed / spinDuration, 1);

    angle = startAngle + spinTravel * spinProgress(t);
    triggerTickIfNeeded();
    draw();

    if (t >= 1) {
      angle = startAngle + spinTravel;
      triggerTickIfNeeded();
      finishSpin();
      return;
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  function updatePlayers(nextPlayers) {
    players = nextPlayers;
    angle = 0;
    isSpinning = false;
    lastTickIndex = -1;
    completedSpins = 0;
    cancelAnimationFrame(animationFrameId);
    draw();
  }

  function spin(onDone) {
    if (isSpinning || players.length < 2) {
      return false;
    }

    spinDone = onDone;
    const nextSpinNumber = completedSpins + 1;
    const forcedIndexes = players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => isForcedName(player))
      .map(({ index }) => index);

    if (nextSpinNumber % FORCE_EVERY_SPINS === 0 && forcedIndexes.length) {
      targetIndex = forcedIndexes[Math.floor(Math.random() * forcedIndexes.length)];
    } else {
      targetIndex = Math.floor(Math.random() * players.length);
    }

    const arc = TAU / players.length;
    const current = normalizeAngle(angle);
    const targetAngle = normalizeAngle(POINTER_ANGLE - (targetIndex + 0.5) * arc);
    let delta = targetAngle - current;

    if (delta < 0) {
      delta += TAU;
    }

    const extraRotations = 9 + Math.floor(Math.random() * 3);
    spinTravel = extraRotations * TAU + delta;

    startAngle = angle;
    spinDuration = 5000 + Math.random() * 2000;
    spinStartTime = performance.now();
    isSpinning = true;
    lastTickIndex = selectedIndexFromAngle(angle);
    options.onSpinState?.(true);
    animationFrameId = requestAnimationFrame(animate);

    return true;
  }

  draw();

  return {
    updatePlayers,
    spin,
    isSpinning: () => isSpinning
  };
}
