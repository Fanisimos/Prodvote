import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, Theme } from '../../lib/theme';

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

type Phase = 'work' | 'break';

export default function PomodoroScreen() {
  const { theme } = useTheme();
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
  const phaseColor = phase === 'work' ? theme.accent : '#34d399';
  const s = styles(theme);

  return (
    <View style={s.container}>
      {/* Phase indicator */}
      <View style={[s.phaseBadge, { backgroundColor: phaseColor + '22' }]}>
        <Text style={[s.phaseText, { color: phaseColor }]}>
          {phase === 'work' ? 'FOCUS TIME' : 'BREAK TIME'}
        </Text>
      </View>

      {/* Timer circle with SVG progress ring */}
      <View style={s.timerContainer}>
        <View style={s.timerCircleWrap}>
          <Svg width={240} height={240} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            {/* Background track */}
            <Circle
              cx={120} cy={120} r={110}
              stroke={phaseColor + '22'}
              strokeWidth={8}
              fill="none"
            />
            {/* Progress arc */}
            <Circle
              cx={120} cy={120} r={110}
              stroke={phaseColor}
              strokeWidth={8}
              fill="none"
              strokeDasharray={2 * Math.PI * 110}
              strokeDashoffset={2 * Math.PI * 110 * (1 - progress)}
              strokeLinecap="round"
            />
          </Svg>
          <View style={s.timerInner}>
            <Text style={[s.timerText, { color: phaseColor }]}>{formatTime(seconds)}</Text>
            <Text style={s.timerLabel}>
              {phase === 'work' ? 'Focus' : 'Rest'}
            </Text>
          </View>
        </View>
      </View>

      {/* Sessions completed */}
      <Text style={s.sessions}>
        Sessions completed: {completedSessions}
      </Text>

      {/* Controls */}
      <View style={s.controls}>
        {!running && (
          <TouchableOpacity
            style={[s.controlBtn, { backgroundColor: phaseColor }]}
            onPress={handleStartPause}
          >
            <Text style={s.controlBtnText}>Start</Text>
          </TouchableOpacity>
        )}
        {running && (
          <TouchableOpacity
            style={[s.controlBtn, { backgroundColor: '#ffb347' }]}
            onPress={handleStartPause}
          >
            <Text style={s.controlBtnText}>Pause</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.resetBtn} onPress={handleReset}>
          <Text style={s.resetBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  phaseBadge: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 40,
  },
  phaseText: { fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  timerContainer: { marginBottom: 32 },
  timerCircleWrap: {
    width: 240, height: 240,
    alignItems: 'center', justifyContent: 'center',
  },
  timerInner: {
    alignItems: 'center', justifyContent: 'center',
  },
  timerText: { fontSize: 56, fontWeight: '800' },
  timerLabel: { fontSize: 16, color: t.textMuted, marginTop: 4 },
  sessions: { fontSize: 14, color: t.textMuted, marginBottom: 40 },
  controls: { flexDirection: 'row', gap: 16 },
  controlBtn: {
    paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14,
  },
  controlBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  resetBtn: {
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14,
    backgroundColor: t.surface,
  },
  resetBtnText: { color: t.textMuted, fontWeight: '600', fontSize: 18 },
});
