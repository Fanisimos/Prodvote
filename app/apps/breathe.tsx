import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Vibration,
  ScrollView,
} from 'react-native';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

interface BreathPattern {
  id: string;
  name: string;
  description: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
  color: string;
}

const PATTERNS: BreathPattern[] = [
  {
    id: 'calm',
    name: 'Calm',
    description: 'Slow & soothing',
    inhale: 4, hold1: 0, exhale: 6, hold2: 0,
    color: '#4dc9f6',
  },
  {
    id: 'box',
    name: 'Box',
    description: 'Navy SEAL technique',
    inhale: 4, hold1: 4, exhale: 4, hold2: 4,
    color: '#7c5cfc',
  },
  {
    id: '478',
    name: '4-7-8',
    description: 'Sleep & anxiety relief',
    inhale: 4, hold1: 7, exhale: 8, hold2: 0,
    color: '#a78bfa',
  },
  {
    id: 'energy',
    name: 'Energize',
    description: 'Quick power boost',
    inhale: 2, hold1: 0, exhale: 2, hold2: 0,
    color: '#ff4d6a',
  },
  {
    id: 'focus',
    name: 'Focus',
    description: 'Deep concentration',
    inhale: 5, hold1: 5, exhale: 5, hold2: 5,
    color: '#34d399',
  },
];

const DURATIONS = [1, 2, 3, 5, 10]; // minutes

