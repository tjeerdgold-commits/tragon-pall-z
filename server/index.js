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
const arenas = new Map();
const players = new Map();
const rankings = new Map(); // player_id -> { wins, losses, rank }

const ARENA_SIZE = 1000;
const PLAYER_MAX_HP = 100;
const ENERGY_BALL_SPEED = 5;
const ATTACK_COOLDOWN = 500;
const DEFENSE_COOLDOWN = 800;
const ENERGY_BALL_LIFETIME = 3000;

// Attack types and their power multipliers
const ATTACK_TYPES = {
  light: { power: 0.3, cooldown: 300 },
  medium: { power: 0.6, cooldown: 400 },
  heavy: { power: 1.0, cooldown: 600 }
};

wss.on('connection', (ws) => {
  const playerId = uuidv4();
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'JOIN_ARENA':
          handleJoinArena(playerId, ws, message.arenaId, message.character);
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
        case 'GET_RANKINGS':
          handleGetRankings(ws);
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

function handleJoinArena(playerId, ws, arenaId, character) {
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
    state: 'idle',
    lastAttackTime: 0,
    lastDefenseTime: 0,
    shieldActive: false,
    character: character || 'man',
    color: character === 'woman' ? '#ff69b4' : '#4169e1',
    wins: rankings.get(playerId)?.wins || 0,
    losses: rankings.get(playerId)?.losses || 0
  };

  arena.players.set(playerId, newPlayer);
  players.set(playerId, newPlayer);

  ws.send(JSON.stringify({
    type: 'JOINED',
    playerId: playerId,
    arenaId: arenaId,
    playerData: {
      id: playerId,
      hp: newPlayer.hp,
      x: newPlayer.x,
      y: newPlayer.y,
      color: newPlayer.color,
      character: newPlayer.character,
      wins: newPlayer.wins,
      losses: newPlayer.losses
    }
  }));

  broadcastToArena(arenaId, {
    type: 'PLAYER_JOINED',
    player: {
      id: playerId,
      hp: newPlayer.hp,
      x: newPlayer.x,
      y: newPlayer.y,
      color: newPlayer.color,
      character: newPlayer.character
    }
  });
}

function handleShoot(playerId, message) {
  const player = players.get(playerId);
  if (!player) return;

  const attackType = message.attackType || 'medium';
  const attackData = ATTACK_TYPES[attackType];
  
  const now = Date.now();
  if (now - player.lastAttackTime < attackData.cooldown) return;
  if (player.state === 'defending') return;

  player.lastAttackTime = now;
  player.state = 'attacking';

  const targetX = message.targetX;
  const targetY = message.targetY;
  const distance = Math.sqrt(Math.pow(targetX - player.x, 2) + Math.pow(targetY - player.y, 2));
  
  if (distance === 0) return;
  
  const vx = (targetX - player.x) / distance * ENERGY_BALL_SPEED;
  const vy = (targetY - player.y) / distance * ENERGY_BALL_SPEED;

  const energyBall = {
    id: uuidv4(),
    shooterId: playerId,
    x: player.x,
    y: player.y,
    vx: vx,
    vy: vy,
    power: attackData.power,
    attackType: attackType,
    createdAt: now
  };

  const arena = arenas.get(player.arenaId);
  arena.energyBalls.push(energyBall);

  broadcastToArena(player.arenaId, {
    type: 'ENERGY_BALL_FIRED',
    ball: energyBall
  });

  setTimeout(() => {
    if (player.state === 'attacking') player.state = 'idle';
  }, attackData.cooldown);
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

function handleGetRankings(ws) {
  const rankingsList = Array.from(rankings.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses))
    .slice(0, 10);
  
  ws.send(JSON.stringify({
    type: 'RANKINGS',
    rankings: rankingsList
  }));
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
    const ballsToRemove = [];
    
    arena.energyBalls.forEach((ball, index) => {
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (
        ball.x < 0 || ball.x > ARENA_SIZE ||
        ball.y < 0 || ball.y > ARENA_SIZE ||
        Date.now() - ball.createdAt > ENERGY_BALL_LIFETIME
      ) {
        ballsToRemove.push(index);
        return;
      }

      arena.players.forEach((player) => {
        if (player.id === ball.shooterId) return;

        const distance = Math.sqrt(Math.pow(ball.x - player.x, 2) + Math.pow(ball.y - player.y, 2));
        if (distance < 30) {
          let damage = 10 * ball.power;

          if (player.shieldActive) {
            if (ball.power > 0.7) {
              damage = damage * 0.5;
            } else {
              damage = 0;
            }
          }

          player.hp -= damage;
          ballsToRemove.push(index);

          broadcastToArena(arenaId, {
            type: 'PLAYER_HIT',
            playerId: player.id,
            damage: damage,
            hp: Math.max(0, player.hp),
            attackType: ball.attackType
          });

          if (player.hp <= 0) {
            const winner = arena.players.get(ball.shooterId);
            if (winner) {
              winner.wins = (winner.wins || 0) + 1;
              player.losses = (player.losses || 0) + 1;
              
              if (!rankings.has(ball.shooterId)) {
                rankings.set(ball.shooterId, { wins: 0, losses: 0 });
              }
              if (!rankings.has(player.id)) {
                rankings.set(player.id, { wins: 0, losses: 0 });
              }
              
              rankings.get(ball.shooterId).wins++;
              rankings.get(player.id).losses++;
            }

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

    ballsToRemove.sort((a, b) => b - a);
    ballsToRemove.forEach(idx => arena.energyBalls.splice(idx, 1));

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
        color: p.color,
        character: p.character,
        wins: p.wins,
        losses: p.losses
      }))
    });
  }, 16);
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', arenas: arenas.size });
});

app.get('/rankings', (req, res) => {
  const rankingsList = Array.from(rankings.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses))
    .slice(0, 10);
  res.json(rankingsList);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🐉 Tragon Pall Z server running on port ${PORT}`);
});
