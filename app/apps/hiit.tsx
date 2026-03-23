import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';

type Phase = 'idle' | 'work' | 'rest' | 'finished';

export default function HIITScreen() {
  const [workSeconds, setWorkSeconds] = useState(30);
  const [restSeconds, setRestSeconds] = useState(15);
  const [totalRounds, setTotalRounds] = useState(8);

  const [phase, setPhase] = useState<Phase>('idle');
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && phase !== 'idle' && phase !== 'finished') {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Transition
            if (phase === 'work') {
              if (currentRound >= totalRounds) {
                setPhase('finished');
                setRunning(false);
                return 0;
              }
              setPhase('rest');
              return restSeconds;
            } else {
              // rest -> next work round
              setCurrentRound((r) => r + 1);
              setPhase('work');
              return workSeconds;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase, currentRound, totalRounds, workSeconds, restSeconds]);

  function handleStart() {
    setPhase('work');
    setCurrentRound(1);
    setTimeLeft(workSeconds);
    setRunning(true);
  }

  function handlePauseResume() {
    setRunning((prev) => !prev);
  }

  function handleReset() {
    setRunning(false);
    setPhase('idle');
    setCurrentRound(1);
    setTimeLeft(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function formatTime(s: number) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const phaseColor = phase === 'work' ? '#ff4d6a' : phase === 'rest' ? '#34d399' : '#7c5cfc';

  return (
    <View style={styles.container}>
      {phase === 'idle' ? (
        /* Configuration */
        <View style={styles.configContainer}>
          <Text style={styles.title}>HIIT Timer</Text>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Work (seconds)</Text>
            <View style={styles.configInputRow}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setWorkSeconds(Math.max(5, workSeconds - 5))}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.configValue}>{workSeconds}s</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setWorkSeconds(Math.min(120, workSeconds + 5))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Rest (seconds)</Text>
            <View style={styles.configInputRow}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setRestSeconds(Math.max(5, restSeconds - 5))}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.configValue}>{restSeconds}s</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setRestSeconds(Math.min(120, restSeconds + 5))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Rounds</Text>
            <View style={styles.configInputRow}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setTotalRounds(Math.max(1, totalRounds - 1))}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.configValue}>{totalRounds}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setTotalRounds(Math.min(30, totalRounds + 1))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      ) : phase === 'finished' ? (
        /* Finished */
        <View style={styles.finishedContainer}>
          <Text style={styles.finishedIcon}>🎉</Text>
          <Text style={styles.finishedTitle}>Workout Complete!</Text>
          <Text style={styles.finishedSubtext}>
            {totalRounds} rounds of {workSeconds}s work / {restSeconds}s rest
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={handleReset}>
            <Text style={styles.startBtnText}>New Workout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Active timer */
        <View style={styles.timerContainer}>
          <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '22' }]}>
            <Text style={[styles.phaseText, { color: phaseColor }]}>
              {phase === 'work' ? 'WORK' : 'REST'}
            </Text>
          </View>

          <Text style={[styles.timerText, { color: phaseColor }]}>{formatTime(timeLeft)}</Text>

          <Text style={styles.roundText}>
            Round {currentRound} of {totalRounds}
          </Text>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: totalRounds }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i < currentRound - 1
                        ? '#34d399'
                        : i === currentRound - 1
                          ? phaseColor
                          : '#2a2a3e',
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: phaseColor }]}
              onPress={handlePauseResume}
            >
              <Text style={styles.controlBtnText}>
                {running ? 'Pause' : 'Resume'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', padding: 24 },
  // Config
  configContainer: { alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 40 },
  configRow: {
    width: '100%', backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  configLabel: { fontSize: 15, color: '#ccc', fontWeight: '500' },
  configInputRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  configValue: { fontSize: 18, fontWeight: '700', color: '#fff', minWidth: 40, textAlign: 'center' },
  stepBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#2a2a3e',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { color: '#7c5cfc', fontSize: 20, fontWeight: '700' },
  startBtn: {
    backgroundColor: '#7c5cfc', borderRadius: 14, paddingHorizontal: 48, paddingVertical: 16,
    marginTop: 32,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  // Timer
  timerContainer: { alignItems: 'center' },
  phaseBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 32 },
  phaseText: { fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  timerText: { fontSize: 72, fontWeight: '800', marginBottom: 12 },
  roundText: { fontSize: 16, color: '#888', marginBottom: 24 },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 40, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  controls: { flexDirection: 'row', gap: 16 },
  controlBtn: { paddingHorizontal: 36, paddingVertical: 16, borderRadius: 14 },
  controlBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  resetBtn: {
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14, backgroundColor: '#2a2a3e',
  },
  resetBtnText: { color: '#888', fontWeight: '600', fontSize: 18 },
  // Finished
  finishedContainer: { alignItems: 'center' },
  finishedIcon: { fontSize: 64, marginBottom: 16 },
  finishedTitle: { fontSize: 28, fontWeight: '800', color: '#34d399', marginBottom: 8 },
  finishedSubtext: { fontSize: 14, color: '#888', marginBottom: 32 },
});
