import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme, Theme } from '../../lib/theme';

const INHALE_DURATION = 4000;
const EXHALE_DURATION = 4000;
const CYCLE_DURATION = INHALE_DURATION + EXHALE_DURATION;

export default function BreatheScreen() {
  const { theme } = useTheme();
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [cycleCount, setCycleCount] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      startBreathingAnimation();
      startPhaseTracking();
    } else {
      stopAll();
    }
    return () => stopAll();
  }, [active]);

  function startBreathingAnimation() {
    const breatheIn = Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: INHALE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: INHALE_DURATION,
        useNativeDriver: true,
      }),
    ]);

    const breatheOut = Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.5,
        duration: EXHALE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.3,
        duration: EXHALE_DURATION,
        useNativeDriver: true,
      }),
    ]);

    const loop = Animated.loop(
      Animated.sequence([breatheIn, breatheOut])
    );

    animRef.current = loop;
    loop.start();
  }

  function startPhaseTracking() {
    setPhase('inhale');
    setCountdown(4);
    let secondsInPhase = 0;
    let isInhale = true;

    countdownInterval.current = setInterval(() => {
      secondsInPhase++;
      if (secondsInPhase >= 4) {
        // Switch phase
        secondsInPhase = 0;
        isInhale = !isInhale;
        setPhase(isInhale ? 'inhale' : 'exhale');
        setCountdown(4);
        if (isInhale) {
          setCycleCount((prev) => prev + 1);
        }
      } else {
        setCountdown(4 - secondsInPhase);
      }
    }, 1000);
  }

  function stopAll() {
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(0.3);
    setCountdown(4);
  }

  function handleToggle() {
    if (active) {
      setActive(false);
      setPhase('inhale');
    } else {
      setCycleCount(0);
      setActive(true);
    }
  }

  const phaseColor = phase === 'inhale' ? theme.accent : '#34d399';
  const s = styles(theme);

  return (
    <View style={s.container}>
      {/* Phase text */}
      <Text style={[s.phaseText, { color: phaseColor }]}>
        {active ? (phase === 'inhale' ? 'Breathe In' : 'Breathe Out') : 'Ready'}
      </Text>

      {/* Animated circle */}
      <View style={s.circleContainer}>
        {/* Outer glow ring */}
        <Animated.View
          style={[
            s.outerRing,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              borderColor: phaseColor,
            },
          ]}
        />
        {/* Inner circle */}
        <Animated.View
          style={[
            s.innerCircle,
            {
              transform: [{ scale: scaleAnim }],
              backgroundColor: phaseColor + '22',
              borderColor: phaseColor + '66',
            },
          ]}
        >
          <Text style={[s.circleText, { color: phaseColor }]}>
            {active ? `${countdown}s` : ''}
          </Text>
        </Animated.View>
      </View>

      {/* Cycle count */}
      {active && (
        <Text style={s.cycleText}>
          Cycles: {cycleCount}
        </Text>
      )}

      {/* Control button */}
      <TouchableOpacity
        style={[s.controlBtn, active && s.controlBtnActive]}
        onPress={handleToggle}
      >
        <Text style={s.controlBtnText}>
          {active ? 'Stop' : 'Start'}
        </Text>
      </TouchableOpacity>

      {/* Instructions */}
      {!active && (
        <Text style={s.instructions}>
          4 seconds inhale, 4 seconds exhale.{'\n'}Find your calm.
        </Text>
      )}
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1, backgroundColor: t.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  phaseText: {
    fontSize: 24, fontWeight: '700', marginBottom: 40, letterSpacing: 1,
  },
  circleContainer: {
    width: 250, height: 250, alignItems: 'center', justifyContent: 'center',
    marginBottom: 40,
  },
  outerRing: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    borderWidth: 2,
  },
  innerCircle: {
    width: 200, height: 200, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  circleText: { fontSize: 32, fontWeight: '800' },
  cycleText: { fontSize: 14, color: t.textMuted, marginBottom: 32 },
  controlBtn: {
    backgroundColor: t.accent, borderRadius: 30,
    paddingHorizontal: 48, paddingVertical: 16,
  },
  controlBtnActive: { backgroundColor: '#ff4d6a' },
  controlBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  instructions: {
    textAlign: 'center', color: t.textMuted, fontSize: 14, marginTop: 32, lineHeight: 22,
  },
});
