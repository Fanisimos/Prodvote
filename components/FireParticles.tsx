import { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const COLORS = [
  { color: '#ffaa00', glow: '#ff6600' },
  { color: '#ff8800', glow: '#ff4400' },
  { color: '#ffcc22', glow: '#ff8800' },
  { color: '#ff6600', glow: '#cc3300' },
  { color: '#ffdd44', glow: '#ffaa00' },
  { color: '#ff5500', glow: '#cc2200' },
  { color: '#ffbb11', glow: '#ff7700' },
  { color: '#ff9900', glow: '#ee5500' },
];

interface Flame {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scaleX: Animated.Value;
  scaleY: Animated.Value;
  startX: number;
  startY: number;
  color: string;
  glow: string;
  size: number;
  speed: number;
  wave: number;
}

const WAVE_0 = 38;
const WAVE_1 = 20;
const WAVE_2 = 20;
const TOTAL = WAVE_0 + WAVE_1 + WAVE_2;

function createFlame(index: number, wave: number): Flame {
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

  const ci = index % COLORS.length;
  const size = wave === 0 ? 6 + Math.random() * 10
    : wave === 1 ? 8 + Math.random() * 14
    : 10 + Math.random() * 18;

  return {
    x: new Animated.Value(startX),
    y: new Animated.Value(startY),
    opacity: new Animated.Value(0),
    scaleX: new Animated.Value(1),
    scaleY: new Animated.Value(1),
    startX, startY,
    color: COLORS[ci].color,
    glow: COLORS[ci].glow,
    size, wave,
    speed: 0.5 + Math.random() * 0.5,
  };
}

function animateFlame(f: Flame, delay: number, intensityRef: { current: number }) {
  const riseDuration = 2000 + Math.random() * 2000;

  function loop() {
    const inten = intensityRef.current;

    // Gate by wave
    if ((f.wave === 1 && inten < 0.33) || (f.wave === 2 && inten < 0.66)) {
      f.opacity.setValue(0);
      setTimeout(loop, 500);
      return;
    }

    const sizeMul = f.wave === 0 ? 1 + inten * 0.8
      : f.wave === 1 ? 0.6 + inten * 0.8
      : 0.4 + inten * 1.0;

    const riseAmount = (100 + f.size * 8) * (1 + inten * 0.5);
    const maxOpacity = Math.min(0.85, 0.4 + inten * 0.45);

    f.x.setValue(f.startX + (Math.random() - 0.5) * 12);
    f.y.setValue(f.startY);
    f.opacity.setValue(0);
    f.scaleX.setValue(0.5 * sizeMul);
    f.scaleY.setValue(0.5 * sizeMul);

    const driftX = (Math.random() - 0.5) * (40 + inten * 30);

    Animated.sequence([
      Animated.delay(delay + Math.random() * 300),
      Animated.parallel([
        Animated.timing(f.y, {
          toValue: f.startY - riseAmount,
          duration: riseDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(f.x, {
          toValue: f.startX + driftX,
          duration: riseDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        // Scale: stretch tall then shrink
        Animated.sequence([
          Animated.timing(f.scaleX, {
            toValue: (0.8 + Math.random() * 0.5) * sizeMul,
            duration: riseDuration * 0.3,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(f.scaleX, {
            toValue: (0.4 + Math.random() * 0.3) * sizeMul,
            duration: riseDuration * 0.4,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(f.scaleX, {
            toValue: 0,
            duration: riseDuration * 0.3,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(f.scaleY, {
            toValue: (1.5 + Math.random() * 0.5) * sizeMul,
            duration: riseDuration * 0.3,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(f.scaleY, {
            toValue: (0.8 + Math.random() * 0.3) * sizeMul,
            duration: riseDuration * 0.5,
            useNativeDriver: true,
          }),
          Animated.timing(f.scaleY, {
            toValue: 0,
            duration: riseDuration * 0.2,
            useNativeDriver: true,
          }),
        ]),
        // Opacity: fade in, hold, fade out
        Animated.sequence([
          Animated.timing(f.opacity, {
            toValue: maxOpacity,
            duration: riseDuration * 0.08,
            useNativeDriver: true,
          }),
          Animated.timing(f.opacity, {
            toValue: maxOpacity * 0.7,
            duration: riseDuration * 0.52,
            useNativeDriver: true,
          }),
          Animated.timing(f.opacity, {
            toValue: 0,
            duration: riseDuration * 0.4,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => loop());
  }
  loop();
}

interface FireParticlesProps {
  intensity?: number;
}

export default function FireParticles({ intensity = 0 }: FireParticlesProps) {
  const flames = useRef<Flame[]>([]);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  if (flames.current.length === 0) {
    for (let i = 0; i < WAVE_0; i++) flames.current.push(createFlame(i, 0));
    for (let i = 0; i < WAVE_1; i++) flames.current.push(createFlame(WAVE_0 + i, 1));
    for (let i = 0; i < WAVE_2; i++) flames.current.push(createFlame(WAVE_0 + WAVE_1 + i, 2));
  }

  useEffect(() => {
    flames.current.forEach((f, i) => {
      animateFlame(f, i * 40, intensityRef);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flames.current.map((f, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: f.size,
            height: f.size * 2.2,
            borderRadius: f.size,
            backgroundColor: f.color,
            shadowColor: f.glow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: f.size * 1.5,
            transform: [
              { translateX: f.x },
              { translateY: f.y },
              { scaleX: f.scaleX },
              { scaleY: f.scaleY },
            ],
            opacity: f.opacity,
          }}
        />
      ))}
    </View>
  );
}
