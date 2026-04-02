import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

export type FrameAnimationType =
  | 'none'
  | 'fire'
  | 'electric'
  | 'rainbow'
  | 'breathe'
  | 'glow'
  | 'sparkle'
  | 'frost'
  | 'golden';

interface Props {
  size: number;
  color: string;
  animationType: FrameAnimationType;
  children: React.ReactNode;
}

export default function AnimatedFrame({ size, color, animationType, children }: Props) {
  const borderW = size > 60 ? 3 : 2;

  if (animationType === 'none' || size < 40) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={[styles.ring, {
          width: size, height: size, borderRadius: size / 2,
          borderWidth: borderW, borderColor: color,
        }]}>
          {children}
        </View>
      </View>
    );
  }

  const pad = size > 60 ? 16 : 10;
  const totalSize = size + pad * 2;

  return (
    <View style={[styles.container, { width: totalSize, height: totalSize }]}>
      {/* Animated border ring */}
      <AnimatedRing size={size} color={color} animationType={animationType} borderW={borderW} pad={pad} />
      {/* Avatar content centered */}
      <View style={[styles.childWrap, {
        width: size - 6, height: size - 6, borderRadius: (size - 6) / 2,
      }]}>
        {children}
      </View>
      {/* Overlay particles ON TOP */}
      <View style={[StyleSheet.absoluteFill, { width: totalSize, height: totalSize }]} pointerEvents="none">
        <OverlayEffects size={size} animationType={animationType} pad={pad} />
      </View>
    </View>
  );
}

// ─── ANIMATED RING ───
function AnimatedRing({ size, color, animationType, borderW, pad }: {
  size: number; color: string; animationType: FrameAnimationType; borderW: number; pad: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const durations: Record<string, Animated.CompositeAnimation> = {
      fire: Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0.2, duration: 400, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0.8, duration: 500, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 500, useNativeDriver: false }),
      ])),
      electric: Animated.loop(Animated.sequence([
        Animated.delay(2500),
        Animated.timing(anim, { toValue: 1, duration: 80, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 60, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 1, duration: 60, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }),
      ])),
      rainbow: Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false })
      ),
      breathe: Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])),
      glow: Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])),
      sparkle: Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])),
      frost: Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])),
      golden: Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])),
    };

    const loop = durations[animationType];
    loop?.start();
    return () => anim.stopAnimation();
  }, [animationType]);

  const ringSize = size + pad;

  const ringColors: Record<string, any> = {
    fire: {
      borderColor: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['#FF4500', '#FF8C00', '#FFD700'] }),
      borderWidth: anim.interpolate({ inputRange: [0, 1], outputRange: [borderW + 1, borderW + 4] }),
      shadowColor: '#FF4500',
      shadowOpacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
      shadowRadius: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 20] }),
    },
    electric: {
      borderColor: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['#0066AA', '#FFFFFF', '#00D4FF'] }),
      borderWidth: anim.interpolate({ inputRange: [0, 1], outputRange: [borderW, borderW + 4] }),
      shadowColor: '#00D4FF',
      shadowOpacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }),
      shadowRadius: anim.interpolate({ inputRange: [0, 1], outputRange: [2, 25] }),
    },
    rainbow: {
      borderColor: anim.interpolate({
        inputRange: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
        outputRange: ['#FF6B6B', '#FCC419', '#51CF66', '#339AF0', '#845EF7', '#F06595', '#FF6B6B'],
      }),
      borderWidth: borderW + 3,
      shadowColor: anim.interpolate({
        inputRange: [0, 0.33, 0.66, 1],
        outputRange: ['#FF6B6B', '#51CF66', '#845EF7', '#FF6B6B'],
      }),
      shadowOpacity: 0.6,
      shadowRadius: 12,
    },
    breathe: {
      borderColor: color,
      borderWidth: borderW + 1,
      opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.03] }) }],
      shadowColor: color,
      shadowOpacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.5] }),
      shadowRadius: anim.interpolate({ inputRange: [0, 1], outputRange: [2, 12] }),
    },
    glow: {
      borderColor: color,
      borderWidth: borderW + 2,
      shadowColor: color,
      shadowOpacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
      shadowRadius: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 24] }),
    },
    sparkle: {
      borderColor: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [color, '#FFFFFF', color] }),
      borderWidth: borderW + 2,
      shadowColor: '#FCC419',
      shadowOpacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.9] }),
      shadowRadius: 14,
    },
    frost: {
      borderColor: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['#74C0FC', '#FFFFFF', '#A5D8FF'] }),
      borderWidth: borderW + 2,
      shadowColor: '#74C0FC',
      shadowOpacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.8] }),
      shadowRadius: anim.interpolate({ inputRange: [0, 1], outputRange: [4, 18] }),
    },
    golden: {
      borderColor: anim.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: ['#B8860B', '#FFD700', '#FFF8DC', '#DAA520'] }),
      borderWidth: borderW + 3,
      shadowColor: '#FFD700',
      shadowOpacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
      shadowRadius: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 22] }),
    },
  };

  return (
    <Animated.View style={[{
      position: 'absolute',
      width: ringSize, height: ringSize, borderRadius: ringSize / 2,
      shadowOffset: { width: 0, height: 0 }, elevation: 10,
    }, ringColors[animationType]]} />
  );
}

