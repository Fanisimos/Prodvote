import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import Watermark from '../../components/Watermark';
import { router } from 'expo-router';
import { useTheme, Theme } from '../../lib/theme';
import { useAuthContext } from '../../lib/AuthContext';
import { promptSignUp } from '../../lib/guestGate';
import { useFeatureFlags } from '../../lib/useFeatureFlags';
import { supabase } from '../../lib/supabase';
import { AppMetadata } from '../../lib/types';

interface AppItem {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  proOnly?: boolean;
}

const AI_APPS: AppItem[] = [
  { id: 'ai-chat', name: 'Prodvote AI', emoji: '🤖', desc: 'Chat with AI — brainstorm, write, get help. Free with limits, unlimited for Pro.' },
];

const PRODUCTIVITY: AppItem[] = [
  { id: 'eisenhower', name: 'Eisenhower Matrix', emoji: '📋', desc: 'Prioritise tasks by urgency and importance across 4 quadrants' },
  { id: 'pomodoro', name: 'Pomodoro Timer', emoji: '⏱️', desc: 'Focus in 25-minute sprints with breaks to stay productive' },
  { id: 'habits', name: 'Habit Tracker', emoji: '🔥', desc: 'Build streaks and track daily habits with visual progress' },
  { id: 'notes', name: 'Quick Notes', emoji: '📝', desc: 'Capture ideas and thoughts on the go' },
  { id: 'journal', name: 'Daily Journal', emoji: '📓', desc: 'Reflect on your day with prompts and mood tracking' },
  { id: 'plans', name: 'Plans', emoji: '🎯', desc: 'Set goals and track progress towards your targets' },
  { id: 'breathe', name: 'Breathe', emoji: '🫁', desc: 'Guided breathing exercises — box 4-7-8, calm & more' },
  { id: 'hiit', name: 'HIIT Timer', emoji: '🔥', desc: 'Interval workout timer with presets and custom builder' },
  { id: 'kanban', name: 'Kanban Board', emoji: '📊', desc: 'Manage projects with To Do, In Progress, and Done columns', proOnly: true },
  { id: 'whiteboard', name: 'Whiteboard', emoji: '🎨', desc: 'Freehand drawing canvas — sketch ideas, mind-map, doodle', proOnly: true },
];

const GAMES: AppItem[] = [
  { id: 'lunar-patrol', name: 'Lunar Patrol: Dark Frontier', emoji: '🚀', desc: 'Retro arcade shooter — dodge obstacles and blast aliens' },
  { id: 'snake', name: 'Snake', emoji: '🐍', desc: 'Classic snake game — eat, grow, and don\'t hit yourself!' },
];

