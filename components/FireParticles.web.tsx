import { useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const COLORS = ['#ffaa00', '#ff8800', '#ffcc22', '#ff6600', '#ffdd44', '#ff5500', '#ffbb11', '#ff9900'];

interface FlameData {
  el: HTMLDivElement;
  startX: number;
  startY: number;
  speed: number;
  phase: number;
  size: number;
  wave: number; // 0 = always, 1 = from 33%, 2 = from 66%
}

// Wave 0: 38 edge flames (always visible, grow with intensity)
// Wave 1: 20 inner ring flames (appear at 33%)
// Wave 2: 20 full-screen flames (appear at 66%)
const WAVE_0 = 38;
const WAVE_1 = 20;
const WAVE_2 = 20;
const TOTAL = WAVE_0 + WAVE_1 + WAVE_2;

function makeFlame(container: HTMLDivElement, index: number, wave: number): FlameData {
  let startX: number, startY: number;

  if (wave === 0) {
    if (index < 16) {
      startX = Math.random() * SW;
      startY = SH - 30 - Math.random() * 70;
    } else if (index < 27) {
      startX = -5 + Math.random() * 20;
      startY = SH * 0.3 + Math.random() * SH * 0.6;
    } else {
      startX = SW - 15 + Math.random() * 20;
      startY = SH * 0.3 + Math.random() * SH * 0.6;
    }
  } else if (wave === 1) {
    const angle = Math.random() * Math.PI * 2;
    startX = SW / 2 + Math.cos(angle) * SW * (0.15 + Math.random() * 0.25);
    startY = SH / 2 + Math.sin(angle) * SH * (0.15 + Math.random() * 0.25);
  } else {
    startX = Math.random() * SW;
    startY = SH * 0.15 + Math.random() * SH * 0.75;
  }

  const size = wave === 0 ? 6 + Math.random() * 10
    : wave === 1 ? 8 + Math.random() * 14
    : 10 + Math.random() * 18;
  const color = COLORS[index % COLORS.length];

  const el = document.createElement('div');
  el.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size * 2.2}px;
    border-radius: ${size}px;
    background: ${color};
    box-shadow: 0 0 ${Math.round(size * 1.5)}px ${color};
    will-change: transform, opacity;
    pointer-events: none;
    opacity: 0;
  `;
  container.appendChild(el);

  return {
    el, startX, startY,
    speed: 0.5 + Math.random() * 0.5,
    phase: Math.random() * 10,
    size, wave,
  };
}

interface FireParticlesProps {
  intensity?: number;
}

export default function FireParticles({ intensity = 0 }: FireParticlesProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  const initialized = useRef(false);

  useEffect(() => {
    const container = ref.current;
    if (!container || initialized.current) return;
    initialized.current = true;

    const flames: FlameData[] = [];
    for (let i = 0; i < WAVE_0; i++) flames.push(makeFlame(container, i, 0));
    for (let i = 0; i < WAVE_1; i++) flames.push(makeFlame(container, WAVE_0 + i, 1));
    for (let i = 0; i < WAVE_2; i++) flames.push(makeFlame(container, WAVE_0 + WAVE_1 + i, 2));

    let raf: number;

    function tick() {
      const t = Date.now() / 1000;
      const inten = intensityRef.current;

      for (const f of flames) {
        // Gate waves by intensity
        if (f.wave === 1 && inten < 0.33) { f.el.style.opacity = '0'; continue; }
        if (f.wave === 2 && inten < 0.66) { f.el.style.opacity = '0'; continue; }

        // Size grows with intensity
        const sizeMul = f.wave === 0 ? 1 + inten * 0.8
          : f.wave === 1 ? 0.6 + inten * 0.8
          : 0.4 + inten * 1.0;

        const cycle = 3 / f.speed;
        const p = ((t * f.speed + f.phase) % cycle) / cycle;

        const riseAmount = (100 + f.size * 8) * (1 + inten * 0.5);
        const driftAmount = 20 + inten * 15;

        const x = f.startX + Math.sin(t * f.speed * 1.5 + f.phase) * driftAmount;
        const y = f.startY - p * riseAmount;

        // Opacity: fade in, hold, fade out — brighter with intensity
        let opacity: number;
        if (p < 0.1) opacity = p / 0.1;
        else if (p < 0.5) opacity = 1;
        else opacity = 1 - (p - 0.5) / 0.5;
        opacity *= Math.min(0.85, 0.4 + inten * 0.45);

        const sx = (0.7 + 0.3 * Math.sin(t * 6 + f.phase * 3)) * sizeMul;
        const sy = (p < 0.3
          ? 0.5 + (p / 0.3)
          : p < 0.7
            ? 1.5 - (p - 0.3) * 1.25
            : (1 - (p - 0.7) / 0.3) * 0.5
        ) * sizeMul;

        f.el.style.transform = `translate(${x}px, ${y}px) scaleX(${sx}) scaleY(${sy})`;
        f.el.style.opacity = String(Math.max(0, opacity));
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      flames.forEach(f => f.el.remove());
      initialized.current = false;
    };
  }, []);

  return (
    <div
      ref={ref as any}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
