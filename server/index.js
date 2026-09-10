const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Game state
const arenas = new Map(); // arena_id -> { players: Map, energyBalls: [] }
const players = new Map(); // player_id -> { ws, arenaId, hp, x, y, state }

const ARENA_SIZE = 1000;
const PLAYER_MAX_HP = 100;
const ENERGY_BALL_SPEED = 5;
const ATTACK_COOLDOWN = 500; // ms
const DEFENSE_COOLDOWN = 800; // ms
const ENERGY_BALL_LIFETIME = 3000; // ms

// Create or join arena
wss.on('connection', (ws) => {
  const playerId = uuidv4();
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'JOIN_ARENA':
          handleJoinArena(playerId, ws, message.arenaId);
          break;
        case 'SHOOT':
          handleShoot(playerId, message);
          break;
        case 'DEFEND':
          handleDefend(playerId);
          break;
        case 'POSITION':
          handlePositionUpdate(playerId, message);
          break;
      }
    } catch (err) {
      console.error('Message parse error:', err);
    }
  });

  ws.on('close', () => {
    handlePlayerDisconnect(playerId);
  });
});

function handleJoinArena(playerId, ws, arenaId) {
  // Create arena if doesn't exist
  if (!arenas.has(arenaId)) {
    arenas.set(arenaId, {
      players: new Map(),
      energyBalls: [],
      gameLoopInterval: null
    });
    startGameLoop(arenaId);
  }

  const arena = arenas.get(arenaId);
  const newPlayer = {
    id: playerId,
    ws: ws,
    arenaId: arenaId,
    hp: PLAYER_MAX_HP,
    x: Math.random() * ARENA_SIZE,
    y: Math.random() * ARENA_SIZE,
    vx: 0,
    vy: 0,
    state: 'idle', // idle, attacking, defending
    lastAttackTime: 0,
    lastDefenseTime: 0,
    shieldActive: false,
    character: 'warrior', // default character
    color: `hsl(${Math.random() * 360}, 70%, 50%)`
  };

  arena.players.set(playerId, newPlayer);
  players.set(playerId, newPlayer);

  // Send join confirmation
  ws.send(JSON.stringify({
    type: 'JOINED',
    playerId: playerId,
    arenaId: arenaId,
    playerData: {
      id: playerId,
      hp: newPlayer.hp,
      x: newPlayer.x,
      y: newPlayer.y,
      color: newPlayer.color
    }
  }));

  // Broadcast player joined to arena
  broadcastToArena(arenaId, {
    type: 'PLAYER_JOINED',
    player: {
      id: playerId,
      hp: newPlayer.hp,
      x: newPlayer.x,
      y: newPlayer.y,
      color: newPlayer.color
    }
  });
}

function handleShoot(playerId, message) {
  const player = players.get(playerId);
  if (!player) return;

  const now = Date.now();
  if (now - player.lastAttackTime < ATTACK_COOLDOWN) return;
  if (player.state === 'defending') return;

  player.lastAttackTime = now;
  player.state = 'attacking';

  // Create energy ball
  const targetX = message.targetX;
  const targetY = message.targetY;
  const distance = Math.sqrt(Math.pow(targetX - player.x, 2) + Math.pow(targetY - player.y, 2));
  
  const vx = (targetX - player.x) / distance * ENERGY_BALL_SPEED;
  const vy = (targetY - player.y) / distance * ENERGY_BALL_SPEED;
  const power = message.power || 1; // 0-1 based on charge time

  const energyBall = {
    id: uuidv4(),
    shooterId: playerId,
    x: player.x,
    y: player.y,
    vx: vx,
    vy: vy,
    power: power,
    createdAt: now
  };

  const arena = arenas.get(player.arenaId);
  arena.energyBalls.push(energyBall);

  // Broadcast energy ball
  broadcastToArena(player.arenaId, {
    type: 'ENERGY_BALL_FIRED',
    ball: energyBall
  });

  // Reset to idle after cooldown
  setTimeout(() => {
    if (player.state === 'attacking') player.state = 'idle';
  }, ATTACK_COOLDOWN);
}

