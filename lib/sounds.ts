import { Platform } from 'react-native';

// ── Web Audio API sound effects ──
// Works everywhere (web + native via fallback).
// For native, you can later add expo-av with real mp3 files.

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  return AC ? new AC() : null;
}

// Short click/tick — plays each time wheel passes a segment
export function playTick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 800 + Math.random() * 200;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.start();
  osc.stop(ctx.currentTime + 0.04);
}

// Ascending chime — plays on normal win
export function playWin() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const t = ctx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.35);
  });
}

// Epic fanfare — plays on legendary 50 jackpot
export function playJackpot() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Ascending fanfare
  const notes = [523, 659, 784, 1047, 1319, 1568]; // C5 → G6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'triangle';
    const t = ctx.currentTime + i * 0.09;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.start(t);
    osc.stop(t + 0.5);
  });

  // High shimmer
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.frequency.value = 2093; // C7
  osc2.type = 'sine';
  const t2 = ctx.currentTime + 0.55;
  gain2.gain.setValueAtTime(0.15, t2);
  gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.8);
  osc2.start(t2);
  osc2.stop(t2 + 0.8);

  // Low rumble
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.connect(gain3);
  gain3.connect(ctx.destination);
  osc3.frequency.value = 110;
  osc3.type = 'sawtooth';
  gain3.gain.setValueAtTime(0.08, ctx.currentTime);
  gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  osc3.start();
  osc3.stop(ctx.currentTime + 0.6);
}

// Spin start whoosh
export function playSpinStart() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
  osc.type = 'sawtooth';
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function preloadSounds() {
  // No-op for web — sounds are generated on the fly
}

export function unloadSounds() {
  // No-op for web
}