export default function BreatheScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [pattern, setPattern] = useState<BreathPattern>(PATTERNS[0]);
  const [duration, setDuration] = useState(3);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [phaseTime, setPhaseTime] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [cycles, setCycles] = useState(0);

  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(phase);
  const phaseTimeRef = useRef(0);

  phaseRef.current = phase;

  const totalCycleTime = pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2;
  const totalSeconds = duration * 60;
  const progress = isActive ? Math.min(totalElapsed / totalSeconds, 1) : 0;

  function getPhaseLabel() {
    switch (phase) {
      case 'inhale': return 'Breathe In';
      case 'hold1': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'hold2': return 'Hold';
    }
  }

  function getPhaseMax() {
    switch (phase) {
      case 'inhale': return pattern.inhale;
      case 'hold1': return pattern.hold1;
      case 'exhale': return pattern.exhale;
      case 'hold2': return pattern.hold2;
    }
  }

  function hapticPulse() {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
  }

  function animatePhase(p: 'inhale' | 'hold1' | 'exhale' | 'hold2') {
    const dur = (() => {
      switch (p) {
        case 'inhale': return pattern.inhale;
        case 'hold1': return pattern.hold1;
        case 'exhale': return pattern.exhale;
        case 'hold2': return pattern.hold2;
      }
    })();

    if (p === 'inhale') {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: dur * 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.8, duration: dur * 1000, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 1, duration: dur * 1000, useNativeDriver: true }),
      ]).start();
    } else if (p === 'exhale') {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.4, duration: dur * 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: dur * 1000, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: dur * 1000, useNativeDriver: true }),
      ]).start();
    }
    // hold phases keep current state
  }

  function getNextPhase(current: typeof phase): typeof phase {
    const order: (typeof phase)[] = ['inhale', 'hold1', 'exhale', 'hold2'];
    let idx = order.indexOf(current);
    // Skip phases with 0 duration
    do {
      idx = (idx + 1) % order.length;
    } while (
      ((order[idx] === 'hold1' && pattern.hold1 === 0) ||
       (order[idx] === 'hold2' && pattern.hold2 === 0)) &&
      idx !== order.indexOf(current)
    );
    return order[idx];
  }

  function start() {
    setIsActive(true);
    setTotalElapsed(0);
    setCycles(0);
    setPhase('inhale');
    setPhaseTime(0);
    phaseTimeRef.current = 0;
    phaseRef.current = 'inhale';
    animatePhase('inhale');
    hapticPulse();

    intervalRef.current = setInterval(() => {
      setTotalElapsed(prev => {
        const next = prev + 1;
        if (next >= duration * 60) {
          stop();
          return prev;
        }
        return next;
      });

      phaseTimeRef.current += 1;
      setPhaseTime(phaseTimeRef.current);

      const currentMax = (() => {
        switch (phaseRef.current) {
          case 'inhale': return pattern.inhale;
          case 'hold1': return pattern.hold1;
          case 'exhale': return pattern.exhale;
          case 'hold2': return pattern.hold2;
        }
      })();

      if (phaseTimeRef.current >= currentMax) {
        const nextP = getNextPhase(phaseRef.current);
        if (nextP === 'inhale') {
          setCycles(c => c + 1);
        }
        phaseRef.current = nextP;
        setPhase(nextP);
        phaseTimeRef.current = 0;
        setPhaseTime(0);
        animatePhase(nextP);
        hapticPulse();
      }
    }, 1000);
  }

  function stop() {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    scale.setValue(0.4);
    opacity.setValue(0.3);
    ringOpacity.setValue(0);
    setPhase('inhale');
    setPhaseTime(0);
    phaseTimeRef.current = 0;
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  return (
    <View style={styles.container}>
      {!isActive ? (
        // Setup screen
        <ScrollView style={styles.setup} contentContainerStyle={styles.setupContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.setupTitle}>Choose your breath</Text>

          {/* Pattern selector */}
          <View style={styles.patternGrid}>
            {PATTERNS.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.patternCard,
                  pattern.id === p.id && { borderColor: p.color, backgroundColor: p.color + '12' },
                ]}
                onPress={() => setPattern(p)}
              >
                <View style={[styles.patternDot, { backgroundColor: p.color }]} />
                <Text style={styles.patternName}>{p.name}</Text>
                <Text style={styles.patternDesc}>{p.description}</Text>
                <Text style={[styles.patternTiming, { color: p.color }]}>
                  {p.inhale}s{p.hold1 > 0 ? `-${p.hold1}s` : ''}-{p.exhale}s{p.hold2 > 0 ? `-${p.hold2}s` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Duration */}
          <Text style={styles.durationLabel}>DURATION</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.durationBtn, duration === d && { backgroundColor: pattern.color, borderColor: pattern.color }]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.durationText, duration === d && { color: '#fff' }]}>{d}m</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Start button */}
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: pattern.color }]}
            onPress={start}
          >
            <Text style={styles.startBtnText}>Begin Session</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        // Active breathing screen
        <View style={styles.activeContainer}>
          {/* Timer & info at top */}
          <View style={styles.topInfo}>
            <Text style={styles.timerText}>{formatTime(totalSeconds - totalElapsed)}</Text>
            <Text style={styles.cycleText}>{cycles} cycles</Text>
          </View>

          {/* Central breathing circle */}
          <View style={styles.circleContainer}>
            {/* Outer ring */}
            <Animated.View
              style={[
                styles.outerRing,
                {
                  borderColor: pattern.color + '40',
                  transform: [{ scale: Animated.add(scale, new Animated.Value(0.15)) }],
                  opacity: ringOpacity,
                },
              ]}
            />
            {/* Main circle */}
            <Animated.View
              style={[
                styles.breathCircle,
                {
                  backgroundColor: pattern.color,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            />
            {/* Label */}
            <View style={styles.labelOverlay}>
              <Text style={styles.phaseLabel}>{getPhaseLabel()}</Text>
              <Text style={styles.phaseCounter}>
                {getPhaseMax() - phaseTime}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: pattern.color }]} />
          </View>

          {/* Pattern info */}
          <Text style={[styles.activePatternName, { color: pattern.color }]}>{pattern.name}</Text>

          {/* Stop button */}
          <TouchableOpacity style={styles.stopBtn} onPress={stop}>
            <Text style={styles.stopBtnText}>End Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Setup
    setup: { flex: 1, padding: 20, paddingTop: 10 },
    setupContent: { paddingBottom: 40 },
    setupTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 20 },
    patternGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
    patternCard: {
      width: '48%' as any,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.surfaceBorder,
      flexGrow: 1,
      flexBasis: '45%' as any,
    },
    patternDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 10 },
    patternName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
    patternDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
    patternTiming: { fontSize: 13, fontWeight: '700' },
    durationLabel: {
      fontSize: 11, fontWeight: '800', color: colors.textSecondary,
      letterSpacing: 1.5, marginBottom: 12,
    },
    durationRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
    durationBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    durationText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
    startBtn: {
      borderRadius: 16, padding: 18, alignItems: 'center',
      shadowColor: '#7c5cfc', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16,
    },
    startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    // Active
    activeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    topInfo: { position: 'absolute', top: 30, alignItems: 'center' },
    timerText: { fontSize: 42, fontWeight: '200', color: colors.text, letterSpacing: 2 },
    cycleText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    circleContainer: {
      width: 280, height: 280, justifyContent: 'center', alignItems: 'center',
    },
    outerRing: {
      position: 'absolute', width: 280, height: 280, borderRadius: 140,
      borderWidth: 2,
    },
    breathCircle: {
      width: 240, height: 240, borderRadius: 120,
    },
    labelOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    phaseLabel: {
      fontSize: 22, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
    },
    phaseCounter: {
      fontSize: 48, fontWeight: '200', color: '#fff', marginTop: 4,
      textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
    },
    progressBar: {
      width: '80%', height: 4, backgroundColor: colors.surfaceBorder,
      borderRadius: 2, marginTop: 50, overflow: 'hidden',
    },
    progressFill: { height: 4, borderRadius: 2 },
    activePatternName: { fontSize: 16, fontWeight: '700', marginTop: 16 },
    stopBtn: {
      position: 'absolute', bottom: 40,
      backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 36, paddingVertical: 16,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    stopBtnText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  });
}
