import { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, PanResponder,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from 'expo-router';
import { useTheme, Theme } from '../../lib/theme';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

const COLORS = ['#fff', '#000', '#7c5cfc', '#ff4d6a', '#34d399', '#ffb347', '#4dc9f6'];
const BRUSH_SIZES = [3, 6, 10];

// Convert points array to a smooth SVG path using quadratic bezier curves
function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    // Single dot
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.5} ${points[0].y + 0.5}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    d += ` L ${points[1].x} ${points[1].y}`;
    return d;
  }
  // Smooth curve through all points using quadratic bezier
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }
  // Last point
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export default function WhiteboardScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const s = styles(theme);

  // Disable iOS swipe-back gesture so swiping works for drawing
  useEffect(() => {
    navigation.getParent()?.setOptions({ gestureEnabled: false });
    return () => {
      navigation.getParent()?.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [selectedColor, setSelectedColor] = useState('#fff');
  const [brushSize, setBrushSize] = useState(3);

  const colorRef = useRef(selectedColor);
  const sizeRef = useRef(brushSize);
  const currentStrokeRef = useRef<Stroke | null>(null);
  colorRef.current = selectedColor;
  sizeRef.current = brushSize;

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newStroke: Stroke = {
          points: [{ x: locationX, y: locationY }],
          color: colorRef.current,
          width: sizeRef.current,
        };
        currentStrokeRef.current = newStroke;
        setCurrentStroke(newStroke);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const prev = currentStrokeRef.current;
        if (!prev) return;
        const updated = { ...prev, points: [...prev.points, { x: locationX, y: locationY }] };
        currentStrokeRef.current = updated;
        setCurrentStroke(updated);
      },
      onPanResponderRelease: () => {
        const finished = currentStrokeRef.current;
        if (finished) {
          setStrokes((s) => [...s, finished]);
        }
        currentStrokeRef.current = null;
        setCurrentStroke(null);
      },
    }),
  []);

  function handleClear() {
    setStrokes([]);
    setCurrentStroke(null);
  }

  function handleUndo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

  return (
    <View style={s.container}>
      {/* Canvas */}
      <View style={s.canvas} {...panResponder.panHandlers}>
        <Svg style={StyleSheet.absoluteFill}>
          {allStrokes.map((stroke, i) => (
            <Path
              key={i}
              d={pointsToPath(stroke.points)}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>

      {/* Toolbar */}
      <View style={s.toolbar}>
        {/* Colors */}
        <View style={s.colorRow}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                s.colorBtn,
                { backgroundColor: color },
                selectedColor === color && s.colorBtnActive,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        {/* Brush sizes */}
        <View style={s.sizeRow}>
          {BRUSH_SIZES.map((size) => (
            <TouchableOpacity
              key={size}
              style={[s.sizeBtn, brushSize === size && s.sizeBtnActive]}
              onPress={() => setBrushSize(size)}
            >
              <View
                style={{
                  width: size * 2,
                  height: size * 2,
                  borderRadius: size,
                  backgroundColor: selectedColor,
                }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={handleUndo}>
            <Text style={s.actionBtnText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.clearBtn]} onPress={handleClear}>
            <Text style={[s.actionBtnText, { color: theme.danger }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  canvas: {
    flex: 1, backgroundColor: t.surface, margin: 8, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: t.cardBorder,
  },
  toolbar: {
    backgroundColor: t.card, padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: t.cardBorder,
  },
  colorRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 14 },
  colorBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: t.cardBorder,
  },
  colorBtnActive: { borderColor: t.accent, borderWidth: 3 },
  sizeRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 14 },
  sizeBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: t.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  sizeBtnActive: { backgroundColor: t.accentLight, borderWidth: 1, borderColor: t.accent },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  actionBtn: {
    backgroundColor: t.surface, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10,
  },
  actionBtnText: { color: t.textMuted, fontWeight: '600', fontSize: 14 },
  clearBtn: { backgroundColor: t.dangerBg },
});
