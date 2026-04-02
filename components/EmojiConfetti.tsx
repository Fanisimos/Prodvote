import { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PARTICLE_COUNT = 40;

interface Props {
  emoji: string;
  visible: boolean;
  onDone: () => void;
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  startX: number;
  startY: number;
}

export default function EmojiConfetti({ emoji, visible, onDone }: Props) {
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
      startX: SCREEN_W / 2,
      startY: SCREEN_H / 2,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    // Randomize start positions and animate outward
    const animations = particles.map((p, i) => {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.8;
      const distance = 100 + Math.random() * 200;
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance - 100 - Math.random() * 150; // bias upward
      const delay = Math.random() * 200;
      const duration = 1200 + Math.random() * 600;
      const size = 0.5 + Math.random() * 1;

      p.x.setValue(0);
      p.y.setValue(0);
      p.scale.setValue(0);
      p.opacity.setValue(1);
      p.rotate.setValue(0);

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.x, {
            toValue: endX,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(p.y, {
            toValue: endY + 200, // gravity pull down
            duration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(p.scale, {
              toValue: size,
              duration: 200,
              easing: Easing.out(Easing.back(3)),
              useNativeDriver: false,
            }),
            Animated.timing(p.scale, {
              toValue: size * 0.6,
              duration: duration - 200,
              useNativeDriver: false,
            }),
          ]),
          Animated.sequence([
            Animated.delay(duration * 0.5),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: duration * 0.5,
              useNativeDriver: false,
            }),
          ]),
          Animated.timing(p.rotate, {
            toValue: (Math.random() - 0.5) * 4,
            duration,
            useNativeDriver: false,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => onDone());
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {particles.map((p, i) => {
        const rotate = p.rotate.interpolate({
          inputRange: [-2, 0, 2],
          outputRange: ['-360deg', '0deg', '360deg'],
        });
        return (
          <Animated.Text
            key={i}
            style={[
              styles.particle,
              {
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { scale: p.scale },
                  { rotate },
                ],
                opacity: p.opacity,
              },
            ]}
          >
            {emoji}
          </Animated.Text>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: '45%',
    left: '45%',
    fontSize: 28,
    zIndex: 999,
  },
});
