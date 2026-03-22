import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

type Mode = 'focus' | 'short_break' | 'long_break';

const DURATIONS: Record<Mode, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

const MODE_CONFIG: Record<Mode, { label: string; color: string; icon: string }> = {
  focus: { label: 'Focus', color: '#ff4d6a', icon: '🎯' },
  short_break: { label: 'Short Break', color: '#34d399', icon: '☕' },
  long_break: { label: 'Long Break', color: '#4dc9f6', icon: '🌿' },
};

const STATS_KEY = 'prodvote_pomodoro_stats';

export default function PomodoroScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [mode, setMode] = useState<Mode>('focus');
  const [seconds, setSeconds] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [todaySessions, setTodaySessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  async function loadStats() {
    try {
      const json = await AsyncStorage.getItem(STATS_KEY);
      if (json) {
        const data = JSON.parse(json);
        const today = new Date().toDateString();
        if (data.date === today) {
          setTodaySessions(data.count);
        }
        setSessions(data.total || 0);
      }
    } catch {}
  }

  async function saveStats(newToday: number, newTotal: number) {
    try {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify({
        date: new Date().toDateString(),
        count: newToday,
        total: newTotal,
      }));
    } catch {}
  }

  function handleComplete() {
    if (Platform.OS !== 'web') Vibration.vibrate(500);

    if (mode === 'focus') {
      const newToday = todaySessions + 1;
      const newTotal = sessions + 1;
      setTodaySessions(newToday);
      setSessions(newTotal);
      saveStats(newToday, newTotal);

      if (newToday % 4 === 0) {
        switchMode('long_break');
      } else {
        switchMode('short_break');
      }
    } else {
      switchMode('focus');
    }
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setSeconds(DURATIONS[newMode]);
    setRunning(false);
  }

  function toggleTimer() {
    setRunning(prev => !prev);
  }

  function resetTimer() {
    setRunning(false);
    setSeconds(DURATIONS[mode]);
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = 1 - seconds / DURATIONS[mode];
  const config = MODE_CONFIG[mode];

  return (
    <View style={styles.container}>
      {/* Mode Selector */}
      <View style={styles.modePicker}>
        {(Object.keys(MODE_CONFIG) as Mode[]).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.modeButton, mode === m && { backgroundColor: MODE_CONFIG[m].color + '22', borderColor: MODE_CONFIG[m].color }]}
            onPress={() => switchMode(m)}
          >
            <Text style={[styles.modeText, mode === m && { color: MODE_CONFIG[m].color }]}>
              {MODE_CONFIG[m].icon} {MODE_CONFIG[m].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timer Display */}
      <View style={styles.timerSection}>
        <View style={[styles.timerRing, { borderColor: config.color + '30' }]}>
          <View style={[styles.progressOverlay, { borderColor: config.color, borderWidth: progress > 0 ? 4 : 0 }]} />
          <Text style={[styles.timerText, { color: config.color }]}>
            {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </Text>
          <Text style={styles.timerLabel}>{config.label}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.resetBtn} onPress={resetTimer}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: config.color }]}
          onPress={toggleTimer}
        >
          <Text style={styles.mainBtnText}>{running ? 'Pause' : 'Start'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => {
            if (mode === 'focus') switchMode('short_break');
            else switchMode('focus');
          }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{todaySessions}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{todaySessions * 25}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{sessions}</Text>
          <Text style={styles.statLabel}>All Time</Text>
        </View>
      </View>

      {/* Sessions indicator */}
      <View style={styles.sessionDots}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i < (todaySessions % 4) ? config.color : colors.surfaceBorder },
            ]}
          />
        ))}
        <Text style={styles.dotLabel}>until long break</Text>
      </View>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      paddingTop: 16,
    },
    modePicker: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 20,
    },
    modeButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    modeText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    timerSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timerRing: {
      width: 260,
      height: 260,
      borderRadius: 130,
      borderWidth: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressOverlay: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
    },
    timerText: {
      fontSize: 64,
      fontWeight: '200',
      letterSpacing: 2,
    },
    timerLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
      marginBottom: 40,
    },
    resetBtn: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    resetText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 15,
    },
    mainBtn: {
      paddingHorizontal: 48,
      paddingVertical: 18,
      borderRadius: 16,
    },
    mainBtnText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '800',
    },
    skipBtn: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    skipText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 15,
    },
    statsCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      marginHorizontal: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      width: '90%',
      maxWidth: 400,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: Colors.primary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.surfaceBorder,
    },
    sessionDots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 32,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    dotLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
      opacity: 0.6,
    },
  });
}
