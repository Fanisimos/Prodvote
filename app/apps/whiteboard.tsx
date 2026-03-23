import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, PanResponder, Dimensions,
} from 'react-native';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

const COLORS = ['#fff', '#7c5cfc', '#ff4d6a', '#34d399', '#ffb347', '#4dc9f6'];
const BRUSH_SIZES = [3, 6, 10];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WhiteboardScreen() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [selectedColor, setSelectedColor] = useState('#fff');
  const [brushSize, setBrushSize] = useState(3);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newStroke: Stroke = {
          points: [{ x: locationX, y: locationY }],
          color: selectedColor,
          width: brushSize,
        };
        setCurrentStroke(newStroke);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke((prev) => {
          if (!prev) return prev;
          return { ...prev, points: [...prev.points, { x: locationX, y: locationY }] };
        });
      },
      onPanResponderRelease: () => {
        setCurrentStroke((prev) => {
          if (prev) {
            setStrokes((s) => [...s, prev]);
          }
          return null;
        });
      },
    })
  ).current;

  // We need to recreate panResponder when color/size changes
  const activePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: () => {},
      onPanResponderRelease: () => {},
    })
  );

  // Use a ref-based approach to always get latest color/size
  const colorRef = useRef(selectedColor);
  const sizeRef = useRef(brushSize);
  colorRef.current = selectedColor;
  sizeRef.current = brushSize;

  const dynamicPanResponder = useRef(
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
        setCurrentStroke(newStroke);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke((prev) => {
          if (!prev) return prev;
          return { ...prev, points: [...prev.points, { x: locationX, y: locationY }] };
        });
      },
      onPanResponderRelease: () => {
        setCurrentStroke((prev) => {
          if (prev) {
            setStrokes((s) => [...s, prev]);
          }
          return null;
        });
      },
    })
  ).current;

  function handleClear() {
    setStrokes([]);
    setCurrentStroke(null);
  }

  function handleUndo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function renderStroke(stroke: Stroke, index: number) {
    // Render stroke as a series of small circles (dots) along the path
    return stroke.points.map((point, i) => (
      <View
        key={`${index}-${i}`}
        style={{
          position: 'absolute',
          left: point.x - stroke.width / 2,
          top: point.y - stroke.width / 2,
          width: stroke.width,
          height: stroke.width,
          borderRadius: stroke.width / 2,
          backgroundColor: stroke.color,
        }}
      />
    ));
  }

  return (
    <View style={styles.container}>
      {/* Canvas */}
      <View style={styles.canvas} {...dynamicPanResponder.panHandlers}>
        {strokes.map((stroke, i) => renderStroke(stroke, i))}
        {currentStroke && renderStroke(currentStroke, strokes.length)}
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        {/* Colors */}
        <View style={styles.colorRow}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorBtn,
                { backgroundColor: color },
                selectedColor === color && styles.colorBtnActive,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        {/* Brush sizes */}
        <View style={styles.sizeRow}>
          {BRUSH_SIZES.map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.sizeBtn, brushSize === size && styles.sizeBtnActive]}
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
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleUndo}>
            <Text style={styles.actionBtnText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.clearBtn]} onPress={handleClear}>
            <Text style={[styles.actionBtnText, { color: '#ff4d6a' }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  canvas: {
    flex: 1, backgroundColor: '#111122', margin: 8, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a3e',
  },
  toolbar: {
    backgroundColor: '#1a1a2e', padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#2a2a3e',
  },
  colorRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 14 },
  colorBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#2a2a3e',
  },
  colorBtnActive: { borderColor: '#7c5cfc', borderWidth: 3 },
  sizeRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 14 },
  sizeBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#2a2a3e',
    alignItems: 'center', justifyContent: 'center',
  },
  sizeBtnActive: { backgroundColor: '#7c5cfc33', borderWidth: 1, borderColor: '#7c5cfc' },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  actionBtn: {
    backgroundColor: '#2a2a3e', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10,
  },
  actionBtnText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  clearBtn: { backgroundColor: '#ff4d6a15' },
});