function handleDefend(playerId) {
  const player = players.get(playerId);
  if (!player) return;

  const now = Date.now();
  if (now - player.lastDefenseTime < DEFENSE_COOLDOWN) return;
  if (player.state === 'attacking') return;

  player.lastDefenseTime = now;
  player.state = 'defending';
  player.shieldActive = true;

  broadcastToArena(player.arenaId, {
    type: 'PLAYER_DEFENDING',
    playerId: playerId
  });

  // Reset shield after cooldown
  setTimeout(() => {
    player.shieldActive = false;
    if (player.state === 'defending') player.state = 'idle';
  }, DEFENSE_COOLDOWN);
}

function handlePositionUpdate(playerId, message) {
  const player = players.get(playerId);
  if (!player) return;

  player.x = Math.max(0, Math.min(ARENA_SIZE, message.x));
  player.y = Math.max(0, Math.min(ARENA_SIZE, message.y));
}

function handlePlayerDisconnect(playerId) {
  const player = players.get(playerId);
  if (!player) return;

  const arena = arenas.get(player.arenaId);
  if (arena) {
    arena.players.delete(playerId);
    broadcastToArena(player.arenaId, {
      type: 'PLAYER_DISCONNECTED',
      playerId: playerId
    });

    // Clean up empty arenas
    if (arena.players.size === 0) {
      clearInterval(arena.gameLoopInterval);
      arenas.delete(player.arenaId);
    }
  }

  players.delete(playerId);
}

function startGameLoop(arenaId) {
  const arena = arenas.get(arenaId);
  if (!arena) return;

  arena.gameLoopInterval = setInterval(() => {
    // Update energy balls
    const ballsToRemove = [];
    
    arena.energyBalls.forEach((ball, index) => {
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Check if out of bounds or too old
      if (
        ball.x < 0 || ball.x > ARENA_SIZE ||
        ball.y < 0 || ball.y > ARENA_SIZE ||
        Date.now() - ball.createdAt > ENERGY_BALL_LIFETIME
      ) {
        ballsToRemove.push(index);
        return;
      }

      // Check collision with players
      arena.players.forEach((player) => {
        if (player.id === ball.shooterId) return;

        const distance = Math.sqrt(Math.pow(ball.x - player.x, 2) + Math.pow(ball.y - player.y, 2));
        if (distance < 30) { // Hit radius
          let damage = 10 * ball.power;

          if (player.shieldActive) {
            // Shield blocks weak/medium attacks
            if (ball.power > 0.7) {
              damage = damage * 0.5; // Shield-breaking attacks do half damage
            } else {
              damage = 0; // Blocked
            }
          }

          player.hp -= damage;
          ballsToRemove.push(index);

          broadcastToArena(arenaId, {
            type: 'PLAYER_HIT',
            playerId: player.id,
            damage: damage,
            hp: Math.max(0, player.hp)
          });

          // Check if player is dead
          if (player.hp <= 0) {
            broadcastToArena(arenaId, {
              type: 'PLAYER_DEFEATED',
              playerId: player.id,
              defeatedBy: ball.shooterId
            });
            arena.players.delete(player.id);
            player.ws.close();
          }
        }
      });
    });

    // Remove dead balls
    ballsToRemove.sort((a, b) => b - a);
    ballsToRemove.forEach(idx => arena.energyBalls.splice(idx, 1));

    // Broadcast game state
    broadcastToArena(arenaId, {
      type: 'GAME_STATE',
      balls: arena.energyBalls,
      players: Array.from(arena.players.values()).map(p => ({
        id: p.id,
        hp: p.hp,
        x: p.x,
        y: p.y,
        state: p.state,
        shieldActive: p.shieldActive,
        color: p.color
      }))
    });
  }, 16); // ~60 FPS
}

function broadcastToArena(arenaId, message) {
  const arena = arenas.get(arenaId);
  if (!arena) return;

  const data = JSON.stringify(message);
  arena.players.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', arenas: arenas.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🐉 Tragon Pall Z server running on port ${PORT}`);
});
