import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PanResponder,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

interface Stroke {
  path: string;
  color: string;
  width: number;
}

const COLORS = ['#ffffff', '#7c5cfc', '#ff4d6a', '#ffb347', '#34d399', '#4dc9f6', '#a78bfa', '#f472b6'];
const WIDTHS = [2, 4, 8, 14];

export default function WhiteboardScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [currentColor, setCurrentColor] = useState('#ffffff');
  const [currentWidth, setCurrentWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);

  // Use refs to track current values so PanResponder closure stays fresh
  const currentPathRef = useRef('');
  const currentColorRef = useRef(currentColor);
  const currentWidthRef = useRef(currentWidth);
  const isEraserRef = useRef(isEraser);
  const colorsRef = useRef(colors);

  currentColorRef.current = currentColor;
  currentWidthRef.current = currentWidth;
  isEraserRef.current = isEraser;
  colorsRef.current = colors;

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const path = `M${locationX},${locationY}`;
        currentPathRef.current = path;
        setCurrentPath(path);
        setUndoneStrokes([]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const updated = `${currentPathRef.current} L${locationX},${locationY}`;
        currentPathRef.current = updated;
        setCurrentPath(updated);
      },
      onPanResponderRelease: () => {
        const path = currentPathRef.current;
        if (path) {
          const erasing = isEraserRef.current;
          setStrokes(prev => [...prev, {
            path,
            color: erasing ? colorsRef.current.background : currentColorRef.current,
            width: erasing ? 24 : currentWidthRef.current,
          }]);
          currentPathRef.current = '';
          setCurrentPath('');
        }
      },
    }),
    []
  );

  function undo() {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes(prev => prev.slice(0, -1));
    setUndoneStrokes(prev => [...prev, last]);
  }

  function redo() {
    if (undoneStrokes.length === 0) return;
    const last = undoneStrokes[undoneStrokes.length - 1];
    setUndoneStrokes(prev => prev.slice(0, -1));
    setStrokes(prev => [...prev, last]);
  }

  function clear() {
    setStrokes([]);
    setUndoneStrokes([]);
    setCurrentPath('');
  }

  return (
    <View style={styles.container}>
      {/* Canvas */}
      <View style={styles.canvasWrap} {...panResponder.panHandlers}>
        <Svg style={StyleSheet.absoluteFill}>
          {strokes.map((s, i) => (
            <Path
              key={i}
              d={s.path}
              stroke={s.color}
              strokeWidth={s.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={isEraser ? colors.background : currentColor}
              strokeWidth={isEraser ? 24 : currentWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>

      {/* Floating toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, !isEraser && styles.toolActive]}
          onPress={() => setIsEraser(false)}
        >
          <Text style={styles.toolIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, isEraser && styles.toolActive]}
          onPress={() => setIsEraser(true)}
        >
          <Text style={styles.toolIcon}>🧽</Text>
        </TouchableOpacity>

        <View style={styles.toolDivider} />

        <TouchableOpacity style={styles.toolBtn} onPress={undo}>
          <Text style={[styles.toolIcon, strokes.length === 0 && { opacity: 0.3 }]}>↩</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={redo}>
          <Text style={[styles.toolIcon, undoneStrokes.length === 0 && { opacity: 0.3 }]}>↪</Text>
        </TouchableOpacity>

        <View style={styles.toolDivider} />

        <TouchableOpacity style={styles.toolBtn} onPress={() => setShowTools(!showTools)}>
          <Text style={styles.toolIcon}>🎨</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={clear}>
          <Text style={styles.toolIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {showTools && (
        <View style={styles.pickerPanel}>
          <Text style={styles.pickerLabel}>COLOR</Text>
          <View style={styles.colorRow}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  currentColor === c && !isEraser && styles.colorActive,
                ]}
                onPress={() => { setCurrentColor(c); setIsEraser(false); }}
              />
            ))}
          </View>
          <Text style={[styles.pickerLabel, { marginTop: 14 }]}>SIZE</Text>
          <View style={styles.widthRow}>
            {WIDTHS.map(w => (
              <TouchableOpacity
                key={w}
                style={[styles.widthBtn, currentWidth === w && styles.widthActive]}
                onPress={() => setCurrentWidth(w)}
              >
                <View style={[styles.widthDot, { width: w + 8, height: w + 8, borderRadius: (w + 8) / 2 }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.counter}>
        <Text style={styles.counterText}>{strokes.length} strokes</Text>
      </View>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    canvasWrap: { flex: 1 },
    toolbar: {
      position: 'absolute', bottom: 30, alignSelf: 'center', flexDirection: 'row',
      backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 8,
      paddingVertical: 6, gap: 2, borderWidth: 1, borderColor: colors.surfaceBorder,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
    },
    toolBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    toolActive: { backgroundColor: Colors.primary + '30' },
    toolIcon: { fontSize: 20 },
    toolDivider: { width: 1, height: 28, backgroundColor: colors.surfaceBorder, marginHorizontal: 4, alignSelf: 'center' },
    pickerPanel: {
      position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: colors.surface,
      borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.surfaceBorder,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
    },
    pickerLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 10 },
    colorRow: { flexDirection: 'row', gap: 10 },
    colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: 'transparent' },
    colorActive: { borderColor: Colors.primary },
    widthRow: { flexDirection: 'row', gap: 8 },
    widthBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    widthActive: { backgroundColor: Colors.primary + '30', borderWidth: 1, borderColor: Colors.primary },
    widthDot: { backgroundColor: '#fff' },
    counter: { position: 'absolute', top: 16, right: 16, backgroundColor: colors.surface + 'cc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    counterText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  });
}
