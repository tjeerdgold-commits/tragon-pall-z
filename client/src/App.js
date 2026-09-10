import React, { useState } from 'react';
import './App.css';
import GameArena from './components/GameArena';
import JoinArena from './components/JoinArena';

function App() {
  const [gameState, setGameState] = useState('menu');
  const [arenaId, setArenaId] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  const handleJoinArena = (arenaIdInput, character) => {
    setArenaId(arenaIdInput);
    setSelectedCharacter(character);
    setGameState('playing');
  };

  const handleBackToMenu = () => {
    setGameState('menu');
    setArenaId(null);
    setSelectedCharacter(null);
  };

  return (
    <div className="app">
      {gameState === 'menu' && (
        <JoinArena onJoin={handleJoinArena} />
      )}
      {gameState === 'playing' && arenaId && selectedCharacter && (
        <GameArena arenaId={arenaId} character={selectedCharacter} onBack={handleBackToMenu} />
      )}
    </div>
  );
}

export default App;