// ─── OVERLAY EFFECTS ───
function OverlayEffects({ size, animationType, pad }: { size: number; animationType: FrameAnimationType; pad: number }) {
  const center = size / 2 + pad;
  const radius = size / 2 + 2;

  switch (animationType) {
    case 'fire': return <FireOverlay center={center} radius={radius} size={size} />;
    case 'electric': return <ElectricOverlay center={center} radius={radius} size={size} />;
    case 'sparkle': return <SparkleOverlay center={center} radius={radius} />;
    case 'frost': return <FrostOverlay center={center} radius={radius} />;
    case 'golden': return <GoldenOverlay center={center} size={size} pad={pad} />;
    default: return null;
  }
}

// ─── FIRE: Rising embers from bottom half ───
function FireOverlay({ center, radius, size }: { center: number; radius: number; size: number }) {
  const particleCount = size > 60 ? 10 : 6;
  return (
    <>
      {Array.from({ length: particleCount }).map((_, i) => (
        <FireEmber key={i} center={center} radius={radius} size={size} index={i} total={particleCount} />
      ))}
    </>
  );
}

function FireEmber({ center, radius, size, index, total }: {
  center: number; radius: number; size: number; index: number; total: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const stagger = (index / total) * 1800;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(stagger),
      Animated.timing(anim, { toValue: 1, duration: 1000 + Math.random() * 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  // Spread across bottom 180° arc
  const angle = ((index / total) * 160 + 190) * (Math.PI / 180);
  const startX = center + Math.cos(angle) * (radius - 2);
  const startY = center + Math.sin(angle) * (radius - 2);
  const drift = (Math.random() - 0.5) * size * 0.3;
  const pSize = 4 + Math.random() * 6;

  const colors = ['#FF4500', '#FF6B35', '#FFD700', '#FF8C00'];
  const c = colors[index % colors.length];

  return (
    <Animated.View style={{
      position: 'absolute',
      left: startX - pSize / 2,
      top: startY - pSize / 2,
      width: pSize, height: pSize,
      borderRadius: pSize / 2,
      backgroundColor: c,
      opacity: anim.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 1, 0.6, 0] }),
      transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(size * 0.6)] }) },
        { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
        { scale: anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.4, 0.2] }) },
      ],
      shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4,
    }} />
  );
}

// ─── ELECTRIC: Lightning bolts that strike across avatar ───
function ElectricOverlay({ center, radius, size }: { center: number; radius: number; size: number }) {
  return (
    <>
      <LightningBolt center={center} size={size} delay={0} startAngle={-40} endAngle={30} />
      <LightningBolt center={center} size={size} delay={2800} startAngle={20} endAngle={-25} />
      <LightningBolt center={center} size={size} delay={1500} startAngle={-15} endAngle={40} />
      {/* Flash overlay on strike */}
      <ElectricFlash center={center} size={size} />
    </>
  );
}

