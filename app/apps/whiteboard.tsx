import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

interface Point { x: number; y: number; }
interface Stroke { points: Point[]; color: string; width: number; }

const COLORS = ['#ffffff', '#7c5cfc', '#ff4d6a', '#ffb347', '#34d399', '#4dc9f6', '#a78bfa', '#f472b6'];
const WIDTHS = [2, 4, 8, 14];

export default function WhiteboardScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const BG = colors.background;

  const [currentColor, setCurrentColor] = useState('#ffffff');
  const [currentWidth, setCurrentWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  // All drawing state lives in refs — no re-renders during drawing
  const containerRef = useRef<View>(null);
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const strokes = useRef<Stroke[]>([]);
  const undone = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const drawing = useRef(false);
  const colorRef = useRef(currentColor);
  const widthRef = useRef(currentWidth);
  const eraserRef = useRef(isEraser);

  colorRef.current = currentColor;
  widthRef.current = currentWidth;
  eraserRef.current = isEraser;

  function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
    if (s.points.length < 2) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      const p = s.points[i - 1], c = s.points[i];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + c.x) / 2, (p.y + c.y) / 2);
    }
    ctx.stroke();
  }

  function fullRedraw() {
    const canvas = canvasEl.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    for (const s of strokes.current) drawStroke(ctx, s);
    if (current.current) drawStroke(ctx, current.current);
  }

  // Mount canvas via DOM — completely outside React's render
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const wrapper = document.getElementById('whiteboard-container');
    if (!wrapper) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'crosshair';
    wrapper.appendChild(canvas);
    canvasEl.current = canvas;

    function resize() {
      canvas.width = wrapper!.clientWidth;
      canvas.height = wrapper!.clientHeight;
      fullRedraw();
    }

    function getPos(e: PointerEvent): Point {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      drawing.current = true;
      current.current = {
        points: [getPos(e)],
        color: eraserRef.current ? BG : colorRef.current,
        width: eraserRef.current ? 24 : widthRef.current,
      };
      undone.current = [];
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!drawing.current || !current.current) return;
      e.preventDefault();
      current.current.points.push(getPos(e));
      fullRedraw();
    });

    canvas.addEventListener('pointerup', () => {
      if (!drawing.current) return;
      drawing.current = false;
      if (current.current && current.current.points.length > 1) {
        strokes.current.push(current.current);
        setStrokeCount(strokes.current.length);
      }
      current.current = null;
      fullRedraw();
    });

    canvas.addEventListener('pointerleave', () => {
      if (!drawing.current) return;
      drawing.current = false;
      if (current.current && current.current.points.length > 1) {
        strokes.current.push(current.current);
        setStrokeCount(strokes.current.length);
      }
      current.current = null;
      fullRedraw();
    });

    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      wrapper?.removeChild(canvas);
      canvasEl.current = null;
    };
  }, []);

  function undo() {
    if (strokes.current.length === 0) return;
    undone.current.push(strokes.current.pop()!);
    setStrokeCount(strokes.current.length);
    fullRedraw();
  }

  function redo() {
    if (undone.current.length === 0) return;
    strokes.current.push(undone.current.pop()!);
    setStrokeCount(strokes.current.length);
    fullRedraw();
  }

  function clear() {
    strokes.current = [];
    undone.current = [];
    setStrokeCount(0);
    fullRedraw();
  }

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.nativeCanvas}>
          <Text style={styles.canvasPlaceholder}>
            Drawing works best on web. Native canvas coming soon.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Canvas is mounted here via DOM — React won't touch it */}
      <View style={styles.canvasWrap} nativeID="whiteboard-container" />

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
          <Text style={[styles.toolIcon, strokeCount === 0 && { opacity: 0.3 }]}>↩</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={redo}>
          <Text style={styles.toolIcon}>↪</Text>
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
        <Text style={styles.counterText}>{strokeCount} strokes</Text>
      </View>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    canvasWrap: { flex: 1 },
    nativeCanvas: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    canvasPlaceholder: { fontSize: 16, color: colors.textSecondary, opacity: 0.5 },
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
