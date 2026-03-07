import { createPlayerManager } from "./players.js";
import { createWheel } from "./wheel.js";

const form = document.getElementById("player-form");
const input = document.getElementById("player-input");
const list = document.getElementById("players-list");
const playerFeedback = document.getElementById("player-feedback");
const canvas = document.getElementById("wheel");
const wheelWrap = document.querySelector(".wheel-wrap");
const pointer = document.querySelector(".pointer");
const spinBtn = document.getElementById("spin-btn");
const musicBtn = document.getElementById("music-btn");

const resultCard = document.getElementById("result");
const resultPlayer = document.getElementById("result-player");
const resultMode = document.getElementById("result-mode");
const resultText = document.getElementById("result-text");

const spinSound = document.getElementById("spin-sound");
const winSound = document.getElementById("win-sound");
const bgMusic = document.getElementById("bg-music");

let tickAudioContext = null;

function playTick() {
  try {
    const AudioContextRef = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextRef) {
      return;
    }

    tickAudioContext ??= new AudioContextRef();
    if (tickAudioContext.state === "suspended") {
      tickAudioContext.resume().catch(() => {});
    }

    const oscillator = tickAudioContext.createOscillator();
    const gain = tickAudioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = 1100;
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.12, tickAudioContext.currentTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, tickAudioContext.currentTime + 0.045);

    oscillator.connect(gain);
    gain.connect(tickAudioContext.destination);
    oscillator.start();
    oscillator.stop(tickAudioContext.currentTime + 0.05);
  } catch {
    // Tick sound is optional on browsers without WebAudio.
  }
}

function bouncePointer() {
  if (!pointer) {
    return;
  }
  pointer.classList.remove("tick");
  // Force reflow so repeated ticks retrigger animation.
  pointer.offsetWidth;
  pointer.classList.add("tick");
}

const wheel = createWheel(canvas, {
  onTick: () => {
    playTick();
    bouncePointer();
  },
  onSpinState: (active) => {
    wheelWrap?.classList.toggle("spinning", active);
  }
});

let playersCount = 0;
let musicOn = false;

function setPlayerFeedback(message, type = "info") {
  if (!playerFeedback) {
    return;
  }
  playerFeedback.textContent = message;
  playerFeedback.classList.remove("success");
  if (type === "success") {
    playerFeedback.classList.add("success");
  }
}

function setSpinState(disabled) {
  spinBtn.disabled = disabled || playersCount < 2;
  spinBtn.textContent = disabled ? "..." : "SPIN";
}

function safePlay(audio, rewind = false) {
  if (!audio) {
    return;
  }

  if (rewind) {
    audio.currentTime = 0;
  }

  audio.play().catch(() => {
    // Ignore autoplay restrictions until user interacts.
  });
}

function showResult(player) {
  const mode = Math.random() < 0.5 ? "Truth" : "Dare";

  resultPlayer.textContent = player.name;
  resultMode.textContent = mode;
  resultText.textContent = "";
  resultCard.classList.remove("hidden");

  safePlay(winSound, true);

  if (typeof confetti === "function") {
    const defaults = {
      scalar: 1.1,
      ticks: 220,
      gravity: 0.95,
      startVelocity: 42
    };

    confetti({
      ...defaults,
      particleCount: 110,
      spread: 75,
      angle: 60,
      origin: { x: 0.05, y: 0.62 }
    });

    confetti({
      ...defaults,
      particleCount: 110,
      spread: 75,
      angle: 120,
      origin: { x: 0.95, y: 0.62 }
    });

    confetti({
      ...defaults,
      particleCount: 90,
      spread: 110,
      startVelocity: 34,
      origin: { x: 0.5, y: 0.45 }
    });
  }
}

createPlayerManager({
  form,
  input,
  list,
  onFeedback: (message, type) => {
    setPlayerFeedback(message, type);
  },
  onPlayersChange: (players) => {
    playersCount = players.length;
    wheel.updatePlayers(players);
    setSpinState(false);
    if (playersCount < 2) {
      resultCard.classList.add("hidden");
    }
  }
});

spinBtn.addEventListener("click", () => {
  if (wheel.isSpinning()) {
    return;
  }

  const started = wheel.spin((winner) => {
    setSpinState(false);
    showResult(winner);
  });

  if (!started) {
    return;
  }

  setSpinState(true);
  safePlay(spinSound, true);
});

musicBtn.addEventListener("click", () => {
  musicOn = !musicOn;

  if (musicOn) {
    safePlay(bgMusic);
    musicBtn.textContent = "Music: On";
  } else {
    bgMusic.pause();
    musicBtn.textContent = "Music: Off";
  }
});

setSpinState(false);
