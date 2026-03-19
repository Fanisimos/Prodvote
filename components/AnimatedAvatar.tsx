import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

interface AnimatedAvatarProps {
  letter: string;
  size?: number;
  tierColor?: string;
  frameType?: string | null;
  frameColor?: string | null;
}

export default function AnimatedAvatar({
  letter,
  size = 76,
  tierColor = Colors.primary,
  frameType,
  frameColor,
}: AnimatedAvatarProps) {
  // Shared animation values (7 general + 5 extra for challenger)
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;
  const anim4 = useRef(new Animated.Value(0)).current;
  const anim5 = useRef(new Animated.Value(0)).current;
  const anim6 = useRef(new Animated.Value(0)).current;
  const anim7 = useRef(new Animated.Value(0)).current;
  // Extra values for Challenger
  const anim8 = useRef(new Animated.Value(0)).current;
  const anim9 = useRef(new Animated.Value(0)).current;
  const anim10 = useRef(new Animated.Value(0)).current;
  const anim11 = useRef(new Animated.Value(0)).current;
  const anim12 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!frameType) return;
    const anims: Animated.CompositeAnimation[] = [];

    switch (frameType) {
      case 'glow':
        // Layer 1: Outer glow breathe
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim1, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 0.3, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // Layer 2: Inner bright pulse (faster)
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim2, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.2, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])));
        // Layer 3: Scale breathe
        anim3.setValue(1);
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim3, { toValue: 1.06, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim3, { toValue: 0.97, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        break;

      case 'pulse':
        // Layer 1: Main pulse ring scale
        anim1.setValue(1);
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim1, { toValue: 1.2, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // Layer 2: Expanding fade-out ring
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim2, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])));
        // Layer 3: Second expanding ring (offset)
        anims.push(Animated.loop(Animated.sequence([
          Animated.delay(800),
          Animated.timing(anim3, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim3, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])));
        // Layer 4: Opacity flicker
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim4, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim4, { toValue: 0.5, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        break;

      case 'ring_spin':
        // Layer 1: Main spin clockwise
        anims.push(Animated.loop(
          Animated.timing(anim1, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true })
        ));
        // Layer 2: Counter spin (slower, wider)
        anims.push(Animated.loop(
          Animated.timing(anim2, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
        ));
        // Layer 3: Third ring, fast spin
        anims.push(Animated.loop(
          Animated.timing(anim3, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
        ));
        // Layer 4: Glow pulse
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim4, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim4, { toValue: 0.3, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        break;

      case 'rainbow':
        // Layer 1: Color cycle
        anims.push(Animated.loop(
          Animated.timing(anim1, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false })
        ));
        // Layer 2: Second color cycle (offset)
        anims.push(Animated.loop(
          Animated.timing(anim2, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: false })
        ));
        // Layer 3: Slow spin
        anims.push(Animated.loop(
          Animated.timing(anim3, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
        ));
        // Layer 4: Counter spin
        anims.push(Animated.loop(
          Animated.timing(anim4, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
        ));
        // Layer 5: Pulse breathe
        anim5.setValue(1);
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim5, { toValue: 1.05, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim5, { toValue: 0.97, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        break;

      case 'fire':
        // Layer 1: Outer red glow breathe
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim1, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // Layer 2: Middle orange flicker
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim2, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.2, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])));
        // Layer 3: Inner yellow rapid flicker
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim3, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim3, { toValue: 0.1, duration: 250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // Layer 4: Spinning ember arc A
        anims.push(Animated.loop(
          Animated.timing(anim4, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true })
        ));
        // Layer 5: Spinning ember arc B (counter)
        anims.push(Animated.loop(
          Animated.timing(anim5, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true })
        ));
        // Layer 6: Scale pulse
        anim6.setValue(1);
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim6, { toValue: 1.08, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim6, { toValue: 0.96, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // Layer 7: Rapid flicker overlay
        anim7.setValue(0.6);
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim7, { toValue: 1, duration: 150, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim7, { toValue: 0.4, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim7, { toValue: 0.9, duration: 200, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim7, { toValue: 0.5, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        ])));
        break;

      case 'ice':
        // Layer 1: Outer ice glow
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim1, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 0.3, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // Layer 2: Crystal shimmer (fast flicker)
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim2, { toValue: 1, duration: 400, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.3, duration: 300, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.8, duration: 500, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.1, duration: 200, easing: Easing.linear, useNativeDriver: true }),
        ])));
        // Layer 3: Slow rotating crystal ring
        anims.push(Animated.loop(
          Animated.timing(anim3, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
        ));
        // Layer 4: Inner bright pulse
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim4, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim4, { toValue: 0.2, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])));
        // Layer 5: Scale breathe
        anim5.setValue(1);
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim5, { toValue: 1.04, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim5, { toValue: 0.98, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        break;

      case 'lightning':
        // Layer 1: Base electric glow
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim1, { toValue: 1, duration: 200, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 0.1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 0.8, duration: 150, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 0.2, duration: 80, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 1, duration: 300, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 0.4, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // Layer 2: Bolt flash (sharp spikes)
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim2, { toValue: 0, duration: 800, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.7, duration: 50, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0, duration: 500, easing: Easing.linear, useNativeDriver: true }),
        ])));
        // Layer 3: Fast spin arc
        anims.push(Animated.loop(
          Animated.timing(anim3, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })
        ));
        // Layer 4: Counter spin arc
        anims.push(Animated.loop(
          Animated.timing(anim4, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true })
        ));
        // Layer 5: Scale jitter
        anim5.setValue(1);
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim5, { toValue: 1.06, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim5, { toValue: 0.98, duration: 80, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim5, { toValue: 1.03, duration: 120, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim5, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        break;

      case 'shadow':
        // Layer 1: Dark outer pulse
        anim1.setValue(1);
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim1, { toValue: 1.18, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // Layer 2: Ghost ring expand & fade
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim2, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])));
        // Layer 3: Inner darkness flicker
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim3, { toValue: 0.8, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim3, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // Layer 4: Slow spin
        anims.push(Animated.loop(
          Animated.timing(anim4, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true })
        ));
        break;

      case 'challenger':
        // 1: Outer platinum halo — majestic slow breathe
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim1, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim1, { toValue: 0.35, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // 2: Diamond sparkle shimmer — irregular rapid flashes
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim2, { toValue: 1, duration: 250, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.15, duration: 180, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.85, duration: 350, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.05, duration: 120, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.6, duration: 400, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim2, { toValue: 0.2, duration: 300, easing: Easing.linear, useNativeDriver: true }),
        ])));
        // 3: Ornate wing arc A — slow majestic clockwise
        anims.push(Animated.loop(
          Animated.timing(anim3, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true })
        ));
        // 4: Ornate wing arc B — counter-clockwise
        anims.push(Animated.loop(
          Animated.timing(anim4, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })
        ));
        // 5: Diamond burst shockwave — sharp white flash + scale out
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim5, { toValue: 0, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim5, { toValue: 1, duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim5, { toValue: 0.2, duration: 120, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim5, { toValue: 0.9, duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim5, { toValue: 0, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ])));
        // 6: Grand scale pulse — breathing power
        anim6.setValue(1);
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim6, { toValue: 1.08, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim6, { toValue: 0.96, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        // 7: Fast inner accent spin
        anims.push(Animated.loop(
          Animated.timing(anim7, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
        ));
        // 8: Gold-to-platinum color shift
        anims.push(Animated.loop(
          Animated.timing(anim8, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: false })
        ));
        // 9: Particle orbit A — tiny dot spinning fast
        anims.push(Animated.loop(
          Animated.timing(anim9, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
        ));
        // 10: Particle orbit B — opposite direction, different speed
        anims.push(Animated.loop(
          Animated.timing(anim10, { toValue: 1, duration: 2800, easing: Easing.linear, useNativeDriver: true })
        ));
        // 11: Particle orbit C — wider, slower
        anims.push(Animated.loop(
          Animated.timing(anim11, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: true })
        ));
        // 12: Shadow aura breathe — dark power backdrop
        anims.push(Animated.loop(Animated.sequence([
          Animated.timing(anim12, { toValue: 0.5, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim12, { toValue: 0.15, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])));
        break;
    }

    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [frameType]);

  const halfSize = size / 2;
  const ringSize = size + 16;
  const ringHalf = ringSize / 2;
  const color = frameColor || '#7c5cfc';

  function renderFrame() {
    if (!frameType) return null;

    switch (frameType) {
      case 'glow':
        return (
          <>
            {/* Outer glow ring — slow breathe */}
            <Animated.View style={[s.ring, {
              width: ringSize + 10, height: ringSize + 10, borderRadius: (ringSize + 10) / 2,
              borderWidth: 3, borderColor: color,
              opacity: anim1, transform: [{ scale: anim3 }],
              shadowColor: color, shadowRadius: 20, shadowOpacity: 0.9, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Inner bright ring — faster */}
            <Animated.View style={[s.ring, {
              width: ringSize + 4, height: ringSize + 4, borderRadius: (ringSize + 4) / 2,
              borderWidth: 2, borderColor: color,
              opacity: anim2,
              shadowColor: color, shadowRadius: 12, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Core solid ring */}
            <Animated.View style={[s.ring, {
              width: ringSize, height: ringSize, borderRadius: ringHalf,
              borderWidth: 3, borderColor: color, opacity: 0.6,
            }]} />
          </>
        );

      case 'pulse':
        return (
          <>
            {/* Expanding ring 1 */}
            <Animated.View style={[s.ring, {
              width: ringSize, height: ringSize, borderRadius: ringHalf,
              borderWidth: 3, borderColor: color,
              opacity: anim2.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
              transform: [{ scale: anim2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
            }]} />
            {/* Expanding ring 2 (offset) */}
            <Animated.View style={[s.ring, {
              width: ringSize, height: ringSize, borderRadius: ringHalf,
              borderWidth: 2, borderColor: color,
              opacity: anim3.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
              transform: [{ scale: anim3.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
            }]} />
            {/* Main pulsing ring */}
            <Animated.View style={[s.ring, {
              width: ringSize, height: ringSize, borderRadius: ringHalf,
              borderWidth: 3, borderColor: color,
              opacity: anim4,
              transform: [{ scale: anim1 }],
              shadowColor: color, shadowRadius: 16, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 },
            }]} />
          </>
        );

      case 'ring_spin': {
        const spin1 = anim1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        const spin2 = anim2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
        const spin3 = anim3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        return (
          <>
            {/* Outer counter-spin ring */}
            <Animated.View style={[s.ring, {
              width: ringSize + 10, height: ringSize + 10, borderRadius: (ringSize + 10) / 2,
              borderWidth: 3, borderColor: 'transparent',
              borderTopColor: color + '40', borderLeftColor: color + '20',
              transform: [{ rotate: spin2 }],
            }]} />
            {/* Main spinning ring */}
            <Animated.View style={[s.ring, {
              width: ringSize + 4, height: ringSize + 4, borderRadius: (ringSize + 4) / 2,
              borderWidth: 4, borderColor: 'transparent',
              borderTopColor: color, borderRightColor: color + '60',
              transform: [{ rotate: spin1 }],
              shadowColor: color, shadowRadius: 14, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Inner fast spin ring */}
            <Animated.View style={[s.ring, {
              width: ringSize - 2, height: ringSize - 2, borderRadius: (ringSize - 2) / 2,
              borderWidth: 2, borderColor: 'transparent',
              borderBottomColor: color + '80', borderLeftColor: color + '30',
              transform: [{ rotate: spin3 }],
            }]} />
            {/* Glow pulse behind */}
            <Animated.View style={[s.ring, {
              width: ringSize + 6, height: ringSize + 6, borderRadius: (ringSize + 6) / 2,
              borderWidth: 2, borderColor: color,
              opacity: anim4,
              shadowColor: color, shadowRadius: 18, shadowOpacity: 0.6, shadowOffset: { width: 0, height: 0 },
            }]} />
          </>
        );
      }

      case 'rainbow': {
        const rainbowA = anim1.interpolate({
          inputRange: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
          outputRange: ['#ff4d6a', '#ffb347', '#fbbf24', '#34d399', '#4dc9f6', '#a78bfa', '#ff4d6a'],
        });
        const rainbowB = anim2.interpolate({
          inputRange: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
          outputRange: ['#4dc9f6', '#a78bfa', '#ff4d6a', '#ffb347', '#fbbf24', '#34d399', '#4dc9f6'],
        });
        const spinSlow = anim3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        const spinRev = anim4.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
        return (
          <>
            {/* Outer spinning rainbow ring */}
            <Animated.View style={[s.ring, {
              width: ringSize + 10, height: ringSize + 10, borderRadius: (ringSize + 10) / 2,
              borderWidth: 3, borderColor: rainbowA,
              transform: [{ rotate: spinSlow }, { scale: anim5 }],
              shadowColor: rainbowA as any, shadowRadius: 18, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Inner counter-spin ring (offset color) */}
            <Animated.View style={[s.ring, {
              width: ringSize + 4, height: ringSize + 4, borderRadius: (ringSize + 4) / 2,
              borderWidth: 2, borderColor: rainbowB,
              transform: [{ rotate: spinRev }],
              shadowColor: rainbowB as any, shadowRadius: 12, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Core glow ring */}
            <Animated.View style={[s.ring, {
              width: ringSize, height: ringSize, borderRadius: ringHalf,
              borderWidth: 3, borderColor: rainbowA,
              opacity: 0.7,
            }]} />
          </>
        );
      }

      case 'fire': {
        const spinA = anim4.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        const spinB = anim5.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
        return (
          <>
            {/* Layer 1: Outer red glow */}
            <Animated.View style={[s.ring, {
              width: ringSize + 12, height: ringSize + 12, borderRadius: (ringSize + 12) / 2,
              borderWidth: 4, borderColor: '#cc2200',
              opacity: anim1, transform: [{ scale: anim6 }],
              shadowColor: '#ff2200', shadowRadius: 24, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Layer 2: Middle orange flicker */}
            <Animated.View style={[s.ring, {
              width: ringSize + 6, height: ringSize + 6, borderRadius: (ringSize + 6) / 2,
              borderWidth: 3, borderColor: '#ff6b1a',
              opacity: anim2,
              shadowColor: '#ff8c00', shadowRadius: 18, shadowOpacity: 0.9, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Layer 3: Inner yellow rapid */}
            <Animated.View style={[s.ring, {
              width: ringSize + 2, height: ringSize + 2, borderRadius: (ringSize + 2) / 2,
              borderWidth: 2, borderColor: '#ffcc00',
              opacity: anim3,
              shadowColor: '#ffaa00', shadowRadius: 12, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Layer 4: Spinning ember A */}
            <Animated.View style={[s.ring, {
              width: ringSize + 8, height: ringSize + 8, borderRadius: (ringSize + 8) / 2,
              borderWidth: 3, borderColor: 'transparent',
              borderTopColor: '#ff4500', borderRightColor: '#ff8c0060',
              opacity: anim7, transform: [{ rotate: spinA }],
            }]} />
            {/* Layer 5: Spinning ember B (counter) */}
            <Animated.View style={[s.ring, {
              width: ringSize + 4, height: ringSize + 4, borderRadius: (ringSize + 4) / 2,
              borderWidth: 2, borderColor: 'transparent',
              borderBottomColor: '#ffcc00', borderLeftColor: '#ff6b3560',
              opacity: anim2, transform: [{ rotate: spinB }],
            }]} />
          </>
        );
      }

      case 'ice': {
        const iceSpin = anim3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        return (
          <>
            {/* Outer frost glow */}
            <Animated.View style={[s.ring, {
              width: ringSize + 10, height: ringSize + 10, borderRadius: (ringSize + 10) / 2,
              borderWidth: 3, borderColor: '#67e8f9',
              opacity: anim1, transform: [{ scale: anim5 }],
              shadowColor: '#22d3ee', shadowRadius: 22, shadowOpacity: 0.9, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Crystal shimmer ring */}
            <Animated.View style={[s.ring, {
              width: ringSize + 4, height: ringSize + 4, borderRadius: (ringSize + 4) / 2,
              borderWidth: 2, borderColor: '#a5f3fc',
              opacity: anim2,
              shadowColor: '#67e8f9', shadowRadius: 14, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Slow rotating crystal arc */}
            <Animated.View style={[s.ring, {
              width: ringSize + 8, height: ringSize + 8, borderRadius: (ringSize + 8) / 2,
              borderWidth: 2, borderColor: 'transparent',
              borderTopColor: '#cffafe', borderRightColor: '#67e8f940',
              transform: [{ rotate: iceSpin }],
            }]} />
            {/* Inner bright pulse */}
            <Animated.View style={[s.ring, {
              width: ringSize, height: ringSize, borderRadius: ringHalf,
              borderWidth: 3, borderColor: '#22d3ee',
              opacity: anim4,
              shadowColor: '#06b6d4', shadowRadius: 16, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 },
            }]} />
          </>
        );
      }

      case 'lightning': {
        const boltSpin = anim3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        const boltSpin2 = anim4.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
        return (
          <>
            {/* Outer electric field — flickers like real lightning */}
            <Animated.View style={[s.ring, {
              width: ringSize + 10, height: ringSize + 10, borderRadius: (ringSize + 10) / 2,
              borderWidth: 3, borderColor: '#a78bfa',
              opacity: anim1, transform: [{ scale: anim5 }],
              shadowColor: '#8b5cf6', shadowRadius: 26, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Bolt flash ring — sudden bright spikes */}
            <Animated.View style={[s.ring, {
              width: ringSize + 6, height: ringSize + 6, borderRadius: (ringSize + 6) / 2,
              borderWidth: 4, borderColor: '#00ccbb',
              opacity: anim2,
              shadowColor: '#c4b5fd', shadowRadius: 30, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Spinning electric arc A */}
            <Animated.View style={[s.ring, {
              width: ringSize + 8, height: ringSize + 8, borderRadius: (ringSize + 8) / 2,
              borderWidth: 3, borderColor: 'transparent',
              borderTopColor: '#c4b5fd', borderRightColor: '#8b5cf660',
              opacity: anim1, transform: [{ rotate: boltSpin }],
            }]} />
            {/* Spinning electric arc B (counter) */}
            <Animated.View style={[s.ring, {
              width: ringSize + 4, height: ringSize + 4, borderRadius: (ringSize + 4) / 2,
              borderWidth: 2, borderColor: 'transparent',
              borderBottomColor: '#a78bfa', borderLeftColor: '#7c3aed40',
              opacity: anim2, transform: [{ rotate: boltSpin2 }],
            }]} />
            {/* Core ring */}
            <Animated.View style={[s.ring, {
              width: ringSize, height: ringSize, borderRadius: ringHalf,
              borderWidth: 2, borderColor: '#8b5cf6',
              opacity: anim1,
            }]} />
          </>
        );
      }

      case 'shadow': {
        const shadowSpin = anim4.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        return (
          <>
            {/* Ghost expanding ring */}
            <Animated.View style={[s.ring, {
              width: ringSize, height: ringSize, borderRadius: ringHalf,
              borderWidth: 2, borderColor: '#475569',
              opacity: anim2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
              transform: [{ scale: anim2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
            }]} />
            {/* Outer dark pulse ring */}
            <Animated.View style={[s.ring, {
              width: ringSize + 8, height: ringSize + 8, borderRadius: (ringSize + 8) / 2,
              borderWidth: 3, borderColor: '#334155',
              opacity: anim3,
              transform: [{ scale: anim1 }],
              shadowColor: '#000', shadowRadius: 22, shadowOpacity: 0.9, shadowOffset: { width: 0, height: 0 },
            }]} />
            {/* Slow spinning dark arc */}
            <Animated.View style={[s.ring, {
              width: ringSize + 4, height: ringSize + 4, borderRadius: (ringSize + 4) / 2,
              borderWidth: 3, borderColor: 'transparent',
              borderTopColor: '#47556980', borderRightColor: '#1e293b60',
              transform: [{ rotate: shadowSpin }],
            }]} />
            {/* Inner dark core ring */}
            <Animated.View style={[s.ring, {
              width: ringSize, height: ringSize, borderRadius: ringHalf,
              borderWidth: 3, borderColor: '#475569',
              backgroundColor: '#0f172a30',
              opacity: anim3,
              shadowColor: '#000', shadowRadius: 16, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 },
            }]} />
          </>
        );
      }

      case 'challenger': {
        const wingA = anim3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        const wingB = anim4.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
        const wingC = anim7.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        const particleA = anim9.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        const particleB = anim10.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
        const particleC = anim11.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        // Gold ↔ Electric Blue shift (like the crest)
        const goldCyan = anim8.interpolate({
          inputRange: [0, 0.35, 0.65, 1],
          outputRange: ['#c9a00c', '#00d4ff', '#00d4ff', '#c9a00c'],
        });
        const cyanGold = anim8.interpolate({
          inputRange: [0, 0.35, 0.65, 1],
          outputRange: ['#00d4ff', '#c9a00c', '#c9a00c', '#00d4ff'],
        });
        // Diamond burst shockwave scale
        const burstScale = anim5.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
        const burstOpacity = anim5.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
        return (
          <>
            {/* L0: Deep blue power shadow aura */}
            <Animated.View style={[s.ring, {
              width: ringSize + 24, height: ringSize + 24, borderRadius: (ringSize + 24) / 2,
              borderWidth: 0, backgroundColor: '#0a1628',
              opacity: anim12,
              transform: [{ scale: anim6 }],
              shadowColor: '#001a33', shadowRadius: 34, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
            }]} />

            {/* L1: Outer gold/cyan shifting halo — the crest glow */}
            <Animated.View style={[s.ring, {
              width: ringSize + 18, height: ringSize + 18, borderRadius: (ringSize + 18) / 2,
              borderWidth: 3, borderColor: goldCyan,
              opacity: anim1, transform: [{ scale: anim6 }],
              shadowColor: '#00d4ff', shadowRadius: 34, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
            }]} />

            {/* L2: Cyan sparkle shimmer ring — diamond facets */}
            <Animated.View style={[s.ring, {
              width: ringSize + 10, height: ringSize + 10, borderRadius: (ringSize + 10) / 2,
              borderWidth: 2, borderColor: '#00e5ff',
              opacity: anim2,
              shadowColor: '#00bcd4', shadowRadius: 22, shadowOpacity: 0.9, shadowOffset: { width: 0, height: 0 },
            }]} />

            {/* L3: Wing arc A — gold, majestic clockwise */}
            <Animated.View style={[s.ring, {
              width: ringSize + 16, height: ringSize + 16, borderRadius: (ringSize + 16) / 2,
              borderWidth: 4, borderColor: 'transparent',
              borderTopColor: '#b8860b', borderRightColor: '#c9a00c50',
              opacity: anim1, transform: [{ rotate: wingA }],
            }]} />

            {/* L4: Wing arc B — cyan, counter-clockwise */}
            <Animated.View style={[s.ring, {
              width: ringSize + 14, height: ringSize + 14, borderRadius: (ringSize + 14) / 2,
              borderWidth: 3, borderColor: 'transparent',
              borderBottomColor: '#00d4ff', borderLeftColor: '#00a0cc60',
              opacity: anim1, transform: [{ rotate: wingB }],
            }]} />

            {/* L5: Electric blue wing arc C — faster, tighter */}
            <Animated.View style={[s.ring, {
              width: ringSize + 8, height: ringSize + 8, borderRadius: (ringSize + 8) / 2,
              borderWidth: 2, borderColor: 'transparent',
              borderTopColor: '#4d9eff', borderLeftColor: '#2680ff40',
              opacity: anim2, transform: [{ rotate: wingC }],
            }]} />

            {/* L6: Cyan burst shockwave — expands outward on flash */}
            <Animated.View style={[s.ring, {
              width: ringSize + 6, height: ringSize + 6, borderRadius: (ringSize + 6) / 2,
              borderWidth: 4, borderColor: '#00e5ff',
              opacity: burstOpacity,
              transform: [{ scale: burstScale }],
              shadowColor: '#00d4ff', shadowRadius: 32, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
            }]} />

            {/* L7: Inner white-cyan diamond flash — sharp bursts */}
            <Animated.View style={[s.ring, {
              width: ringSize + 4, height: ringSize + 4, borderRadius: (ringSize + 4) / 2,
              borderWidth: 3, borderColor: '#b0f0ff',
              opacity: anim5,
              shadowColor: '#00e5ff', shadowRadius: 22, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
            }]} />

            {/* L8: Particle orbit A — cyan dot, fast inner orbit */}
            <Animated.View style={[s.ring, {
              width: ringSize + 14, height: ringSize + 14, borderRadius: (ringSize + 14) / 2,
              borderWidth: 0, transform: [{ rotate: particleA }],
            }]}>
              <View style={{
                position: 'absolute', top: -3, left: '50%', marginLeft: -3,
                width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e5ff',
                shadowColor: '#00d4ff', shadowRadius: 8, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
              }} />
            </Animated.View>

            {/* L9: Particle orbit B — gold dot, opposite direction */}
            <Animated.View style={[s.ring, {
              width: ringSize + 18, height: ringSize + 18, borderRadius: (ringSize + 18) / 2,
              borderWidth: 0, transform: [{ rotate: particleB }],
            }]}>
              <View style={{
                position: 'absolute', top: -3, left: '50%', marginLeft: -3,
                width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#e8d44d',
                shadowColor: '#c9a00c', shadowRadius: 6, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
              }} />
            </Animated.View>

            {/* L10: Particle orbit C — blue dot, widest & slowest */}
            <Animated.View style={[s.ring, {
              width: ringSize + 22, height: ringSize + 22, borderRadius: (ringSize + 22) / 2,
              borderWidth: 0, transform: [{ rotate: particleC }],
            }]}>
              <View style={{
                position: 'absolute', bottom: -2, left: '50%', marginLeft: -2,
                width: 4, height: 4, borderRadius: 2, backgroundColor: '#4d9eff',
                shadowColor: '#2680ff', shadowRadius: 5, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 },
              }} />
            </Animated.View>

            {/* L11: Core ring — gold/cyan shift, always visible regal base */}
            <Animated.View style={[s.ring, {
              width: ringSize, height: ringSize, borderRadius: ringHalf,
              borderWidth: 3, borderColor: cyanGold,
              opacity: 0.85,
              shadowColor: '#00a0cc', shadowRadius: 16, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 },
            }]} />
          </>
        );
      }

      default:
        return null;
    }
  }

  const needsExtra = ['fire', 'ice', 'lightning', 'rainbow', 'ring_spin', 'challenger'].includes(frameType || '');
  const wrapperExtra = frameType === 'challenger' ? 30 : needsExtra ? 20 : 8;
  return (
    <View style={[s.wrapper, { width: ringSize + wrapperExtra, height: ringSize + wrapperExtra }]}>
      {renderFrame()}
      <View
        style={[
          s.avatar,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            borderColor: frameType ? color : tierColor,
            backgroundColor: Colors.primary,
          },
        ]}
      >
        <Text style={[s.avatarText, { fontSize: size * 0.37 }]}>
          {letter}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    position: 'absolute',
  },
  avatarText: {
    fontWeight: '800',
    color: '#fff',
  },
  ring: {
    position: 'absolute',
    elevation: 10,
  },
});
