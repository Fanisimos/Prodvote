import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing,
  Dimensions, Alert, Platform,
} from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../lib/AuthContext';
import { useTheme, Theme } from '../lib/theme';

// Native audio via expo-audio (only in production builds)
let createAudioPlayer: any = null;
if (Platform.OS !== 'web') {
  try { createAudioPlayer = require('expo-audio').createAudioPlayer; } catch {}
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(SCREEN_WIDTH - 60, 320);
const RADIUS = WHEEL_SIZE / 2;

const SEGMENTS = [
  { value: 10, color: '#7c5cfc', label: '10' },
  { value: 20, color: '#4dc9f6', label: '20' },
  { value: 30, color: '#34d399', label: '30' },
  { value: 50, color: '#fbbf24', label: '50' },
  { value: 10, color: '#ff6b35', label: '10' },
  { value: 20, color: '#f472b6', label: '20' },
  { value: 100, color: '#ff4d6a', label: '100' },
  { value: 15, color: '#8b5cf6', label: '15' },
];

const NUM_SEGMENTS = SEGMENTS.length;
const SEGMENT_ANGLE = (2 * Math.PI) / NUM_SEGMENTS;

// Build SVG path for each pie slice
function getSegmentPath(index: number): string {
  const startAngle = index * SEGMENT_ANGLE - Math.PI / 2;
  const endAngle = startAngle + SEGMENT_ANGLE;
  const x1 = RADIUS + RADIUS * Math.cos(startAngle);
  const y1 = RADIUS + RADIUS * Math.sin(startAngle);
  const x2 = RADIUS + RADIUS * Math.cos(endAngle);
  const y2 = RADIUS + RADIUS * Math.sin(endAngle);
  const largeArc = SEGMENT_ANGLE > Math.PI ? 1 : 0;
  return `M ${RADIUS} ${RADIUS} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

// Get label position (middle of each segment, inset from edge)
function getLabelPosition(index: number) {
  const midAngle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - Math.PI / 2;
  const labelRadius = RADIUS * 0.65;
  return {
    x: RADIUS + labelRadius * Math.cos(midAngle),
    y: RADIUS + labelRadius * Math.sin(midAngle),
    rotation: (midAngle * 180) / Math.PI + 90,
  };
}

// Native audio — pool of tick players so rapid ticks can overlap
const TICK_POOL_SIZE = 6;
let tickPool: any[] = [];
let tickPoolIdx = 0;
let winPlayer: any = null;
let bigWinPlayer: any = null;

function initNativeAudio() {
  if (Platform.OS === 'web' || !createAudioPlayer) return;
  try {
    if (tickPool.length === 0) {
      for (let i = 0; i < TICK_POOL_SIZE; i++) {
        tickPool.push(createAudioPlayer(require('../assets/sounds/tick.wav')));
      }
    }
    if (!winPlayer) winPlayer = createAudioPlayer(require('../assets/sounds/win.wav'));
    if (!bigWinPlayer) bigWinPlayer = createAudioPlayer(require('../assets/sounds/bigwin.wav'));
  } catch (e) {
    console.warn('Could not init native audio:', e);
  }
}

// Web Audio sound effects
let audioCtx: AudioContext | null = null;

function initAudio() {
  if (Platform.OS === 'web' && !audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  initNativeAudio();
}

function playTickSound() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tickPool.length > 0) {
      try {
        const player = tickPool[tickPoolIdx % TICK_POOL_SIZE];
        tickPoolIdx++;
        player.seekTo(0);
        player.play();
      } catch {}
    }
    return;
  }
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = 800 + Math.random() * 400;
  osc.type = 'square';
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playWinSound() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (winPlayer) {
      try { winPlayer.seekTo(0); winPlayer.play(); } catch {}
    }
    return;
  }
  if (!audioCtx) return;
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    const t = audioCtx!.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

function playBigWinSound() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
    if (bigWinPlayer) {
      try { bigWinPlayer.seekTo(0); bigWinPlayer.play(); } catch {}
    }
    return;
  }
  if (!audioCtx) return;
  const melody = [523, 659, 784, 1047, 784, 1047, 1319];
  melody.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    const t = audioCtx!.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

// Schedule all tick sounds upfront with decelerating intervals
// Starts fast (~40ms apart), slows to ~400ms near the end — matches wheel easing
function scheduleTickSounds(durationMs: number): ReturnType<typeof setTimeout>[] {
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const totalTicks = 55; // enough ticks to feel exciting
  let t = 0;
  for (let i = 0; i < totalTicks; i++) {
    const progress = i / totalTicks; // 0→1
    // Easing: intervals start at ~40ms and grow exponentially to ~400ms
    const interval = 40 + 360 * Math.pow(progress, 2.5);
    t += interval;
    if (t > durationMs - 200) break; // stop just before wheel stops
    const timeout = setTimeout(() => playTickSound(), t);
    timeouts.push(timeout);
  }
  return timeouts;
}

export default function FortuneWheelScreen() {
  const { profile, fetchProfile } = useAuthContext();
  const { theme } = useTheme();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the spin button
  useEffect(() => {
    if (!spinning && result === null) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [spinning, result]);

  async function handleSpin() {
    if (spinning) return;
    if (!profile) {
      Alert.alert('Not logged in', 'Please sign in to spin the wheel.');
      return;
    }
    initAudio();
    const { data, error } = await supabase.rpc('claim_daily_reward', { p_user_id: profile.id });
    if (error) {
      const msg = error.message?.includes('Already claimed')
        ? 'Come back tomorrow for your next reward!'
        : error.message || 'Something went wrong';
      Alert.alert('Cannot Spin', msg);
      return;
    }

    const coinsWon = data as number;
    setSpinning(true);
    setResult(null);
    setShowCelebration(false);

    let targetIdx = SEGMENTS.findIndex(s => s.value === coinsWon);
    if (targetIdx === -1) targetIdx = 0;

    // Target: pointer at top (12 o'clock) should land on targetIdx segment
    const segmentCenterDeg = targetIdx * (360 / NUM_SEGMENTS) + (360 / NUM_SEGMENTS) / 2;
    const targetAngle = 360 - segmentCenterDeg;
    const totalRotation = 360 * 8 + targetAngle;

    // Schedule decelerating tick sounds to match wheel easing
    const SPIN_DURATION = 5000;
    const tickTimeouts = scheduleTickSounds(SPIN_DURATION);

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: totalRotation,
      duration: SPIN_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      tickTimeouts.forEach(t => clearTimeout(t));
      setSpinning(false);
      setResult(coinsWon);

      if (coinsWon >= 50) {
        playBigWinSound();
        setShowCelebration(true);
        celebrationScale.setValue(0);
        celebrationOpacity.setValue(1);
        Animated.parallel([
          Animated.spring(celebrationScale, { toValue: 1, friction: 4, useNativeDriver: Platform.OS !== 'web' }),
          Animated.sequence([
            Animated.delay(2000),
            Animated.timing(celebrationOpacity, { toValue: 0, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
          ]),
        ]).start();
      } else {
        playWinSound();
      }

      fetchProfile();
    });
  }

  const s = styles(theme);
  // Build interpolation that covers the full spin range (up to 360*8 + 360 = 3240 degrees)
  const maxRotation = 360 * 9;
  const inputRange: number[] = [];
  const outputRange: string[] = [];
  for (let i = 0; i <= maxRotation; i += 45) {
    inputRange.push(i);
    outputRange.push(`${i}deg`);
  }
  const spin = spinAnim.interpolate({ inputRange, outputRange });

  return (
    <View style={s.container}>
      {/* Celebration overlay */}
      {showCelebration && (
        <Animated.View style={[s.celebrationOverlay, { opacity: celebrationOpacity }]}>
          <Animated.View style={{ transform: [{ scale: celebrationScale }] }}>
            <Text style={s.celebrationEmoji}>🎉</Text>
            <Text style={s.celebrationText}>JACKPOT!</Text>
            <Text style={s.celebrationCoins}>+{result} Coins!</Text>
          </Animated.View>
        </Animated.View>
      )}

      <Text style={s.title}>Daily Fortune Wheel</Text>
      <Text style={s.subtitle}>Spin to win free coins!</Text>

      {/* Streak */}
      <View style={s.streakRow}>
        <Text style={{ fontSize: 20 }}>🔥</Text>
        <Text style={s.streakText}>{profile?.login_streak ?? 0} day streak</Text>
      </View>

      {/* Wheel */}
      <View style={s.wheelContainer}>
        {/* Pointer triangle */}
        <View style={s.pointer}>
          <View style={s.pointerTriangle} />
        </View>

        {/* Outer ring */}
        <View style={s.outerRing}>
          <Animated.View style={[s.wheelInner, { transform: [{ rotate: spin }] }]}>
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
              {SEGMENTS.map((seg, i) => (
                <Path key={i} d={getSegmentPath(i)} fill={seg.color} stroke="#fff" strokeWidth={1.5} />
              ))}
              {SEGMENTS.map((seg, i) => {
                const pos = getLabelPosition(i);
                return (
                  <SvgText
                    key={`label-${i}`}
                    x={pos.x}
                    y={pos.y}
                    fill="#fff"
                    fontSize={16}
                    fontWeight="800"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    🪙{seg.label}
                  </SvgText>
                );
              })}
            </Svg>
            {/* Center circle */}
            <View style={s.centerCircle}>
              <Text style={s.centerText}>🪙</Text>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Result */}
      {result !== null && !showCelebration && (
        <View style={s.resultCard}>
          <Text style={s.resultText}>
            You won <Text style={{ color: theme.coinText, fontWeight: '800' }}>🪙 {result}</Text> coins!
          </Text>
        </View>
      )}

      {/* Spin Button */}
      {result === null ? (
        <Animated.View style={{ transform: [{ scale: spinning ? 1 : pulseAnim }] }}>
          <TouchableOpacity
            style={[s.spinBtn, spinning && { opacity: 0.6 }]}
            onPress={handleSpin}
            disabled={spinning}
          >
            <Text style={s.spinText}>{spinning ? 'Spinning...' : 'SPIN!'}</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <TouchableOpacity style={s.doneBtn} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}>
          <Text style={s.doneText}>Collect & Go Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1, backgroundColor: t.bg, alignItems: 'center',
    justifyContent: 'center', padding: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: t.text, marginBottom: 4 },
  subtitle: { fontSize: 15, color: t.textMuted, marginBottom: 12 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  streakText: { fontSize: 16, fontWeight: '700', color: t.danger },
  wheelContainer: {
    width: WHEEL_SIZE + 40, height: WHEEL_SIZE + 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 30,
  },
  pointer: {
    position: 'absolute', top: 0, zIndex: 10,
    alignItems: 'center',
  },
  pointerTriangle: {
    width: 0, height: 0,
    borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 24,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: t.danger,
  },
  outerRing: {
    width: WHEEL_SIZE + 16, height: WHEEL_SIZE + 16,
    borderRadius: (WHEEL_SIZE + 16) / 2,
    borderWidth: 6, borderColor: t.accent,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.card,
    shadowColor: t.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
  },
  wheelInner: {
    width: WHEEL_SIZE, height: WHEEL_SIZE,
    borderRadius: RADIUS,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  centerCircle: {
    position: 'absolute',
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: t.bg, borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  centerText: { fontSize: 22 },
  resultCard: {
    backgroundColor: t.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: t.cardBorder, marginBottom: 20,
  },
  resultText: { fontSize: 18, fontWeight: '600', color: t.text, textAlign: 'center' },
  spinBtn: {
    backgroundColor: t.accent, borderRadius: 30, paddingHorizontal: 50, paddingVertical: 18,
    elevation: 4, shadowColor: t.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12,
  },
  spinText: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  doneBtn: {
    backgroundColor: t.success, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 16,
  },
  doneText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  celebrationEmoji: { fontSize: 80, textAlign: 'center' },
  celebrationText: {
    fontSize: 40, fontWeight: '900', color: '#fbbf24',
    textAlign: 'center', marginTop: 10,
    textShadowColor: '#ff6b35', textShadowRadius: 20,
  },
  celebrationCoins: {
    fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginTop: 8,
  },
});
