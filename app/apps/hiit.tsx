import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Platform,
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

interface Preset {
  id: string;
  name: string;
  work: number;
  rest: number;
  rounds: number;
  color: string;
}

const STORAGE_KEY = 'prodvote_hiit';

const DEFAULT_PRESETS: Preset[] = [
  { id: 'tabata', name: 'Tabata', work: 20, rest: 10, rounds: 8, color: '#ff4d6a' },
  { id: 'classic', name: 'Classic HIIT', work: 40, rest: 20, rounds: 10, color: '#ffb347' },
  { id: 'emom', name: 'EMOM', work: 50, rest: 10, rounds: 12, color: '#34d399' },
  { id: 'sprint', name: 'Sprint', work: 30, rest: 30, rounds: 6, color: '#4dc9f6' },
  { id: 'beast', name: 'Beast Mode', work: 45, rest: 15, rounds: 15, color: '#7c5cfc' },
];

type Phase = 'idle' | 'countdown' | 'work' | 'rest' | 'done';

export default function HIITScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS);
  const [selected, setSelected] = useState<Preset>(DEFAULT_PRESETS[0]);
  const [customWork, setCustomWork] = useState('30');
  const [customRest, setCustomRest] = useState('15');
  const [customRounds, setCustomRounds] = useState('8');
  const [showCustom, setShowCustom] = useState(false);

  // Timer state
  const [phase, setPhase] = useState<Phase>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalWorkTime, setTotalWorkTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  // Load custom presets
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const saved = JSON.parse(json);
          if (saved.length > 0) setPresets([...DEFAULT_PRESETS, ...saved]);
        }
      } catch {}
    })();
  }, []);

  function haptic() {
    if (Platform.OS !== 'web') Vibration.vibrate(100);
  }

  function strongHaptic() {
    if (Platform.OS !== 'web') Vibration.vibrate([0, 200, 100, 200]);
  }

  function animatePulse() {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }

  function startWorkout() {
    setPhase('countdown');
    setTimeLeft(3);
    setCurrentRound(0);
    setTotalWorkTime(0);
    setIsPaused(false);

    // Animate background to neutral
    Animated.timing(bgAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  }

  useEffect(() => {
    if (phase === 'idle' || phase === 'done' || isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Phase transition
          if (phase === 'countdown') {
            setPhase('work');
            setCurrentRound(1);
            setTimeLeft(selected.work);
            haptic();
            Animated.timing(bgAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
            animatePulse();
            return selected.work;
          }
          if (phase === 'work') {
            setTotalWorkTime(t => t + selected.work);
            if (currentRound >= selected.rounds) {
              setPhase('done');
              strongHaptic();
              Animated.timing(bgAnim, { toValue: 0, duration: 500, useNativeDriver: false }).start();
              return 0;
            }
            setPhase('rest');
            haptic();
            Animated.timing(bgAnim, { toValue: 2, duration: 400, useNativeDriver: false }).start();
            animatePulse();
            return selected.rest;
          }
          if (phase === 'rest') {
            setPhase('work');
            setCurrentRound(r => r + 1);
            haptic();
            Animated.timing(bgAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
            animatePulse();
            return selected.work;
          }
          return 0;
        }
        if (prev <= 4 && phase !== 'countdown') animatePulse();
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, isPaused, currentRound, selected]);

  function stopWorkout() {
    setPhase('idle');
    setIsPaused(false);
    Animated.timing(bgAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  }

  function togglePause() {
    setIsPaused(!isPaused);
  }

  function startCustom() {
    const w = parseInt(customWork) || 30;
    const r = parseInt(customRest) || 15;
    const rnds = parseInt(customRounds) || 8;
    const custom: Preset = { id: 'custom', name: 'Custom', work: w, rest: r, rounds: rnds, color: '#f472b6' };
    setSelected(custom);
    setShowCustom(false);
    setTimeout(() => startWorkout(), 100);
  }

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [colors.background, '#7f1d1d', '#064e3b'],
  });

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}`;
  }

  const totalEstimate = selected.work * selected.rounds + selected.rest * (selected.rounds - 1);
  const progressPercent = phase === 'done' ? 100 :
    phase === 'idle' ? 0 :
    Math.min(((currentRound - 1) * (selected.work + selected.rest) + (phase === 'work' ? selected.work - timeLeft : selected.work + selected.rest - timeLeft)) / totalEstimate * 100, 100);

  if (phase !== 'idle' && phase !== 'done') {
    // Active workout screen
    return (
      <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.activeScreen}>
          {/* Round indicator */}
          <View style={styles.roundRow}>
            {Array.from({ length: selected.rounds }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.roundDot,
                  i < currentRound - (phase === 'rest' ? 0 : 1) && styles.roundDotDone,
                  i === currentRound - 1 && phase === 'work' && styles.roundDotActive,
                ]}
              />
            ))}
          </View>

          {/* Phase label */}
          <Text style={styles.phaseLabel}>
            {phase === 'countdown' ? 'GET READY' : phase === 'work' ? 'WORK' : 'REST'}
          </Text>

          {/* Big timer */}
          <Animated.Text style={[styles.bigTimer, { transform: [{ scale: pulseAnim }] }]}>
            {formatTime(timeLeft)}
          </Animated.Text>

          {/* Round info */}
          <Text style={styles.roundInfo}>
            {phase !== 'countdown' ? `Round ${currentRound} / ${selected.rounds}` : ''}
          </Text>

          {/* Progress bar */}
          <View style={styles.timerProgress}>
            <View style={[styles.timerProgressFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlBtn} onPress={togglePause}>
              <Text style={styles.controlIcon}>{isPaused ? '▶' : '⏸'}</Text>
              <Text style={styles.controlLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={stopWorkout}>
              <Text style={styles.controlIcon}>■</Text>
              <Text style={styles.controlLabel}>Stop</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.liveStats}>
            <View style={styles.liveStat}>
              <Text style={styles.liveStatValue}>{formatTime(totalWorkTime)}</Text>
              <Text style={styles.liveStatLabel}>Work Time</Text>
            </View>
            <View style={styles.liveStat}>
              <Text style={styles.liveStatValue}>{selected.name}</Text>
              <Text style={styles.liveStatLabel}>Workout</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (phase === 'done') {
    return (
      <View style={styles.container}>
        <View style={styles.doneScreen}>
          <Text style={styles.doneEmoji}>🏆</Text>
          <Text style={styles.doneTitle}>Workout Complete!</Text>
          <View style={styles.doneStats}>
            <View style={styles.doneStat}>
              <Text style={styles.doneStatValue}>{selected.rounds}</Text>
              <Text style={styles.doneStatLabel}>Rounds</Text>
            </View>
            <View style={styles.doneStat}>
              <Text style={styles.doneStatValue}>{formatTime(totalWorkTime)}</Text>
              <Text style={styles.doneStatLabel}>Work Time</Text>
            </View>
            <View style={styles.doneStat}>
              <Text style={styles.doneStatValue}>{formatTime(totalEstimate)}</Text>
              <Text style={styles.doneStatLabel}>Total</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: selected.color }]}
            onPress={() => startWorkout()}
          >
            <Text style={styles.startBtnText}>Go Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={stopWorkout}>
            <Text style={styles.backBtnText}>Back to Presets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Preset selection screen
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.setupContent}>
        {/* Presets */}
        {presets.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.presetCard,
              selected.id === p.id && { borderColor: p.color, backgroundColor: p.color + '10' },
            ]}
            onPress={() => setSelected(p)}
          >
            <View style={[styles.presetStripe, { backgroundColor: p.color }]} />
            <View style={styles.presetInfo}>
              <Text style={styles.presetName}>{p.name}</Text>
              <View style={styles.presetDetails}>
                <Text style={styles.presetDetail}>
                  <Text style={{ color: '#ff6b6b', fontWeight: '800' }}>{p.work}s</Text> work
                </Text>
                <Text style={styles.presetDot}>·</Text>
                <Text style={styles.presetDetail}>
                  <Text style={{ color: '#34d399', fontWeight: '800' }}>{p.rest}s</Text> rest
                </Text>
                <Text style={styles.presetDot}>·</Text>
                <Text style={styles.presetDetail}>
                  <Text style={{ fontWeight: '800', color: colors.text }}>{p.rounds}</Text> rounds
                </Text>
              </View>
            </View>
            <View style={styles.presetTime}>
              <Text style={[styles.presetTimeText, { color: p.color }]}>
                {Math.ceil((p.work * p.rounds + p.rest * (p.rounds - 1)) / 60)}m
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Custom builder toggle */}
        <TouchableOpacity
          style={[styles.customToggle, showCustom && styles.customToggleActive]}
          onPress={() => setShowCustom(!showCustom)}
        >
          <Text style={styles.customToggleText}>
            {showCustom ? '✕ Close' : '⚡ Build Custom Workout'}
          </Text>
        </TouchableOpacity>

        {showCustom && (
          <View style={styles.customBuilder}>
            <View style={styles.customRow}>
              <View style={styles.customField}>
                <Text style={styles.customLabel}>WORK (sec)</Text>
                <TextInput
                  style={[styles.customInput, { borderColor: '#ff6b6b' }]}
                  value={customWork}
                  onChangeText={setCustomWork}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <View style={styles.customField}>
                <Text style={styles.customLabel}>REST (sec)</Text>
                <TextInput
                  style={[styles.customInput, { borderColor: '#34d399' }]}
                  value={customRest}
                  onChangeText={setCustomRest}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <View style={styles.customField}>
                <Text style={styles.customLabel}>ROUNDS</Text>
                <TextInput
                  style={[styles.customInput, { borderColor: '#4dc9f6' }]}
                  value={customRounds}
                  onChangeText={setCustomRounds}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.customStartBtn} onPress={startCustom}>
              <Text style={styles.startBtnText}>Start Custom</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selected summary & start */}
        {!showCustom && (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#ff6b6b' }]}>{selected.work}s</Text>
                <Text style={styles.summaryLabel}>Work</Text>
              </View>
              <Text style={styles.summaryX}>×</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{selected.rounds}</Text>
                <Text style={styles.summaryLabel}>Rounds</Text>
              </View>
              <Text style={styles.summaryX}>=</Text>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: selected.color }]}>
                  {Math.ceil(totalEstimate / 60)}m
                </Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: selected.color }]}
              onPress={startWorkout}
            >
              <Text style={styles.startBtnText}>Start {selected.name}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    setupContent: { padding: 16, paddingBottom: 40 },

    // Presets
    presetCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
      borderRadius: 14, marginBottom: 10, borderWidth: 1.5, borderColor: colors.surfaceBorder,
      overflow: 'hidden',
    },
    presetStripe: { width: 4, alignSelf: 'stretch' },
    presetInfo: { flex: 1, padding: 16, paddingLeft: 14 },
    presetName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    presetDetails: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    presetDetail: { fontSize: 13, color: colors.textSecondary },
    presetDot: { fontSize: 13, color: colors.surfaceBorder },
    presetTime: { paddingRight: 16 },
    presetTimeText: { fontSize: 20, fontWeight: '800' },

    // Custom
    customToggle: {
      backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center',
      marginTop: 6, marginBottom: 10, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    customToggleActive: { borderColor: '#f472b6' },
    customToggleText: { fontSize: 15, fontWeight: '700', color: '#f472b6' },
    customBuilder: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 18, marginBottom: 16,
      borderWidth: 1, borderColor: '#f472b6' + '40',
    },
    customRow: { flexDirection: 'row', gap: 12 },
    customField: { flex: 1 },
    customLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1, marginBottom: 8 },
    customInput: {
      backgroundColor: colors.background, borderRadius: 10, padding: 14,
      fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center',
      borderWidth: 1.5,
    },
    customStartBtn: { backgroundColor: '#f472b6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },

    // Summary
    summary: {
      backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginTop: 10,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 },
    summaryItem: { alignItems: 'center' },
    summaryValue: { fontSize: 28, fontWeight: '800', color: colors.text },
    summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
    summaryX: { fontSize: 18, color: colors.textSecondary, fontWeight: '300' },
    startBtn: { borderRadius: 14, padding: 18, alignItems: 'center' },
    startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    // Active
    activeScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    roundRow: {
      flexDirection: 'row', gap: 6, position: 'absolute', top: 30,
      flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20,
    },
    roundDot: {
      width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)',
    },
    roundDotDone: { backgroundColor: 'rgba(255,255,255,0.6)' },
    roundDotActive: { backgroundColor: '#fff', shadowColor: '#fff', shadowRadius: 8, shadowOpacity: 0.6 },
    phaseLabel: {
      fontSize: 20, fontWeight: '900', color: 'rgba(255,255,255,0.7)',
      letterSpacing: 6, marginBottom: 10,
    },
    bigTimer: { fontSize: 120, fontWeight: '200', color: '#fff', lineHeight: 130 },
    roundInfo: { fontSize: 16, color: 'rgba(255,255,255,0.5)', marginTop: 10, fontWeight: '600' },
    timerProgress: {
      width: '80%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 2, marginTop: 40, overflow: 'hidden',
    },
    timerProgressFill: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
    controls: {
      flexDirection: 'row', gap: 30, position: 'absolute', bottom: 100,
    },
    controlBtn: { alignItems: 'center', gap: 6 },
    controlIcon: { fontSize: 28, color: '#fff' },
    controlLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
    liveStats: {
      flexDirection: 'row', gap: 40, position: 'absolute', bottom: 40,
    },
    liveStat: { alignItems: 'center' },
    liveStatValue: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
    liveStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

    // Done
    doneScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    doneEmoji: { fontSize: 64, marginBottom: 16 },
    doneTitle: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 30 },
    doneStats: { flexDirection: 'row', gap: 30, marginBottom: 40 },
    doneStat: { alignItems: 'center' },
    doneStatValue: { fontSize: 28, fontWeight: '800', color: Colors.primary },
    doneStatLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    backBtn: { marginTop: 16, padding: 14 },
    backBtnText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  });
}
