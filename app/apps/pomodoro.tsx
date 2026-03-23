import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

type Phase = 'work' | 'break';

export default function PomodoroScreen() {
  const [phase, setPhase] = useState<Phase>('work');
  const [seconds, setSeconds] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            // Timer finished
            setRunning(false);
            if (phase === 'work') {
              setCompletedSessions((s) => s + 1);
              setPhase('break');
              return BREAK_SECONDS;
            } else {
              setPhase('work');
              return WORK_SECONDS;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase]);

  function formatTime(s: number) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function handleStartPause() {
    setRunning((prev) => !prev);
  }

  function handleReset() {
    setRunning(false);
    setPhase('work');
    setSeconds(WORK_SECONDS);
  }

  const total = phase === 'work' ? WORK_SECONDS : BREAK_SECONDS;
  const progress = seconds / total;
  const phaseColor = phase === 'work' ? '#7c5cfc' : '#34d399';

  return (
    <View style={styles.container}>
      {/* Phase indicator */}
      <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '22' }]}>
        <Text style={[styles.phaseText, { color: phaseColor }]}>
          {phase === 'work' ? 'FOCUS TIME' : 'BREAK TIME'}
        </Text>
      </View>

      {/* Timer circle */}
      <View style={styles.timerContainer}>
        <View style={[styles.timerCircle, { borderColor: phaseColor + '44' }]}>
          <View
            style={[
              styles.timerProgress,
              {
                borderColor: phaseColor,
                opacity: progress,
              },
            ]}
          />
          <Text style={[styles.timerText, { color: phaseColor }]}>{formatTime(seconds)}</Text>
          <Text style={styles.timerLabel}>
            {phase === 'work' ? 'Focus' : 'Rest'}
          </Text>
        </View>
      </View>

      {/* Sessions completed */}
      <Text style={styles.sessions}>
        Sessions completed: {completedSessions}
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: phaseColor }]}
          onPress={handleStartPause}
        >
          <Text style={styles.controlBtnText}>
            {running ? 'Pause' : 'Start'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center', padding: 24 },
  phaseBadge: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 40,
  },
  phaseText: { fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  timerContainer: { marginBottom: 32 },
  timerCircle: {
    width: 240, height: 240, borderRadius: 120,
    borderWidth: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  timerProgress: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    borderWidth: 6,
  },
  timerText: { fontSize: 56, fontWeight: '800' },
  timerLabel: { fontSize: 16, color: '#888', marginTop: 4 },
  sessions: { fontSize: 14, color: '#888', marginBottom: 40 },
  controls: { flexDirection: 'row', gap: 16 },
  controlBtn: {
    paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14,
  },
  controlBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  resetBtn: {
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#2a2a3e',
  },
  resetBtnText: { color: '#888', fontWeight: '600', fontSize: 18 },
});
