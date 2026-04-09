import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SAMPLE_RATE = 22050;

function samplesToWavURI(samples: Float32Array): string {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ============================================================
// BATTLE SOUNDS
// ============================================================

/** Punchy impact — sword clash / choice confirmation */
function generateBattleChoose(): Float32Array {
  const duration = 0.35;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    // Sharp metallic impact
    const impact = t < 0.02 ? (1 - t / 0.02) * 0.8 : 0;
    // Satisfying mid-tone punch
    const punch = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 12) * 0.5;
    // Bright ring (like a sword hit)
    const ring = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 8) * 0.25;
    const ring2 = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 10) * 0.15;
    // Quick ascending victory chime
    const chime = Math.sin(2 * Math.PI * (800 + t * 1500) * t) * Math.exp(-t * 6) * 0.2;
    samples[i] = impact + punch + ring + ring2 + chime;
  }
  return samples;
}

/** Victory confirmation — short triumphant ding */
function generateBattleWin(): Float32Array {
  const duration = 0.5;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = (t < 0.02 ? t / 0.02 : 1) * Math.exp(-t * 3.5) * 0.5;
    // Two-note ascending major interval
    const note1T = t;
    const note2T = t - 0.12;
    let s = Math.sin(2 * Math.PI * 660 * note1T) * 0.4; // E5
    s += Math.sin(2 * Math.PI * 660 * 1.5 * note1T) * 0.15; // harmonic
    if (note2T > 0) {
      const env2 = Math.exp(-note2T * 3) * 0.5;
      s += Math.sin(2 * Math.PI * 880 * note2T) * env2 * 0.45; // A5
      s += Math.sin(2 * Math.PI * 880 * 1.5 * note2T) * env2 * 0.15;
    }
    // Subtle shimmer
    s += Math.sin(2 * Math.PI * 3000 * t) * Math.exp(-t * 8) * 0.05;
    samples[i] = s * env;
  }
  return samples;
}

/** Whoosh — next pair transition */
function generateBattleNext(): Float32Array {
  const duration = 0.25;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin(Math.PI * t / duration) * 0.3;
    // Rising filtered noise whoosh
    const noise = (Math.random() * 2 - 1) * 0.25;
    const sweep = Math.sin(2 * Math.PI * (300 + t * 2000) * t) * 0.2;
    samples[i] = (noise + sweep) * env;
  }
  return samples;
}

/** Skip — soft descending blip */
function generateBattleSkip(): Float32Array {
  const duration = 0.15;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 15) * 0.3;
    const freq = 600 - t * 1500;
    samples[i] = Math.sin(2 * Math.PI * Math.max(freq, 200) * t) * env;
  }
  return samples;
}

// ============================================================
// CACHE & PLAYBACK
// ============================================================

const soundCache: Record<string, string> = {};

function getSoundURI(type: string): string {
  if (soundCache[type]) return soundCache[type];
  let samples: Float32Array;
  switch (type) {
    case 'choose': samples = generateBattleChoose(); break;
    case 'win':    samples = generateBattleWin(); break;
    case 'next':   samples = generateBattleNext(); break;
    case 'skip':   samples = generateBattleSkip(); break;
    default:       samples = generateBattleChoose(); break;
  }
  const uri = samplesToWavURI(samples);
  soundCache[type] = uri;
  return uri;
}

function playSound(type: string) {
  try {
    const uri = getSoundURI(type);
    const player = createAudioPlayer({ uri });
    player.play();
    setTimeout(() => { try { player.remove(); } catch {} }, 1500);
  } catch {}
}

/** Play when user taps a card to choose */
export function playBattleChoose() {
  playSound('choose');
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/** Play after the winner animation completes */
export function playBattleWin() {
  playSound('win');
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/** Play when next pair slides in */
export function playBattleNext() {
  playSound('next');
}

/** Play when user skips */
export function playBattleSkip() {
  playSound('skip');
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/** Pre-generate all battle sounds */
export function preloadBattleSounds() {
  ['choose', 'win', 'next', 'skip'].forEach(getSoundURI);
}