function LightningBolt({ center, size, delay, startAngle, endAngle }: {
  center: number; size: number; delay: number; startAngle: number; endAngle: number;
}) {
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(flash, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0.1, duration: 30, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 1, duration: 40, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.delay(4000 - delay),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const boltW = size > 60 ? 3 : 2;
  const angle = startAngle + (endAngle - startAngle) / 2;

  // Main bolt
  return (
    <>
      <Animated.View style={{
        position: 'absolute',
        left: center - boltW / 2, top: center - size * 0.35,
        width: boltW, height: size * 0.7,
        backgroundColor: '#FFFFFF',
        opacity: flash,
        borderRadius: 1,
        transform: [{ rotate: `${angle}deg` }],
        shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1, shadowRadius: 10,
      }} />
      {/* Branch */}
      <Animated.View style={{
        position: 'absolute',
        left: center + 2, top: center - size * 0.1,
        width: boltW - 0.5, height: size * 0.25,
        backgroundColor: '#FFFFFF',
        opacity: flash,
        borderRadius: 1,
        transform: [{ rotate: `${angle + 35}deg` }],
        shadowColor: '#00D4FF', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1, shadowRadius: 6,
      }} />
    </>
  );
}

function ElectricFlash({ center, size }: { center: number; size: number }) {
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(0),
      Animated.timing(flash, { toValue: 0.3, duration: 50, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.delay(2700),
      Animated.timing(flash, { toValue: 0.2, duration: 50, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.delay(1200),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      left: center - size / 2, top: center - size / 2,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#00D4FF',
      opacity: flash,
    }} />
  );
}

// ─── SPARKLE: Orbiting twinkling stars ───
function SparkleOverlay({ center, radius }: { center: number; radius: number }) {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <StarPoint key={i} center={center} radius={radius} index={i} />
      ))}
    </>
  );
}

function StarPoint({ center, radius, index }: { center: number; radius: number; index: number }) {
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(index * 300),
      Animated.timing(twinkle, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(twinkle, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.delay(2000),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const angle = (index / 10) * Math.PI * 2;
  const x = center + Math.cos(angle) * (radius + 2);
  const y = center + Math.sin(angle) * (radius + 2);
  const starSize = 4 + (index % 3) * 3;

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x - starSize / 2, top: y - starSize / 2,
      width: starSize, height: starSize, borderRadius: starSize / 2,
      backgroundColor: '#FCC419',
      opacity: twinkle,
      transform: [
        { scale: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.8] }) },
        { rotate: '45deg' },
      ],
      shadowColor: '#FCC419', shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1, shadowRadius: 6,
    }} />
  );
}

// ─── FROST: Ice crystals that grow and shatter ───
function FrostOverlay({ center, radius }: { center: number; radius: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <IceCrystal key={i} center={center} radius={radius} index={i} />
      ))}
    </>
  );
}

function IceCrystal({ center, radius, index }: { center: number; radius: number; index: number }) {
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(index * 500),
      // Grow
      Animated.timing(grow, { toValue: 1, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      // Hold
      Animated.delay(1500),
      // Shatter/fade
      Animated.timing(grow, { toValue: 0, duration: 300, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      Animated.delay(1500),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const angle = (index / 8) * Math.PI * 2;
  const x = center + Math.cos(angle) * radius;
  const y = center + Math.sin(angle) * radius;
  const crystalW = 3 + (index % 3) * 2;
  const crystalH = 8 + (index % 3) * 4;
  const rot = (angle * 180 / Math.PI) + 90;

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x - crystalW / 2, top: y - crystalH / 2,
      width: crystalW, height: crystalH,
      backgroundColor: '#E3FAFC',
      opacity: grow,
      borderRadius: 1,
      transform: [
        { rotate: `${rot}deg` },
        { scaleY: grow.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }) },
      ],
      shadowColor: '#74C0FC', shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1, shadowRadius: 5,
    }} />
  );
}

// ─── GOLDEN: Light sweep across + floating particles ───
function GoldenOverlay({ center, size, pad }: { center: number; size: number; pad: number }) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.delay(4000),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const totalSize = size + pad * 2;

  return (
    <>
      {/* Shine sweep line */}
      <Animated.View style={{
        position: 'absolute',
        left: 0, top: center - size * 0.4,
        width: 4, height: size * 0.8,
        backgroundColor: '#FFFACD',
        opacity: sweep.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0.8, 0.8, 0] }),
        borderRadius: 2,
        transform: [
          { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, totalSize] }) },
        ],
        shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1, shadowRadius: 8,
      }} />
      {/* Small golden particles */}
      {Array.from({ length: 5 }).map((_, i) => (
        <GoldenDot key={i} center={center} size={size} index={i} />
      ))}
    </>
  );
}

function GoldenDot({ center, size, index }: { center: number; size: number; index: number }) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(index * 800),
      Animated.timing(float, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const angle = (index / 5) * Math.PI * 2 + Math.PI / 4;
  const r = size / 2 + 4;
  const x = center + Math.cos(angle) * r;
  const y = center + Math.sin(angle) * r;

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x - 2, top: y - 2,
      width: 4, height: 4, borderRadius: 2,
      backgroundColor: '#FFD700',
      opacity: float.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
      transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [2, -6] }) }],
      shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1, shadowRadius: 3,
    }} />
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  ring: { alignItems: 'center', justifyContent: 'center' },
  childWrap: {
    position: 'absolute', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
});
