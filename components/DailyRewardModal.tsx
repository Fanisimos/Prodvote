import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Colors from '../constants/Colors';
import { useTheme } from '../lib/ThemeContext';
import { playTick, playWin, playJackpot, playSpinStart } from '../lib/sounds';

const WHEEL_SEGMENTS = [
  { value: 5, color: '#ef4444', label: '5' },
  { value: 10, color: '#f59e0b', label: '10' },
  { value: 15, color: '#22c55e', label: '15' },
  { value: 20, color: '#3b82f6', label: '20' },
  { value: 25, color: '#8b5cf6', label: '25' },
  { value: 30, color: '#ec4899', label: '30' },
  { value: 40, color: '#14b8a6', label: '40' },
  { value: 50, color: '#fbbf24', label: '👑' },
];

const WHEEL_SIZE = Math.min(Dimensions.get('window').width - 120, 240);
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const DOT_RADIUS = WHEEL_RADIUS - 24; // How far dots sit from center

// Particle for confetti/explosion effects
function AnimatedParticle({ delay, x, y, emoji, duration }: {
  delay: number; x: number; y: number; emoji: string; duration: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        fontSize: 20,
        opacity: anim.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        }),
        transform: [
          { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
          { scale: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.4, 0.6] }) },
          { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${x > 0 ? 180 : -180}deg`] }) },
        ],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

interface Props {
  visible: boolean;
  streak: number;
  canClaim: boolean;
  claiming: boolean;
  onSpin: (amount: number) => void;
  onClose: () => void;
  result?: {
    success: boolean;
    coins_earned?: number;
    spin_base?: number;
    streak?: number;
    tier_multiplier?: number;
  } | null;
}

export default function DailyRewardModal({
  visible,
  streak,
  canClaim,
  claiming,
  onSpin,
  onClose,
  result,
}: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [spinValue, setSpinValue] = useState(0);
  const [showParticles, setShowParticles] = useState(false);
  const [isLegendary, setIsLegendary] = useState(false);
  const tickInterval = useRef<any>(null);

  function startTickSounds() {
    let tickSpeed = 60;
    let tickCount = 0;
    function tick() {
      playTick();
      tickCount++;
      tickSpeed = Math.min(60 + tickCount * 8, 500);
      tickInterval.current = setTimeout(tick, tickSpeed);
    }
    tick();
  }

  function stopTickSounds() {
    if (tickInterval.current) {
      clearTimeout(tickInterval.current);
      tickInterval.current = null;
    }
  }

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();
      setLanded(false);
      setSpinning(false);
      setShowParticles(false);
      setIsLegendary(false);
      spinAnim.setValue(0);
      coinAnim.setValue(0);
      glowAnim.setValue(0);
      shakeAnim.setValue(0);
      pulseAnim.setValue(1);

      // Idle pulse on the spin button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.8);
      pulseAnim.setValue(1);
      stopTickSounds();
    }
  }, [visible]);

  useEffect(() => {
    if (result?.success) {
      const isJackpot = (result.spin_base ?? 0) === 50;
      setIsLegendary(isJackpot);

      // Play reward sound
      if (isJackpot) {
        playJackpot();
      } else {
        playWin();
      }

      if (isJackpot) {
        setShowParticles(true);

        // Epic shake
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        // Golden glow pulse loop
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          ])
        ).start();

        // Coin entrance — dramatic
        Animated.spring(coinAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(coinAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [result]);

  function handleSpin() {
    if (spinning || !canClaim) return;
    setSpinning(true);

    // Play whoosh + start ticking
    playSpinStart();
    startTickSounds();

    // Pick random segment
    const segmentIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const prize = WHEEL_SEGMENTS[segmentIndex];
    setSpinValue(prize.value);

    // Calculate rotation: 6 full spins + land on segment
    const segmentAngle = 360 / WHEEL_SEGMENTS.length;
    const targetAngle = 360 * 6 + (360 - segmentIndex * segmentAngle - segmentAngle / 2);

    Animated.timing(spinAnim, {
      toValue: targetAngle,
      duration: 4500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      stopTickSounds();
      setSpinning(false);
      setLanded(true);

      if (prize.value === 50) {
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
      }

      setTimeout(() => {
        onSpin(prize.value);
      }, prize.value === 50 ? 1500 : 800);
    });
  }

  const streakDays = result?.streak ?? streak;
  const multiplier = result?.tier_multiplier ?? 1;
  const streakIcons = Array.from({ length: Math.min(streakDays, 7) }, (_, i) => i);

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  // Position dots around the wheel using trigonometry
  function getDotPosition(index: number) {
    const angle = (index * 2 * Math.PI) / WHEEL_SEGMENTS.length - Math.PI / 2; // Start from top
    return {
      left: WHEEL_RADIUS + Math.cos(angle) * DOT_RADIUS - 20,
      top: WHEEL_RADIUS + Math.sin(angle) * DOT_RADIUS - 20,
    };
  }

  const legendaryParticles = [
    { delay: 0, x: -80, y: -100, emoji: '🪙' },
    { delay: 50, x: 90, y: -90, emoji: '✨' },
    { delay: 100, x: -60, y: -120, emoji: '💰' },
    { delay: 150, x: 70, y: -110, emoji: '🪙' },
    { delay: 200, x: -100, y: -70, emoji: '⭐' },
    { delay: 250, x: 100, y: -80, emoji: '🪙' },
    { delay: 100, x: -40, y: -140, emoji: '💎' },
    { delay: 300, x: 50, y: -130, emoji: '✨' },
    { delay: 50, x: -90, y: -50, emoji: '🔥' },
    { delay: 350, x: 80, y: -60, emoji: '🪙' },
    { delay: 150, x: 30, y: -150, emoji: '👑' },
    { delay: 200, x: -70, y: -90, emoji: '💫' },
    { delay: 100, x: 110, y: -40, emoji: '🪙' },
    { delay: 250, x: -110, y: -110, emoji: '🌟' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            isLegendary && styles.legendaryModal,
            {
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          {/* Legendary glow border */}
          {isLegendary && (
            <Animated.View
              style={[styles.legendaryGlow, { opacity: glowAnim }]}
            />
          )}

          {!result?.success ? (
            // Wheel spin state
            <>
              <Text style={styles.title}>
                {canClaim ? 'Spin to Win!' : 'Come Back Tomorrow!'}
              </Text>
              <Text style={styles.subtitle}>
                {canClaim
                  ? 'Spin the wheel for your daily coins!'
                  : 'Your daily reward resets at midnight'}
              </Text>

              {/* Wheel */}
              {canClaim && (
                <View style={styles.wheelArea}>
                  {/* Pointer arrow — sits above wheel */}
                  <View style={styles.pointerWrap}>
                    <View style={styles.pointerArrow} />
                  </View>

                  {/* Outer ring */}
                  <View style={styles.outerRing}>
                    {/* Spinning wheel */}
                    <Animated.View
                      style={[
                        styles.wheel,
                        { transform: [{ rotate: spinRotation }] },
                      ]}
                    >
                      {/* Segment dots positioned absolutely */}
                      {WHEEL_SEGMENTS.map((seg, i) => {
                        const pos = getDotPosition(i);
                        const isJackpot = seg.value === 50;
                        return (
                          <View
                            key={i}
                            style={[
                              styles.dot,
                              {
                                backgroundColor: seg.color,
                                left: pos.left,
                                top: pos.top,
                              },
                              isJackpot && styles.dotJackpot,
                            ]}
                          >
                            <Text style={[
                              styles.dotText,
                              isJackpot && styles.dotTextJackpot,
                            ]}>
                              {seg.label}
                            </Text>
                          </View>
                        );
                      })}

                      {/* Center */}
                      <View style={styles.wheelCenter}>
                        <Text style={styles.wheelCenterText}>🪙</Text>
                      </View>
                    </Animated.View>
                  </View>

                  {landed && (
                    <Text style={[
                      styles.landedText,
                      spinValue === 50 && styles.landedTextLegendary,
                    ]}>
                      {spinValue === 50 ? '👑 LEGENDARY! 50!' : `🎉 ${spinValue} coins!`}
                    </Text>
                  )}
                </View>
              )}

              {/* Streak display */}
              <View style={styles.streakRow}>
                {streakIcons.map((_, i) => (
                  <Text key={i} style={styles.streakFlame}>🔥</Text>
                ))}
                {streakDays === 0 && <Text style={styles.streakFlame}>💤</Text>}
              </View>
              <Text style={styles.streakText}>
                {streakDays > 0
                  ? `${streakDays} day streak! +${Math.min(streakDays * 5, 50)} bonus`
                  : 'Start a streak for bonus coins!'}
              </Text>

              {multiplier > 1 && (
                <View style={styles.multiplierBadge}>
                  <Text style={styles.multiplierText}>{multiplier}x Tier Bonus</Text>
                </View>
              )}

              {canClaim ? (
                <Animated.View style={{ width: '100%', transform: [{ scale: !spinning && !landed ? pulseAnim : 1 }] }}>
                  <TouchableOpacity
                    style={[styles.spinBtn, (spinning || landed) && styles.spinBtnDisabled]}
                    onPress={handleSpin}
                    disabled={spinning || landed}
                  >
                    <Text style={styles.spinBtnText}>
                      {spinning ? 'Spinning...' : landed ? 'Claiming...' : '🎰 SPIN!'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnText}>Nice!</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            // Result state
            <>
              {showParticles && (
                <View style={styles.particleContainer}>
                  {legendaryParticles.map((p, i) => (
                    <AnimatedParticle key={i} delay={p.delay} x={p.x} y={p.y} emoji={p.emoji} duration={1200} />
                  ))}
                </View>
              )}

              <Animated.Text
                style={[
                  styles.coinEmoji,
                  {
                    opacity: coinAnim,
                    transform: [
                      {
                        translateY: coinAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [isLegendary ? 60 : 30, 0],
                        }),
                      },
                      {
                        scale: coinAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: isLegendary ? [0.2, 1.5, 1] : [0.5, 1.2, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {isLegendary ? '👑' : '🪙'}
              </Animated.Text>

              {isLegendary && (
                <Text style={styles.legendaryBanner}>LEGENDARY SPIN!</Text>
              )}

              <Text style={[styles.title, isLegendary && styles.legendaryTitle]}>
                +{result.coins_earned} Coins!
              </Text>
              <Text style={styles.subtitle}>
                {isLegendary
                  ? 'JACKPOT! You hit the legendary 50! Incredible luck!'
                  : (result.coins_earned ?? 0) >= 40
                  ? 'Great spin! Nice haul!'
                  : 'Every coin counts! Keep spinning daily!'}
              </Text>

              <View style={[styles.breakdownBox, isLegendary && styles.breakdownBoxLegendary]}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    {isLegendary ? '👑 Wheel spin' : 'Wheel spin'}
                  </Text>
                  <Text style={[styles.breakdownValue, isLegendary && { color: '#fbbf24' }]}>
                    {result.spin_base ?? 10}
                  </Text>
                </View>
                {(result.streak ?? 0) > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Streak bonus ({result.streak} days)
                    </Text>
                    <Text style={[styles.breakdownValue, { color: '#f59e0b' }]}>
                      +{Math.min((result.streak ?? 0) * 5, 50)}
                    </Text>
                  </View>
                )}
                {(result.tier_multiplier ?? 1) > 1 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tier multiplier</Text>
                    <Text style={[styles.breakdownValue, { color: Colors.primary }]}>
                      x{result.tier_multiplier}
                    </Text>
                  </View>
                )}
                <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                  <Text style={[styles.breakdownLabel, { fontWeight: '800', color: colors.text }]}>Total</Text>
                  <Text style={[
                    styles.breakdownValue,
                    { color: isLegendary ? '#fbbf24' : '#22c55e', fontSize: isLegendary ? 20 : 16 },
                  ]}>
                    {result.coins_earned}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.claimBtn, isLegendary && styles.legendaryBtn]}
                onPress={onClose}
              >
                <Text style={[styles.claimBtnText, isLegendary && { color: '#000' }]}>
                  {isLegendary ? '👑 Legendary!' : 'Awesome!'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      overflow: 'hidden',
    },
    legendaryModal: {
      borderWidth: 2,
      borderColor: '#fbbf24',
    },
    legendaryGlow: {
      position: 'absolute',
      top: -2, left: -2, right: -2, bottom: -2,
      borderRadius: 26,
      borderWidth: 3,
      borderColor: '#fbbf24',
      shadowColor: '#fbbf24',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 20,
      elevation: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 6,
      textAlign: 'center',
    },
    legendaryTitle: {
      fontSize: 28,
      color: '#fbbf24',
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 14,
      lineHeight: 20,
    },
    legendaryBanner: {
      fontSize: 12,
      fontWeight: '900',
      color: '#fbbf24',
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    particleContainer: {
      position: 'absolute',
      top: '40%',
      left: '50%',
      width: 0,
      height: 0,
      zIndex: 100,
    },

    // ── Wheel ──
    wheelArea: {
      alignItems: 'center',
      marginBottom: 14,
    },
    pointerWrap: {
      zIndex: 10,
      marginBottom: -8,
      alignItems: 'center',
    },
    pointerArrow: {
      width: 0,
      height: 0,
      borderLeftWidth: 12,
      borderRightWidth: 12,
      borderTopWidth: 18,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: Colors.primary,
    },
    outerRing: {
      width: WHEEL_SIZE + 16,
      height: WHEEL_SIZE + 16,
      borderRadius: (WHEEL_SIZE + 16) / 2,
      borderWidth: 4,
      borderColor: Colors.primary + '50',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    wheel: {
      width: WHEEL_SIZE,
      height: WHEEL_SIZE,
      borderRadius: WHEEL_SIZE / 2,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.surfaceBorder,
    },
    dot: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
    dotJackpot: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: '#fff',
      shadowColor: '#fbbf24',
      shadowOpacity: 0.8,
      shadowRadius: 8,
      // Adjust position for larger size
      marginLeft: -3,
      marginTop: -3,
    },
    dotText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 14,
    },
    dotTextJackpot: {
      fontSize: 20,
    },
    wheelCenter: {
      position: 'absolute',
      left: WHEEL_RADIUS - 24,
      top: WHEEL_RADIUS - 24,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: Colors.primary + '40',
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    wheelCenterText: { fontSize: 22 },
    landedText: {
      fontSize: 18,
      fontWeight: '800',
      color: '#22c55e',
      marginTop: 10,
    },
    landedTextLegendary: {
      color: '#fbbf24',
      fontSize: 17,
      textShadowColor: '#fbbf2480',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
    },

    // ── Streak ──
    streakRow: {
      flexDirection: 'row',
      gap: 4,
      marginBottom: 6,
    },
    streakFlame: { fontSize: 20 },
    streakText: {
      fontSize: 13,
      color: '#f59e0b',
      fontWeight: '700',
      marginBottom: 12,
    },
    multiplierBadge: {
      backgroundColor: Colors.primary + '20',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 10,
      marginBottom: 12,
    },
    multiplierText: {
      color: Colors.primary,
      fontWeight: '800',
      fontSize: 13,
    },

    // ── Buttons ──
    spinBtn: {
      backgroundColor: '#fbbf24',
      borderRadius: 14,
      paddingVertical: 16,
      width: '100%',
      alignItems: 'center',
    },
    spinBtnDisabled: {
      opacity: 0.6,
    },
    spinBtnText: {
      color: '#000',
      fontWeight: '900',
      fontSize: 18,
    },
    claimBtn: {
      backgroundColor: Colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      width: '100%',
      alignItems: 'center',
    },
    legendaryBtn: {
      backgroundColor: '#fbbf24',
    },
    claimBtnText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 16,
    },
    closeBtn: {
      backgroundColor: colors.surfaceBorder,
      borderRadius: 14,
      paddingVertical: 14,
      width: '100%',
      alignItems: 'center',
    },
    closeBtnText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 16,
    },

    // ── Result ──
    coinEmoji: { fontSize: 56, marginBottom: 12 },
    breakdownBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      width: '100%',
      marginBottom: 20,
      gap: 8,
    },
    breakdownBoxLegendary: {
      borderWidth: 1,
      borderColor: '#fbbf24' + '40',
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    breakdownTotal: {
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
      paddingTop: 8,
      marginTop: 4,
    },
    breakdownLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    breakdownValue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
  });
}
