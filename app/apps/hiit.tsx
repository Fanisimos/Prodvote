import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../../lib/theme';

type Phase = 'idle' | 'work' | 'rest' | 'finished';

export default function HIITScreen() {
  const { theme } = useTheme();
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
            if (phase === 'work') {
              if (currentRound >= totalRounds) {
                setPhase('finished');
                setRunning(false);
                return 0;
              }
              setPhase('rest');
              return restSeconds;
            } else {
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

  const phaseColor = phase === 'work' ? '#ff4d6a' : phase === 'rest' ? '#34d399' : theme.accent;
  const s = styles(theme);

  return (
    <View style={s.container}>
      {phase === 'idle' ? (
        <View style={s.configContainer}>
          <Text style={s.title}>HIIT Timer</Text>

          <View style={s.configRow}>
            <Text style={s.configLabel}>Work (seconds)</Text>
            <View style={s.configInputRow}>
              <TouchableOpacity style={s.stepBtn} onPress={() => setWorkSeconds(Math.max(5, workSeconds - 5))}>
                <Text style={s.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={s.configValue}>{workSeconds}s</Text>
              <TouchableOpacity style={s.stepBtn} onPress={() => setWorkSeconds(Math.min(120, workSeconds + 5))}>
                <Text style={s.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.configRow}>
            <Text style={s.configLabel}>Rest (seconds)</Text>
            <View style={s.configInputRow}>
              <TouchableOpacity style={s.stepBtn} onPress={() => setRestSeconds(Math.max(5, restSeconds - 5))}>
                <Text style={s.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={s.configValue}>{restSeconds}s</Text>
              <TouchableOpacity style={s.stepBtn} onPress={() => setRestSeconds(Math.min(120, restSeconds + 5))}>
                <Text style={s.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.configRow}>
            <Text style={s.configLabel}>Rounds</Text>
            <View style={s.configInputRow}>
              <TouchableOpacity style={s.stepBtn} onPress={() => setTotalRounds(Math.max(1, totalRounds - 1))}>
                <Text style={s.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={s.configValue}>{totalRounds}</Text>
              <TouchableOpacity style={s.stepBtn} onPress={() => setTotalRounds(Math.min(30, totalRounds + 1))}>
                <Text style={s.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={s.startBtn} onPress={handleStart}>
            <Text style={s.startBtnText}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      ) : phase === 'finished' ? (
        <View style={s.finishedContainer}>
          <Text style={s.finishedIcon}>🎉</Text>
          <Text style={s.finishedTitle}>Workout Complete!</Text>
          <Text style={s.finishedSubtext}>
            {totalRounds} rounds of {workSeconds}s work / {restSeconds}s rest
          </Text>
          <TouchableOpacity style={s.startBtn} onPress={handleReset}>
            <Text style={s.startBtnText}>New Workout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.timerContainer}>
          <View style={[s.phaseBadge, { backgroundColor: phaseColor + '22' }]}>
            <Text style={[s.phaseText, { color: phaseColor }]}>
              {phase === 'work' ? 'WORK' : 'REST'}
            </Text>
          </View>

          <Text style={[s.timerText, { color: phaseColor }]}>{formatTime(timeLeft)}</Text>

          <Text style={s.roundText}>
            Round {currentRound} of {totalRounds}
          </Text>

          <View style={s.dotsRow}>
            {Array.from({ length: totalRounds }).map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  {
                    backgroundColor:
                      i < currentRound - 1
                        ? '#34d399'
                        : i === currentRound - 1
                          ? phaseColor
                          : theme.surface,
                  },
                ]}
              />
            ))}
          </View>

          <View style={s.controls}>
            <TouchableOpacity
              style={[s.controlBtn, { backgroundColor: phaseColor }]}
              onPress={handlePauseResume}
            >
              <Text style={s.controlBtnText}>
                {running ? 'Pause' : 'Resume'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.resetBtn} onPress={handleReset}>
              <Text style={s.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', padding: 24 },
  configContainer: { alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: t.text, marginBottom: 40 },
  configRow: {
    width: '100%', backgroundColor: t.card, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: t.cardBorder,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  configLabel: { fontSize: 15, color: t.text, fontWeight: '500' },
  configInputRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  configValue: { fontSize: 18, fontWeight: '700', color: t.text, minWidth: 40, textAlign: 'center' },
  stepBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: t.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { color: t.accent, fontSize: 20, fontWeight: '700' },
  startBtn: {
    backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 48, paddingVertical: 16,
    marginTop: 32,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  timerContainer: { alignItems: 'center' },
  phaseBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 32 },
  phaseText: { fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  timerText: { fontSize: 72, fontWeight: '800', marginBottom: 12 },
  roundText: { fontSize: 16, color: t.textMuted, marginBottom: 24 },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 40, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  controls: { flexDirection: 'row', gap: 16 },
  controlBtn: { paddingHorizontal: 36, paddingVertical: 16, borderRadius: 14 },
  controlBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  resetBtn: {
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: 14, backgroundColor: t.surface,
  },
  resetBtnText: { color: t.textMuted, fontWeight: '600', fontSize: 18 },
  finishedContainer: { alignItems: 'center' },
  finishedIcon: { fontSize: 64, marginBottom: 16 },
  finishedTitle: { fontSize: 28, fontWeight: '800', color: '#34d399', marginBottom: 8 },
  finishedSubtext: { fontSize: 14, color: t.textMuted, marginBottom: 32 },
});
