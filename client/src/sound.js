// Tiny synthesized sound effects — no audio files needed.
let ctx;
const getCtx = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
};

const MASTER_VOLUME=2.5

function tone({ freq, duration, type = "sine", gain = 0.05, glideTo }) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, ac.currentTime + duration);
    }
    const level=Math.min(gain*MASTER_VOLUME,0.9)
    g.gain.setValueAtTime(level, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch {
    // Audio not available (e.g. very old browser) — fail silently.
  }
}

// Bright rising blip, like collecting a coin.
export function playSuccess() {
  tone({ freq: 520, glideTo: 880, duration: 0.13, type: "triangle", gain: 0.11 });
}

// Low buzzy dip, like hitting a wall.
export function playError() {
  tone({ freq: 180, glideTo: 90, duration: 0.19, type: "sawtooth", gain: 0.09 });
}

// Browsers block audio until a user gesture — call this on the first click too.
export function resumeAudio() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
}

export function playSelect() {
  tone({ freq: 660, glideTo: 990, duration: 0.08, type: "sine", gain: 0.06 });
}