import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// ============================================================
// AWARD SOUND EFFECTS — Synthesized WAV audio for each award
// ============================================================

const SAMPLE_RATE = 22050;

// Generate a WAV file as a base64 data URI from raw samples
function samplesToWavURI(samples: Float32Array): string {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, 1, true);  // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true);  // block align
  view.setUint16(34, 16, true); // bits per sample
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
// SOUND SYNTHESIS FUNCTIONS
// ============================================================

function generateFire(): Float32Array {
  // Whooshing flame sound — filtered noise burst rising in pitch
  const duration = 0.45;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 6) * 0.7;
    const freq = 150 + t * 800;
    const noise = (Math.random() * 2 - 1) * 0.4;
    const tone = Math.sin(2 * Math.PI * freq * t) * 0.3;
    const crackle = Math.random() > 0.95 ? (Math.random() - 0.5) * 0.6 : 0;
    samples[i] = (tone + noise + crackle) * env;
  }
  return samples;
}

function generateGlow(): Float32Array {
  // Magical shimmer — ascending chime with harmonics
  const duration = 0.6;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin(Math.PI * t / duration) * 0.6;
    const freq = 800 + t * 400;
    const s = Math.sin(2 * Math.PI * freq * t) * 0.4
            + Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.2
            + Math.sin(2 * Math.PI * freq * 2 * t) * 0.1;
    samples[i] = s * env;
  }
  return samples;
}

function generateLaunch(): Float32Array {
  // Rocket launch — low rumble rising to high whoosh
  const duration = 0.7;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = t < 0.1 ? t / 0.1 : Math.exp(-(t - 0.1) * 3) * 0.8;
    const freq = 80 + Math.pow(t / duration, 2) * 2000;
    const rumble = Math.sin(2 * Math.PI * freq * t) * 0.3;
    const noise = (Math.random() * 2 - 1) * 0.3 * Math.min(1, t * 5);
    const hiss = Math.sin(2 * Math.PI * (freq * 3) * t) * 0.1;
    samples[i] = (rumble + noise + hiss) * env;
  }
  return samples;
}

function generateSparkle(): Float32Array {
  // Diamond sparkle — rapid descending arpeggiated chimes
  const duration = 0.5;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  const notes = [2400, 2000, 2600, 1800, 2800];
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 5) * 0.5;
    let s = 0;
    for (let n = 0; n < notes.length; n++) {
      const noteT = t - n * 0.06;
      if (noteT > 0) {
        const noteEnv = Math.exp(-noteT * 12);
        s += Math.sin(2 * Math.PI * notes[n] * noteT) * noteEnv * 0.3;
      }
    }
    // Add shimmer
    s += Math.sin(2 * Math.PI * 4000 * t) * Math.random() * 0.05 * env;
    samples[i] = s;
  }
  return samples;
}

function generateShine(): Float32Array {
  // Crown shine — majestic ascending fanfare chord
  const duration = 0.65;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = (t < 0.05 ? t / 0.05 : 1) * Math.exp(-t * 2.5) * 0.6;
    // Major chord: root, major third, fifth
    const root = 523; // C5
    const s = Math.sin(2 * Math.PI * root * t) * 0.35
            + Math.sin(2 * Math.PI * root * 1.25 * t) * 0.25  // E5
            + Math.sin(2 * Math.PI * root * 1.5 * t) * 0.25   // G5
            + Math.sin(2 * Math.PI * root * 2 * t) * 0.15;    // C6 octave
    samples[i] = s * env;
  }
  return samples;
}

function generateExplode(): Float32Array {
  // Supernova explosion — massive burst with reverb tail
  const duration = 0.8;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    // Impact
    const impact = t < 0.05 ? Math.sin(2 * Math.PI * 60 * t) * (1 - t / 0.05) : 0;
    // Explosion noise
    const noiseEnv = Math.exp(-t * 4);
    const noise = (Math.random() * 2 - 1) * noiseEnv * 0.5;
    // Sub bass rumble
    const sub = Math.sin(2 * Math.PI * 40 * t) * Math.exp(-t * 3) * 0.4;
    // High frequency debris
    const debris = Math.sin(2 * Math.PI * (800 - t * 600) * t) * Math.exp(-t * 6) * 0.2;
    // Reverb shimmer
    const reverb = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 2) * 0.1;
    samples[i] = (impact + noise + sub + debris + reverb) * 0.8;
  }
  return samples;
}

function generateElectric(): Float32Array {
  // Lightning/thunder — sharp zap followed by rumble
  const duration = 0.7;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    // Sharp initial zap (first 80ms)
    let zap = 0;
    if (t < 0.08) {
      const zapEnv = (1 - t / 0.08);
      zap = (Math.random() * 2 - 1) * zapEnv * 0.8;
      zap += Math.sin(2 * Math.PI * 3000 * t) * zapEnv * 0.3;
      // Crackle
      if (Math.random() > 0.7) zap += (Math.random() - 0.5) * zapEnv;
    }
    // Second smaller zap at 120ms
    let zap2 = 0;
    if (t > 0.12 && t < 0.18) {
      const z2t = t - 0.12;
      const z2Env = (1 - z2t / 0.06) * 0.5;
      zap2 = (Math.random() * 2 - 1) * z2Env * 0.5;
      zap2 += Math.sin(2 * Math.PI * 2500 * z2t) * z2Env * 0.2;
    }
    // Low rumble/thunder tail
    const rumble = Math.sin(2 * Math.PI * 50 * t) * Math.exp(-t * 2.5) * 0.3;
    const rumble2 = Math.sin(2 * Math.PI * 35 * t) * Math.exp(-t * 2) * 0.2;
    samples[i] = zap + zap2 + rumble + rumble2;
  }
  return samples;
}

// ============================================================
// SOUND CACHE & PLAYBACK
// ============================================================

const soundCache: Record<string, string> = {};

function getSoundURI(animation: string): string {
  if (soundCache[animation]) return soundCache[animation];

  let samples: Float32Array;
  switch (animation) {
    case 'flame':   samples = generateFire(); break;
    case 'glow':    samples = generateGlow(); break;
    case 'launch':  samples = generateLaunch(); break;
    case 'sparkle': samples = generateSparkle(); break;
    case 'shine':   samples = generateShine(); break;
    case 'explode': samples = generateExplode(); break;
    case 'electric': samples = generateElectric(); break;
    default:        samples = generateGlow(); break;
  }

  const uri = samplesToWavURI(samples);
  soundCache[animation] = uri;
  return uri;
}

/**
 * Play the sound effect for a given award animation type.
 * Also triggers a matching haptic feedback.
 */
export function playAwardSound(animation: string) {
  try {
    // Haptic feedback
    if (Platform.OS !== 'web') {
      switch (animation) {
        case 'flame':
        case 'launch':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'explode':
        case 'electric':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'sparkle':
        case 'shine':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    // Audio
    const uri = getSoundURI(animation);
    const player = createAudioPlayer({ uri });
    player.play();

    // Clean up after playback
    setTimeout(() => {
      try { player.remove(); } catch {}
    }, 2000);
  } catch (e) {
    // Silently fail — sound is non-critical
    console.warn('Award sound failed:', e);
  }
}

/**
 * Pre-generate all sound URIs so first play is instant.
 * Call this once on app load.
 */
export function preloadAwardSounds() {
  const types = ['flame', 'glow', 'launch', 'sparkle', 'shine', 'explode', 'electric'];
  types.forEach(getSoundURI);
}
