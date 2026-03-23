import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GROUND_Y = 0;
const PLAYER_SIZE = 40;
const OBSTACLE_WIDTH = 30;
const OBSTACLE_HEIGHT = 40;
const GRAVITY = 0.8;
const JUMP_FORCE = -14;
const GAME_SPEED_INITIAL = 4;
const OBSTACLE_INTERVAL = 2000;

interface Obstacle {
  id: number;
  x: number;
  height: number;
}

export default function MoonPatrolScreen() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Player state
  const playerY = useRef(0);
  const playerVelocity = useRef(0);
  const isJumping = useRef(false);
  const playerAnim = useRef(new Animated.Value(0)).current;

  // Obstacles
  const obstacles = useRef<Obstacle[]>([]);
  const [obstaclePositions, setObstaclePositions] = useState<Obstacle[]>([]);
  const obstacleId = useRef(0);
  const gameSpeed = useRef(GAME_SPEED_INITIAL);

  // Game loop
  const frameRef = useRef<number | null>(null);
  const obstacleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameActive = useRef(false);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    playerY.current = 0;
    playerVelocity.current = 0;
    isJumping.current = false;
    playerAnim.setValue(0);
    obstacles.current = [];
    setObstaclePositions([]);
    obstacleId.current = 0;
    gameSpeed.current = GAME_SPEED_INITIAL;
    gameActive.current = true;

    // Spawn obstacles
    obstacleTimer.current = setInterval(() => {
      if (!gameActive.current) return;
      const height = 30 + Math.random() * 30;
      obstacles.current.push({
        id: obstacleId.current++,
        x: SCREEN_WIDTH,
        height,
      });
    }, OBSTACLE_INTERVAL);

    // Score counter
    scoreTimer.current = setInterval(() => {
      if (!gameActive.current) return;
      setScore((prev) => prev + 1);
    }, 100);

    // Game loop
    const gameLoop = () => {
      if (!gameActive.current) return;

      // Update player physics
      if (isJumping.current) {
        playerVelocity.current += GRAVITY;
        playerY.current += playerVelocity.current;

        if (playerY.current >= 0) {
          playerY.current = 0;
          playerVelocity.current = 0;
          isJumping.current = false;
        }
        playerAnim.setValue(playerY.current);
      }

      // Update obstacles
      obstacles.current = obstacles.current
        .map((o) => ({ ...o, x: o.x - gameSpeed.current }))
        .filter((o) => o.x > -OBSTACLE_WIDTH);

      // Collision detection
      const playerLeft = 60;
      const playerRight = playerLeft + PLAYER_SIZE;
      const playerBottom = -playerY.current;
      const playerTop = playerBottom + PLAYER_SIZE;

      for (const obs of obstacles.current) {
        const obsLeft = obs.x;
        const obsRight = obs.x + OBSTACLE_WIDTH;
        const obsTop = obs.height;

        if (
          playerRight > obsLeft &&
          playerLeft < obsRight &&
          playerBottom < obsTop
        ) {
          // Collision
          gameActive.current = false;
          endGame();
          return;
        }
      }

      // Gradually increase speed
      gameSpeed.current = GAME_SPEED_INITIAL + Math.floor(score / 50) * 0.5;

      setObstaclePositions([...obstacles.current]);
      frameRef.current = requestAnimationFrame(gameLoop);
    };

    frameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  function endGame() {
    setGameState('over');
    gameActive.current = false;
    if (obstacleTimer.current) clearInterval(obstacleTimer.current);
    if (scoreTimer.current) clearInterval(scoreTimer.current);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setHighScore((prev) => Math.max(prev, score));
  }

  useEffect(() => {
    return () => {
      gameActive.current = false;
      if (obstacleTimer.current) clearInterval(obstacleTimer.current);
      if (scoreTimer.current) clearInterval(scoreTimer.current);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function handleJump() {
    if (gameState === 'idle') {
      startGame();
      return;
    }
    if (gameState === 'over') {
      startGame();
      return;
    }
    if (!isJumping.current && gameState === 'playing') {
      isJumping.current = true;
      playerVelocity.current = JUMP_FORCE;
    }
  }

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={handleJump}>
      {/* Score */}
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>Score</Text>
        <Text style={styles.scoreValue}>{score}</Text>
        <Text style={styles.highScore}>Best: {highScore}</Text>
      </View>

      {/* Game area */}
      <View style={styles.gameArea}>
        {/* Stars background */}
        {[...Array(20)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: (i * 53 + 17) % (SCREEN_WIDTH - 20),
                top: (i * 37 + 11) % 200,
                width: i % 3 === 0 ? 3 : 2,
                height: i % 3 === 0 ? 3 : 2,
              },
            ]}
          />
        ))}

        {/* Ground */}
        <View style={styles.ground} />

        {/* Player */}
        <Animated.View
          style={[
            styles.player,
            {
              transform: [{ translateY: playerAnim }],
            },
          ]}
        >
          <Text style={styles.playerEmoji}>🚀</Text>
        </Animated.View>

        {/* Obstacles */}
        {obstaclePositions.map((obs) => (
          <View
            key={obs.id}
            style={[
              styles.obstacle,
              {
                left: obs.x,
                height: obs.height,
                bottom: 50,
              },
            ]}
          />
        ))}

        {/* Game states */}
        {gameState === 'idle' && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>Moon Patrol</Text>
            <Text style={styles.overlaySubtext}>Tap anywhere to start</Text>
            <Text style={styles.overlayHint}>Tap to jump over obstacles</Text>
          </View>
        )}

        {gameState === 'over' && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>Game Over</Text>
            <Text style={styles.overlayScore}>Score: {score}</Text>
            <Text style={styles.overlaySubtext}>Tap to play again</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  scoreLabel: { fontSize: 14, color: '#888' },
  scoreValue: { fontSize: 24, fontWeight: '800', color: '#7c5cfc' },
  highScore: { fontSize: 14, color: '#555', marginLeft: 'auto' },
  gameArea: {
    flex: 1, backgroundColor: '#0d0d1a', margin: 8, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a3e',
  },
  star: {
    position: 'absolute', backgroundColor: '#ffffff44', borderRadius: 2,
  },
  ground: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 50,
    backgroundColor: '#1a1a2e', borderTopWidth: 2, borderTopColor: '#2a2a3e',
  },
  player: {
    position: 'absolute', bottom: 50, left: 60,
    width: PLAYER_SIZE, height: PLAYER_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  playerEmoji: { fontSize: 30 },
  obstacle: {
    position: 'absolute', width: OBSTACLE_WIDTH,
    backgroundColor: '#ff4d6a', borderRadius: 4,
    borderWidth: 1, borderColor: '#ff4d6a88',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
  },
  overlayTitle: { fontSize: 36, fontWeight: '800', color: '#7c5cfc', marginBottom: 12 },
  overlayScore: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  overlaySubtext: { fontSize: 16, color: '#888' },
  overlayHint: { fontSize: 13, color: '#555', marginTop: 8 },
});
