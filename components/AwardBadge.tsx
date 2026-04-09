import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, TouchableOpacity } from 'react-native';
import { playAwardSound } from '../lib/awardSounds';

interface Props {
  emoji: string;
  count: number;
  animation: string;
  color: string;
  size?: number;
  onPress?: () => void;
}

export default function AwardBadge({ emoji, count, animation, color, size = 28, onPress }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const tapBounce = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Shimmer loop for premium shine
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    shimmerLoop.start();

    let loop: Animated.CompositeAnimation;

    switch (animation) {
      case 'flame':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: false }),
            Animated.timing(anim, { toValue: 0, duration: 400, easing: Easing.ease, useNativeDriver: false }),
          ])
        );
        break;
      case 'glow':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.2, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          ])
        );
        break;
      case 'launch':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: false }),
            Animated.timing(anim, { toValue: 0, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: false }),
          ])
        );
        break;
      case 'sparkle':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.3, duration: 500, useNativeDriver: false }),
            Animated.timing(pulse, { toValue: 0.9, duration: 300, useNativeDriver: false }),
            Animated.timing(pulse, { toValue: 1.15, duration: 400, useNativeDriver: false }),
            Animated.timing(pulse, { toValue: 1, duration: 300, useNativeDriver: false }),
          ])
        );
        break;
      case 'shine':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: false }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: false }),
          ])
        );
        break;
      case 'explode':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.18, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
            Animated.delay(1200),
          ])
        );
        break;
      case 'electric':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            Animated.timing(anim, { toValue: 0.6, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            Animated.timing(anim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            Animated.delay(1500),
          ])
        );
        break;
      default:
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.08, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          ])
        );
    }

    loop.start();
    return () => { loop.stop(); shimmerLoop.stop(); };
  }, [animation]);

  function handleTap() {
    playAwardSound(animation);
    tapBounce.setValue(1);
    Animated.sequence([
      Animated.timing(tapBounce, { toValue: 1.18, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(tapBounce, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]).start();
    onPress?.();
  }

  const translateY = animation === 'flame'
    ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, -3] })
    : animation === 'launch'
    ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] })
    : 0;

  const rotate = animation === 'shine'
    ? anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    : '0deg';

  const opacity = animation === 'electric'
    ? anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 0.4, 1] })
    : 1;

  // Shimmer highlight position
  const shimmerTranslateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 80],
  });

  // Border glow — subtle pulse between color tones
  const borderGlow = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [color + '66', color + 'BB', color + '66'],
  });

  return (
    <TouchableOpacity onPress={handleTap} activeOpacity={0.8}>
      <Animated.View style={[
        styles.container,
        {
          backgroundColor: color + '15',
          borderColor: borderGlow,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
          transform: [{ scale: tapBounce }],
        },
      ]}>
        {/* Emoji */}
        <Animated.Text
          style={[
            { fontSize: size * 0.6 },
            {
              transform: [
                { translateY: translateY as any },
                { scale: pulse },
                { rotate },
              ],
              opacity,
            },
          ]}
        >
          {emoji}
        </Animated.Text>

        {/* Count */}
        {count > 1 && (
          <View style={[styles.countBadge, { backgroundColor: color + '33' }]}>
            <Text style={[styles.countText, { color }]}>×{count}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: '100%',
    borderRadius: 14,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1.5,
    borderRadius: 1,
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 1,
  },
  countText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