export default function AppsScreen() {
  const { theme } = useTheme();
  const { profile, isGuest } = useAuthContext();
  const flags = useFeatureFlags();
  const s = styles(theme);
  const [appMeta, setAppMeta] = useState<Record<string, AppMetadata>>({});
  const [showMore, setShowMore] = useState(false);

  const isPro = profile?.tier === 'pro' || profile?.tier === 'ultra' || profile?.tier === 'legendary';

  useEffect(() => {
    supabase.from('app_metadata').select('*').then(({ data }) => {
      const map: Record<string, AppMetadata> = {};
      (data || []).forEach((m: AppMetadata) => { map[m.app_id] = m; });
      setAppMeta(map);
    });
  }, []);

  function handleAppPress(app: AppItem) {
    if (isGuest && (app.id === 'ai-chat' || app.proOnly)) {
      promptSignUp('use this');
      return;
    }
    if (app.proOnly && !isPro) {
      Alert.alert(
        'Pro Feature',
        `${app.name} is available for Pro subscribers and above.\n\nUpgrade to unlock all premium apps!`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'View Plans', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    router.push(`/apps/${app.id}` as any);
  }

  function renderApp(app: AppItem) {
    const locked = app.proOnly && !isPro;
    const meta = appMeta[app.id];
    const showCommunityMeta = flags.built_by_community !== false && meta;
    return (
      <TouchableOpacity
        key={app.id}
        style={[s.appRow, locked && s.appRowLocked]}
        onPress={() => handleAppPress(app)}
        activeOpacity={0.7}
      >
        <View style={[s.emojiContainer, locked && s.emojiContainerLocked]}>
          <Text style={{ fontSize: 28 }}>{app.emoji}</Text>
        </View>
        <View style={s.appInfo}>
          <View style={s.appNameRow}>
            <Text style={[s.appName, locked && s.appNameLocked]}>{app.name}</Text>
            {app.proOnly && (
              <View style={[s.proBadge, isPro && s.proBadgeUnlocked]}>
                <Text style={[s.proBadgeText, isPro && s.proBadgeTextUnlocked]}>
                  {isPro ? '⚡ PRO' : '🔒 PRO'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[s.appDesc, locked && s.appDescLocked]} numberOfLines={2}>{app.desc}</Text>
          {showCommunityMeta && (
            <View style={s.communityMeta}>
              {meta.suggested_by && (
                <Text style={s.metaText}>Suggested by @{meta.suggested_by}</Text>
              )}
              {meta.vote_count > 0 && (
                <Text style={s.metaText}>Built from {meta.vote_count} votes</Text>
              )}
            </View>
          )}
        </View>
        <Text style={[s.chevron, locked && s.chevronLocked]}>{locked ? '🔒' : '›'}</Text>
      </TouchableOpacity>
    );
  }

  const productivityFree = PRODUCTIVITY.filter(a => !a.proOnly);
  const productivityPro = PRODUCTIVITY.filter(a => a.proOnly);

  return (
    <View style={s.container}>
      <Watermark />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>

      <Text style={s.heading}>Built by Community</Text>

      {!isGuest && (
        <>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>🤖 AI</Text>
            <Text style={s.sectionCount}>Powered by Gemini</Text>
          </View>
          {AI_APPS.map(renderApp)}
        </>
      )}

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>⚡ PRODUCTIVITY</Text>
        <Text style={s.sectionCount}>{productivityFree.length} apps</Text>
      </View>
      {productivityFree.map(renderApp)}

      {productivityPro.length > 0 && (
        <>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>👑 PRO</Text>
            <Text style={s.sectionCount}>{isPro ? 'Unlocked' : 'Upgrade to unlock'}</Text>
          </View>
          {productivityPro.map(renderApp)}
        </>
      )}

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>🎮 GAMES</Text>
        <Text style={s.sectionCount}>{GAMES.length} games</Text>
      </View>
      {GAMES.map(renderApp)}
    </ScrollView>
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { paddingBottom: 40 },
  heading: { fontSize: 28, fontWeight: '800', color: t.text, padding: 16, paddingBottom: 8 },
  appRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: t.card,
    marginHorizontal: 16, marginBottom: 10, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: t.cardBorder,
  },
  appRowLocked: {
    opacity: 0.7,
    borderColor: t.accent + '44',
  },
  emojiContainer: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: t.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiContainerLocked: {
    backgroundColor: t.accentLight,
  },
  appInfo: { flex: 1, marginLeft: 14 },
  appNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appName: { fontSize: 16, fontWeight: '700', color: t.text },
  appNameLocked: { color: t.textMuted },
  appDesc: { fontSize: 13, color: t.textSecondary, marginTop: 3, lineHeight: 18 },
  appDescLocked: { color: t.textMuted },
  proBadge: {
    backgroundColor: t.accent + '22',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  proBadgeUnlocked: {
    backgroundColor: t.successBg,
  },
  proBadgeText: { fontSize: 10, fontWeight: '800', color: t.accent },
  proBadgeTextUnlocked: { color: t.success },
  chevron: { fontSize: 24, color: t.textMuted, marginLeft: 8 },
  chevronLocked: { fontSize: 16 },
  communityMeta: {
    flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap',
  },
  metaText: { fontSize: 11, color: t.textMuted, fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: t.text, letterSpacing: 1 },
  sectionCount: { fontSize: 13, color: t.textMuted },
});
