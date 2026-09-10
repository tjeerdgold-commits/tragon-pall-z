# 🐉 Tragon Pall Z

A real-time multiplayer battle game combining Pokémon GO mechanics with Dragon Ball Z-style energy ball combat.

## Game Mechanics

### Core Gameplay
- **Swipe to Shoot**: Swipe your finger toward an opponent to fire energy balls
- **Charge Mechanic**: Hold the ASSAULT button to charge your energy ball (longer charge = stronger attack)
- **Defense**: Press DEFEND to block incoming attacks
- **Cooldown System**:
  - After shooting, DEFEND is on cooldown (you committed to offense)
  - After defending, ASSAULT is on cooldown (you committed to defense)
- **Free-for-All Arena**: Multiple players battling simultaneously

### Winning Strategy
- Read your opponent's cooldown state
- Balance aggressive charging with defensive positioning
- Move in real life to physically dodge incoming energy balls
- Time your defense blocks to protect against powerful attacks

### Attack Power Mechanics
- **Weak/Medium Attacks**: Blocked by active defense shield
- **Powerful Attacks (70%+ charge)**: Penetrate shields, deal 50% damage
- **Charging Risk**: While charging, you cannot defend - strategic commitment required

## Tech Stack

### Backend
- **Node.js** with Express
- **WebSocket** (ws) for real-time multiplayer communication
- **Game Loop**: 60 FPS server-side physics and collision detection

### Frontend
- **React** for UI and game state management
- **HTML5 Canvas** for game rendering
- **WebSocket Client** for real-time communication

## Project Structure

```
tragon-pall-z/
├── server/
│   └── index.js           # WebSocket server, game logic, arena management
├── client/
│   ├── public/
│   │   └── index.html     # HTML template
│   └── src/
│       ├── index.js       # React entry point
│       ├── App.js         # Main app component
│       ├── App.css        # App styles
│       └── components/
│           ├── JoinArena.js    # Arena selection screen
│           ├── JoinArena.css
│           ├── GameArena.js    # Main game component
│           └── GameArena.css
└── package.json
```

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tjeerdgold-commits/tragon-pall-z.git
   cd tragon-pall-z
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

### Running the Game

1. **Start the backend server**
   ```bash
   npm start
   ```
   Server runs on `ws://localhost:3001`

2. **In a new terminal, start the React client**
   ```bash
   npm run client
   ```
   Client runs on `http://localhost:3000`

3. **Open multiple browser tabs or devices**
   - Go to `http://localhost:3000`
   - Enter the same Arena ID in each browser to join the same battle
   - Or leave blank to auto-generate a new arena

## Game Server State Management

The server manages:
- **Arenas**: Independent battle spaces
- **Players**: Health, position, state (idle/attacking/defending)
- **Energy Balls**: Position, velocity, damage, lifetime
- **Collision Detection**: Energy ball hits, shield mechanics
- **Cooldown Tracking**: Attack/defense state synchronization

## How to Extend

### Add New Characters
Modify `server/index.js` in `handleJoinArena`:
```javascript
const newPlayer = {
  // ... existing properties
  character: 'warrior', // Change to different character types
  color: `hsl(${Math.random() * 360}, 70%, 50%)`
};
```

### Adjust Game Balance
Edit these constants in `server/index.js`:
- `PLAYER_MAX_HP`: Starting health
- `ENERGY_BALL_SPEED`: How fast projectiles move
- `ATTACK_COOLDOWN`: Assault button recovery time
- `DEFENSE_COOLDOWN`: Defense button recovery time
- `ENERGY_BALL_LIFETIME`: How long projectiles persist

### Add Power-ups
Add new message types in both server and client to spawn power-ups, enhance effects, etc.

### Mobile Optimization
- Adapt controls for touch input
- Use device accelerometer for dodge mechanics
- Add vibration feedback for hits

## Vision

This is an MVP of a game that combines:
- **AR Reality**: Pokémon GO-style location awareness
- **Real-Time Combat**: DBZ energy ball mechanics
- **Strategic Depth**: Cooldown system creates mind games
- **Physical Gameplay**: Real-world movement matters

Future versions could add:
- Mobile AR camera overlay
- Character progression and leveling
- Different attack types and special moves
- Ranked matchmaking
- Clans/teams

## Contributing

Have ideas to make it more fire? Let's build! 🐉⚡

## License

MIT
