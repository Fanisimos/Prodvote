import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const INHALE_DURATION = 4000;
const EXHALE_DURATION = 4000;
const CYCLE_DURATION = INHALE_DURATION + EXHALE_DURATION;

export default function BreatheScreen() {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [cycleCount, setCycleCount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const phaseInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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
    let isInhale = true;

    phaseInterval.current = setInterval(() => {
      isInhale = !isInhale;
      setPhase(isInhale ? 'inhale' : 'exhale');
      if (isInhale) {
        setCycleCount((prev) => prev + 1);
      }
    }, INHALE_DURATION);
  }

  function stopAll() {
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
    if (phaseInterval.current) {
      clearInterval(phaseInterval.current);
      phaseInterval.current = null;
    }
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(0.3);
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

  const phaseColor = phase === 'inhale' ? '#7c5cfc' : '#34d399';

  return (
    <View style={styles.container}>
      {/* Phase text */}
      <Text style={[styles.phaseText, { color: phaseColor }]}>
        {active ? (phase === 'inhale' ? 'Breathe In' : 'Breathe Out') : 'Ready'}
      </Text>

      {/* Animated circle */}
      <View style={styles.circleContainer}>
        {/* Outer glow ring */}
        <Animated.View
          style={[
            styles.outerRing,
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
            styles.innerCircle,
            {
              transform: [{ scale: scaleAnim }],
              backgroundColor: phaseColor + '22',
              borderColor: phaseColor + '66',
            },
          ]}
        >
          <Text style={[styles.circleText, { color: phaseColor }]}>
            {active ? (phase === 'inhale' ? '4s' : '4s') : ''}
          </Text>
        </Animated.View>
      </View>

      {/* Cycle count */}
      {active && (
        <Text style={styles.cycleText}>
          Cycles: {cycleCount}
        </Text>
      )}

      {/* Control button */}
      <TouchableOpacity
        style={[styles.controlBtn, active && styles.controlBtnActive]}
        onPress={handleToggle}
      >
        <Text style={styles.controlBtnText}>
          {active ? 'Stop' : 'Start'}
        </Text>
      </TouchableOpacity>

      {/* Instructions */}
      {!active && (
        <Text style={styles.instructions}>
          4 seconds inhale, 4 seconds exhale.{'\n'}Find your calm.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0a0a0f',
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
  cycleText: { fontSize: 14, color: '#888', marginBottom: 32 },
  controlBtn: {
    backgroundColor: '#7c5cfc', borderRadius: 30,
    paddingHorizontal: 48, paddingVertical: 16,
  },
  controlBtnActive: { backgroundColor: '#ff4d6a' },
  controlBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  instructions: {
    textAlign: 'center', color: '#555', fontSize: 14, marginTop: 32, lineHeight: 22,
  },
});
