let audioCtx = null;

function ensureCtx() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {}
}

export function playDoorbellSound() {
  try {
    ensureCtx();
    const t0 = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(660, t0);
    gain1.gain.setValueAtTime(0.25, t0);
    gain1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(t0);
    osc1.stop(t0 + 0.32);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, t0 + 0.18);
    gain2.gain.setValueAtTime(0.0, t0);
    gain2.gain.linearRampToValueAtTime(0.25, t0 + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(t0 + 0.18);
    osc2.stop(t0 + 0.52);
  } catch (e) {}
}

export function playNotificationSound() {
  try {
    ensureCtx();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, t0);
    gain.gain.setValueAtTime(0.18, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  } catch (e) {}
}

export function playAlertSound() {
  try {
    ensureCtx();
    const t0 = audioCtx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, t0 + offset);
      gain.gain.setValueAtTime(0.22, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + offset + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + 0.16);
    });
  } catch (e) {}
}

export function playCinematicSound(cfg) {
  try {
    ensureCtx();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = cfg.type || 'sine';
    osc.frequency.setValueAtTime(cfg.freq || 440, t0);
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.15, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + (cfg.duration || 0.4));
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + (cfg.duration || 0.4) + 0.05);
  } catch (e) {}
}
