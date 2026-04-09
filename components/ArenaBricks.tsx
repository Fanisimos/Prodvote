import { View, StyleSheet } from 'react-native';

const BRICK_COLORS = [
  '#1a0a0a', '#1f0e0e', '#1c0808', '#180c0c', '#150707',
  '#1e0b0b', '#190909', '#1d0d0d', '#160606', '#1b0a0a',
];

const MORTAR = '#0a0408';

interface ArenaBricksProps {
  rows?: number;
  brickHeight?: number;
  opacity?: number;
  compact?: boolean;
}

export default function ArenaBricks({
  rows = 30,
  brickHeight = 22,
  opacity = 0.45,
  compact = false,
}: ArenaBricksProps) {
  const bricksPerRow = compact ? 4 : 6;
  const gap = compact ? 1 : 2;

  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {Array.from({ length: rows }).map((_, rowIndex) => {
        const offset = rowIndex % 2 === 0 ? 0 : 0.5;
        return (
          <View
            key={rowIndex}
            style={{
              flexDirection: 'row',
              height: brickHeight,
              marginBottom: gap,
              marginLeft: offset ? `-${100 / bricksPerRow / 2}%` : 0,
              paddingRight: offset ? 0 : 0,
            }}
          >
            {Array.from({ length: bricksPerRow + 1 }).map((_, brickIndex) => (
              <View
                key={brickIndex}
                style={{
                  flex: 1,
                  height: brickHeight,
                  backgroundColor: BRICK_COLORS[(rowIndex * 7 + brickIndex * 3) % BRICK_COLORS.length],
                  marginHorizontal: gap / 2,
                  borderRadius: 1,
                  borderWidth: 0.5,
                  borderColor: rowIndex < rows * 0.3
                    ? '#2a1515'
                    : rowIndex < rows * 0.7
                      ? '#221010'
                      : '#1a0808',
                  borderBottomColor: MORTAR,
                }}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

// Mini version for the tab button
export function ArenaBricksMini() {
  const rows = 3;
  const bricksPerRow = 5;

  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.35, overflow: 'hidden', borderRadius: 20 }]} pointerEvents="none">
      {Array.from({ length: rows }).map((_, rowIndex) => {
        const offset = rowIndex % 2 === 0 ? 0 : 0.5;
        return (
          <View
            key={rowIndex}
            style={{
              flexDirection: 'row',
              height: 10,
              marginBottom: 1,
              marginLeft: offset ? -8 : 0,
            }}
          >
            {Array.from({ length: bricksPerRow + 1 }).map((_, brickIndex) => (
              <View
                key={brickIndex}
                style={{
                  flex: 1,
                  height: 10,
                  backgroundColor: BRICK_COLORS[(rowIndex * 5 + brickIndex * 3) % BRICK_COLORS.length],
                  marginHorizontal: 0.5,
                  borderWidth: 0.5,
                  borderColor: '#2a1515',
                  borderBottomColor: MORTAR,
                }}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}
