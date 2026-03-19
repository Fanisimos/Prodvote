import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

interface AppCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  route: string;
}

const APPS: AppCard[] = [
  {
    id: 'eisenhower',
    name: 'Eisenhower Matrix',
    description: 'Prioritise tasks by urgency and importance across 4 quadrants',
    icon: '📋',
    color: '#7c5cfc',
    route: '/apps/eisenhower',
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro Timer',
    description: 'Focus in 25-minute sprints with breaks to stay productive',
    icon: '⏱️',
    color: '#ff4d6a',
    route: '/apps/pomodoro',
  },
  {
    id: 'habits',
    name: 'Habit Tracker',
    description: 'Build streaks and track daily habits with visual progress',
    icon: '🔥',
    color: '#ffb347',
    route: '/apps/habits',
  },
  {
    id: 'notes',
    name: 'Quick Notes',
    description: 'Capture ideas and thoughts on the go',
    icon: '📝',
    color: '#34d399',
    route: '/apps/notes',
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: 'Manage projects with To Do, In Progress, and Done columns',
    icon: '📊',
    color: '#4dc9f6',
    route: '/apps/kanban',
  },
  {
    id: 'journal',
    name: 'Daily Journal',
    description: 'Reflect on your day with prompts and mood tracking',
    icon: '📖',
    color: '#a78bfa',
    route: '/apps/journal',
  },
  {
    id: 'whiteboard',
    name: 'Whiteboard',
    description: 'Freehand drawing canvas — sketch ideas, mind-map, doodle',
    icon: '🎨',
    color: '#f472b6',
    route: '/apps/whiteboard',
  },
  {
    id: 'breathe',
    name: 'Breathe',
    description: 'Guided breathing exercises — box, 4-7-8, calm & more',
    icon: '🫁',
    color: '#4dc9f6',
    route: '/apps/breathe',
  },
  {
    id: 'hiit',
    name: 'HIIT Timer',
    description: 'Interval workout timer with presets and custom builder',
    icon: '🔥',
    color: '#ff4d6a',
    route: '/apps/hiit',
  },
];

const GAMES: AppCard[] = [
  {
    id: 'moon-patrol',
    name: 'Moon Patrol: Dark Frontier',
    description: 'Retro arcade shooter — dodge craters, blast aliens, survive the moon',
    icon: '🚀',
    color: '#a78bfa',
    route: '/apps/moon-patrol',
  },
];

export default function AppsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Community Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>🗳️</Text>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>You decide what gets built</Text>
          <Text style={styles.bannerText}>
            Every app here was voted for by the community. Submit ideas, vote on what matters, and watch them come to life.
          </Text>
        </View>
      </View>

      {/* Live Apps */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ALL APPS</Text>
        <Text style={styles.sectionCount}>{APPS.length} apps</Text>
      </View>

      {APPS.map(app => (
        <TouchableOpacity
          key={app.id}
          style={[styles.appCard, { borderColor: app.color + '30' }]}
          onPress={() => router.push(app.route as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: app.color + '18' }]}>
            <Text style={styles.icon}>{app.icon}</Text>
          </View>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{app.name}</Text>
            <Text style={styles.appDesc}>{app.description}</Text>
          </View>
          <Text style={[styles.arrow, { color: app.color }]}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Games */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>GAMES</Text>
        <Text style={styles.sectionCount}>{GAMES.length} game{GAMES.length !== 1 ? 's' : ''}</Text>
      </View>

      {GAMES.map(game => (
        <TouchableOpacity
          key={game.id}
          style={[styles.appCard, { borderColor: game.color + '30' }]}
          onPress={() => router.push(game.route as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: game.color + '18' }]}>
            <Text style={styles.icon}>{game.icon}</Text>
          </View>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{game.name}</Text>
            <Text style={styles.appDesc}>{game.description}</Text>
          </View>
          <Text style={[styles.arrow, { color: game.color }]}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Community CTA */}
      <View style={styles.ctaCard}>
        <View style={styles.ctaRow}>
          <Text style={styles.ctaEmoji}>💡</Text>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Got an app idea?</Text>
            <Text style={styles.ctaText}>
              The community drives everything. Submit your idea, rally votes, and we'll build it. The most popular ideas ship first — no roadmap politics, just democracy.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/(tabs)/submit')}
        >
          <Text style={styles.ctaButtonText}>Submit Your Idea</Text>
        </TouchableOpacity>
      </View>

      {/* How it works */}
      <View style={styles.howSection}>
        <Text style={styles.howTitle}>How it works</Text>
        <View style={styles.step}>
          <View style={[styles.stepDot, { backgroundColor: '#7c5cfc' }]}>
            <Text style={styles.stepNum}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Suggest</Text>
            <Text style={styles.stepText}>Anyone can submit an app or feature idea</Text>
          </View>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.step}>
          <View style={[styles.stepDot, { backgroundColor: '#ff4d6a' }]}>
            <Text style={styles.stepNum}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Vote</Text>
            <Text style={styles.stepText}>The community upvotes what matters most</Text>
          </View>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.step}>
          <View style={[styles.stepDot, { backgroundColor: '#34d399' }]}>
            <Text style={styles.stepNum}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>We Build It</Text>
            <Text style={styles.stepText}>Top-voted ideas get built and shipped — fast</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    banner: {
      flexDirection: 'row',
      backgroundColor: Colors.primary + '12',
      borderRadius: 16,
      padding: 18,
      gap: 14,
      borderWidth: 1,
      borderColor: Colors.primary + '25',
      marginBottom: 24,
    },
    bannerIcon: {
      fontSize: 32,
    },
    bannerContent: {
      flex: 1,
    },
    bannerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    bannerText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 1.5,
    },
    sectionCount: {
      fontSize: 12,
      color: colors.textSecondary,
      opacity: 0.6,
    },
    appCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      gap: 14,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: {
      fontSize: 24,
    },
    appInfo: {
      flex: 1,
    },
    appName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 3,
    },
    appDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    arrow: {
      fontSize: 28,
      fontWeight: '300',
    },
    ctaCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    ctaRow: {
      flexDirection: 'row',
      gap: 14,
    },
    ctaEmoji: {
      fontSize: 28,
    },
    ctaContent: {
      flex: 1,
    },
    ctaTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: Colors.primary,
      marginBottom: 6,
    },
    ctaText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    ctaButton: {
      backgroundColor: Colors.primary,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 16,
    },
    ctaButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
    howSection: {
      marginTop: 28,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    howTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    step: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    stepDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepNum: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 14,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    stepText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    stepLine: {
      width: 2,
      height: 20,
      backgroundColor: colors.surfaceBorder,
      marginLeft: 15,
      marginVertical: 4,
    },
  });
}
