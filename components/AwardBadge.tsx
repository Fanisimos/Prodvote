import { useEffect, useRef } from 'react';
import { Text, Animated, Easing, StyleSheet, TouchableOpacity } from 'react-native';
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

  useEffect(() => {
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
            Animated.timing(pulse, { toValue: 1.4, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: false }),
            Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.elastic(2), useNativeDriver: false }),
            Animated.delay(1000),
          ])
        );
        break;
      case 'electric':
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: false }),
            Animated.timing(anim, { toValue: 0.3, duration: 80, useNativeDriver: false }),
            Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: false }),
            Animated.timing(anim, { toValue: 0, duration: 100, useNativeDriver: false }),
            Animated.delay(2000),
          ])
        );
        break;
      default: // bounce
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 500, easing: Easing.bounce, useNativeDriver: false }),
            Animated.timing(anim, { toValue: 0, duration: 500, useNativeDriver: false }),
          ])
        );
    }

    loop.start();
    return () => loop.stop();
  }, [animation]);

  function handleTap() {
    // Play sound effect + haptic
    playAwardSound(animation);
    // Bounce animation on tap
    tapBounce.setValue(1);
    Animated.sequence([
      Animated.timing(tapBounce, { toValue: 1.5, duration: 150, easing: Easing.out(Easing.back(3)), useNativeDriver: false }),
      Animated.timing(tapBounce, { toValue: 0.8, duration: 100, useNativeDriver: false }),
      Animated.timing(tapBounce, { toValue: 1.2, duration: 100, useNativeDriver: false }),
      Animated.timing(tapBounce, { toValue: 1, duration: 150, easing: Easing.elastic(2), useNativeDriver: false }),
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

  return (
    <TouchableOpacity onPress={handleTap} activeOpacity={0.8}>
      <Animated.View style={[
        styles.container,
        { backgroundColor: color + '18', borderColor: color + '44' },
        { transform: [{ scale: tapBounce }] },
      ]}>
        <Animated.Text
          style={[
            { fontSize: size * 0.55 },
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
        {count > 1 && (
          <Text style={[styles.count, { color }]}>×{count}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  count: {
    fontSize: 12,
    fontWeight: '800',
  },
});
