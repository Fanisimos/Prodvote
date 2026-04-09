import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../lib/AuthContext';
import { promptSignUp } from '../lib/guestGate';
import { Feature } from '../lib/types';
import { playBattleChoose, playBattleWin, playBattleNext, playBattleSkip, preloadBattleSounds } from '../lib/battleSounds';
import FireParticles from './FireParticles';
import { LinearGradient } from 'expo-linear-gradient';
import ArenaBricks from './ArenaBricks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const battleTheme = require('../assets/sounds/arena-overclock.mp3');

// Dark Arena color palette
const ARENA = {
  bg: '#0a0a0f',
  bgGradientTop: '#0f0008',
  bgGradientMid: '#1a0a12',
  bgGradientBottom: '#0a0a0f',
  card: '#1a1018',
  cardBorder: '#3a1525',
  cardBorderHover: '#ff4500',
  text: '#ffffff',
  textSecondary: '#cc9999',
  textMuted: '#774455',
  accent: '#ff4500',
  accentGlow: '#ff6b35',
  vs: '#ff3d00',
  winGreen: '#00ff88',
  winGreenDark: '#004422',
  streakBg: '#ff450033',
  streakText: '#ff8c42',
  skipBorder: '#3a1525',
};

interface BattlePair { a: Feature; b: Feature; }
interface IdeaBattlesProps { isActive?: boolean; }

