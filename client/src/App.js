import React, { useState } from 'react';
import './App.css';
import GameArena from './components/GameArena';
import JoinArena from './components/JoinArena';

function App() {
  const [gameState, setGameState] = useState('menu'); // menu, playing
  const [arenaId, setArenaId] = useState(null);

  const handleJoinArena = (arenaIdInput) => {
    setArenaId(arenaIdInput);
    setGameState('playing');
  };

  const handleBackToMenu = () => {
    setGameState('menu');
    setArenaId(null);
  };

  return (
    <div className="app">
      {gameState === 'menu' && (
        <JoinArena onJoin={handleJoinArena} />
      )}
      {gameState === 'playing' && arenaId && (
        <GameArena arenaId={arenaId} onBack={handleBackToMenu} />
      )}
    </div>
  );
}

export default App;