export default function IdeaBattles({ isActive = true }: IdeaBattlesProps) {
  const [pair, setPair] = useState<BattlePair | null>(null);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [battleCount, setBattleCount] = useState(0);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fireIntensity, setFireIntensity] = useState(0);
  const seenPairsRef = useRef<Set<string>>(new Set());
  const allFeaturesRef = useRef<Feature[]>([]);
  const { session, isGuest } = useAuthContext();

  const scaleA = useRef(new Animated.Value(1)).current;
  const scaleB = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const loserOpacity = useRef(new Animated.Value(1)).current;
  const vsPulse = useRef(new Animated.Value(1)).current;

  // VS circle pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(vsPulse, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(vsPulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Background music
  const bgPlayer = useAudioPlayer(battleTheme);
  const isFocused = useIsFocused();
  const shouldPlay = isFocused && isActive;

  useEffect(() => {
    try {
      bgPlayer.loop = true;
      bgPlayer.volume = muted ? 0 : 0.35;
      if (shouldPlay) { bgPlayer.play(); } else { bgPlayer.pause(); }
    } catch {}
    return () => { try { bgPlayer.pause(); } catch {} };
  }, [shouldPlay]);

  useEffect(() => {
    try { bgPlayer.volume = muted ? 0 : 0.35; } catch {}
  }, [muted]);

  // Fire intensity builds over ~79s (music loop duration), resets and repeats
  const MUSIC_DURATION = 79;
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000) % MUSIC_DURATION;
      setFireIntensity(elapsed / MUSIC_DURATION);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  function pairKey(idA: string, idB: string) {
    return [idA, idB].sort().join(':');
  }

  const fetchFeatures = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    const { data } = await supabase
      .from('features_with_details')
      .select('*')
      .in('status', ['open', 'under_review', 'planned', 'in_progress'])
      .limit(50);

    if (!data || data.length < 2) {
      setPair(null); setLoading(false); setAllDone(true); return;
    }

    const { data: prevVotes } = await supabase
      .from('idea_battle_votes')
      .select('idea_a_id, idea_b_id')
      .eq('user_id', session.user.id);

    const seenSet = new Set<string>();
    (prevVotes || []).forEach(v => seenSet.add(pairKey(v.idea_a_id, v.idea_b_id)));
    seenPairsRef.current = seenSet;
    allFeaturesRef.current = data;
    pickNextPair(data, seenSet);
  }, [session]);

  function pickNextPair(features?: Feature[], seen?: Set<string>) {
    const feats = features || allFeaturesRef.current;
    const seenSet = seen || seenPairsRef.current;

    if (feats.length < 2) { setPair(null); setAllDone(true); setLoading(false); return; }

    const shuffled = [...feats].sort(() => Math.random() - 0.5);
    let found = false;

    for (let i = 0; i < shuffled.length && !found; i++) {
      for (let j = i + 1; j < shuffled.length && !found; j++) {
        const key = pairKey(shuffled[i].id, shuffled[j].id);
        if (!seenSet.has(key)) {
          setPair({ a: shuffled[i], b: shuffled[j] });
          setWinnerId(null);
          fadeIn.setValue(0);
          scaleA.setValue(1);
          scaleB.setValue(1);
          loserOpacity.setValue(1);
          glowAnim.setValue(0);
          Animated.timing(fadeIn, { toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
          found = true;
        }
      }
    }

    if (!found) { setPair(null); setAllDone(true); }
    setLoading(false);
  }

  useEffect(() => { preloadBattleSounds(); fetchFeatures(); }, [fetchFeatures]);

  async function handleChoice(winner: Feature, loser: Feature) {
    if (isGuest) { promptSignUp('vote'); return; }
    if (!session || !pair || choosing) return;
    setChoosing(true);
    setWinnerId(winner.id);
    playBattleChoose();

    const isWinnerA = winner.id === pair.a.id;
    const winnerScale = isWinnerA ? scaleA : scaleB;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(winnerScale, { toValue: 1.06, duration: 250, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(winnerScale, { toValue: 1.02, duration: 200, useNativeDriver: true }),
      ]),
      Animated.timing(glowAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      Animated.timing(loserOpacity, { toValue: 0.25, duration: 400, useNativeDriver: true }),
    ]).start(async () => {
      await supabase.from('idea_battle_votes').insert({
        user_id: session.user.id,
        idea_a_id: pair.a.id,
        idea_b_id: pair.b.id,
        winner_id: winner.id,
      });

      const key = pairKey(pair.a.id, pair.b.id);
      seenPairsRef.current.add(key);
      setBattleCount(prev => prev + 1);
      playBattleWin();

      setTimeout(() => {
        setChoosing(false);
        playBattleNext();
        pickNextPair();
      }, 600);
    });
  }

  const glowBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [ARENA.cardBorder, ARENA.winGreen],
  });
  const glowShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  function MuteButton() {
    return (
      <TouchableOpacity style={s.muteBtn} onPress={() => setMuted(prev => !prev)} activeOpacity={0.7}>
        <Text style={{ fontSize: 18 }}>{muted ? '🔇' : '🔊'}</Text>
      </TouchableOpacity>
    );
  }

  const isLoading = loading && !pair;
  const isDone = !pair || allDone;

  function renderContent() {
    if (isLoading) {
      return (
        <View style={s.fullPage}>
          <MuteButton />
          <ActivityIndicator size="large" color={ARENA.accent} />
          <Text style={s.loadingText}>Entering the arena...</Text>
        </View>
      );
    }

    if (isDone) {
      return (
        <View style={s.fullPage}>
          <MuteButton />
          <Text style={{ fontSize: 48 }}>🏆</Text>
          <Text style={s.doneTitle}>All caught up!</Text>
          <Text style={s.doneSubtext}>
            {battleCount > 0
              ? `You voted on ${battleCount} battle${battleCount > 1 ? 's' : ''} this session.`
              : 'No new battles available right now.'}
          </Text>
          <TouchableOpacity style={s.refreshBtn} onPress={() => { setAllDone(false); fetchFeatures(); }}>
            <Text style={s.refreshBtnText}>Check Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const currentPair = pair!;

    return (
      <Animated.View style={[s.fullPage, { opacity: fadeIn }]}>
        <MuteButton />

        <View style={s.header}>
          <Text style={{ fontSize: 28 }}>⚔️</Text>
          <Text style={s.headerTitle}>IDEA BATTLES</Text>
        </View>
        <Text style={s.subtitle}>Which idea should be built first?</Text>

        {battleCount > 0 && (
          <View style={s.streakRow}>
            <Text style={s.streakText}>🔥 {battleCount} battle{battleCount > 1 ? 's' : ''} voted</Text>
          </View>
        )}

        <View style={s.cardsContainer}>
          <Animated.View style={[
            s.battleCard,
            { transform: [{ scale: scaleA }], opacity: winnerId && winnerId !== currentPair.a.id ? loserOpacity : 1 },
          ]}>
            <Animated.View style={[
              s.battleCardInner,
              winnerId === currentPair.a.id && { borderColor: glowBorderColor, borderWidth: 2 },
              winnerId === currentPair.a.id && { shadowColor: ARENA.winGreen, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 12 },
            ]}>
              {winnerId === currentPair.a.id && (
                <Animated.View style={[s.winnerBadge, { opacity: glowShadowOpacity }]}>
                  <Text style={s.winnerBadgeText}>CHOSEN</Text>
                </Animated.View>
              )}
              <TouchableOpacity activeOpacity={0.8} onPress={() => handleChoice(currentPair.a, currentPair.b)} disabled={choosing} style={{ flex: 1, justifyContent: 'space-between' }}>
                {currentPair.a.category_name && (
                  <View style={[s.categoryBadge, { backgroundColor: (currentPair.a.category_color || ARENA.accent) + '33' }]}>
                    <Text style={[s.categoryText, { color: currentPair.a.category_color || ARENA.accentGlow }]}>{currentPair.a.category_name}</Text>
                  </View>
                )}
                <Text style={s.battleTitle} numberOfLines={4}>{currentPair.a.title}</Text>
                <Text style={s.battleDesc} numberOfLines={3}>{currentPair.a.description}</Text>
                <View style={s.battleFooter}>
                  <Text style={s.battleVotes}>▲ {currentPair.a.vote_count}</Text>
                  {currentPair.a.comment_count > 0 && <Text style={s.battleComments}>💬 {currentPair.a.comment_count}</Text>}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[s.vsCircle, { transform: [{ scale: vsPulse }] }]}>
            <Text style={s.vsText}>VS</Text>
          </Animated.View>

          <Animated.View style={[
            s.battleCard,
            { transform: [{ scale: scaleB }], opacity: winnerId && winnerId !== currentPair.b.id ? loserOpacity : 1 },
          ]}>
            <Animated.View style={[
              s.battleCardInner,
              winnerId === currentPair.b.id && { borderColor: glowBorderColor, borderWidth: 2 },
              winnerId === currentPair.b.id && { shadowColor: ARENA.winGreen, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 12 },
            ]}>
              {winnerId === currentPair.b.id && (
                <Animated.View style={[s.winnerBadge, { opacity: glowShadowOpacity }]}>
                  <Text style={s.winnerBadgeText}>CHOSEN</Text>
                </Animated.View>
              )}
              <TouchableOpacity activeOpacity={0.8} onPress={() => handleChoice(currentPair.b, currentPair.a)} disabled={choosing} style={{ flex: 1, justifyContent: 'space-between' }}>
                {currentPair.b.category_name && (
                  <View style={[s.categoryBadge, { backgroundColor: (currentPair.b.category_color || ARENA.accent) + '33' }]}>
                    <Text style={[s.categoryText, { color: currentPair.b.category_color || ARENA.accentGlow }]}>{currentPair.b.category_name}</Text>
                  </View>
                )}
                <Text style={s.battleTitle} numberOfLines={4}>{currentPair.b.title}</Text>
                <Text style={s.battleDesc} numberOfLines={3}>{currentPair.b.description}</Text>
                <View style={s.battleFooter}>
                  <Text style={s.battleVotes}>▲ {currentPair.b.vote_count}</Text>
                  {currentPair.b.comment_count > 0 && <Text style={s.battleComments}>💬 {currentPair.b.comment_count}</Text>}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>

        <TouchableOpacity style={s.skipBtn} onPress={() => { playBattleSkip(); pickNextPair(); }} disabled={choosing}>
          <Text style={s.skipText}>Skip this battle</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Single return — arena background never remounts
  return (
    <LinearGradient
      colors={[ARENA.bgGradientTop, ARENA.bgGradientMid, ARENA.bgGradientBottom]}
      style={s.arenaGradient}
    >
      <ArenaBricks />
      <FireParticles intensity={fireIntensity} />
      {renderContent()}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  arenaGradient: {
    flex: 1,
  },
  fullPage: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 40,
    minHeight: SCREEN_HEIGHT - 220,
  },
  muteBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: ARENA.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: ARENA.cardBorder,
  },
  loadingText: { fontSize: 14, color: ARENA.textMuted, marginTop: 12 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: ARENA.text, marginTop: 16 },
  doneSubtext: { fontSize: 14, color: ARENA.textMuted, marginTop: 8, textAlign: 'center' },
  refreshBtn: {
    backgroundColor: ARENA.accent, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, marginTop: 20,
  },
  refreshBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26, fontWeight: '900', color: ARENA.text,
    letterSpacing: 3, textShadowColor: ARENA.accent, textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: { fontSize: 14, color: ARENA.textSecondary, marginBottom: 12 },
  streakRow: { marginBottom: 16 },
  streakText: {
    fontSize: 13, fontWeight: '700', color: ARENA.streakText,
    backgroundColor: ARENA.streakBg, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12,
  },

  cardsContainer: {
    flexDirection: 'row', alignItems: 'stretch',
    width: '100%',
  },
  battleCard: { flex: 1 },
  battleCardInner: {
    backgroundColor: ARENA.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: ARENA.cardBorder,
    minHeight: 200, justifyContent: 'space-between',
  },
  winnerBadge: {
    position: 'absolute', top: -10, alignSelf: 'center',
    backgroundColor: ARENA.winGreen, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 8, zIndex: 10,
    shadowColor: ARENA.winGreen, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 10,
  },
  winnerBadgeText: { color: ARENA.winGreenDark, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  categoryBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    alignSelf: 'flex-start', marginBottom: 10,
  },
  categoryText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  battleTitle: { fontSize: 16, fontWeight: '700', color: ARENA.text, lineHeight: 22, marginBottom: 8 },
  battleDesc: { fontSize: 13, color: ARENA.textSecondary, lineHeight: 18, marginBottom: 12 },
  battleFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  battleVotes: { fontSize: 14, fontWeight: '700', color: ARENA.accent },
  battleComments: { fontSize: 12, color: ARENA.textMuted },

  vsCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: ARENA.vs,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    marginHorizontal: -14, zIndex: 10,
    shadowColor: ARENA.vs, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 12, elevation: 8,
    borderWidth: 2, borderColor: '#ff6b35',
  },
  vsText: { fontSize: 14, fontWeight: '900', color: '#fff' },

  skipBtn: {
    marginTop: 24, paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 10, borderWidth: 1, borderColor: ARENA.skipBorder,
  },
  skipText: { fontSize: 14, color: ARENA.textMuted, fontWeight: '600' },
});
