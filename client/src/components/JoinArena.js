import React, { useState } from 'react';
import CharacterSelect from './CharacterSelect';
import RankingsList from './RankingsList';
import './JoinArena.css';

function JoinArena({ onJoin }) {
  const [stage, setStage] = useState('menu'); // menu, character, rankings
  const [arenaId, setArenaId] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    setStage('arena');
  };

  const handleJoin = () => {
    const id = arenaId.trim() || `arena-${Date.now()}`;
    if (selectedCharacter) {
      onJoin(id, selectedCharacter);
    }
  };

  if (stage === 'character') {
    return <CharacterSelect onSelectCharacter={handleCharacterSelect} />;
  }

  if (stage === 'rankings') {
    return (
      <div className="join-arena">
        <RankingsList onBack={() => setStage('menu')} />
      </div>
    );
  }

  return (
    <div className="join-arena">
      <div className="join-container">
        <h1 className="title">🐉 TRAGON PALL Z 🐉</h1>
        <p className="subtitle">Real-time Energy Ball Battles</p>
        
        <div className="menu-buttons">
          <button 
            className="btn btn-primary"
            onClick={() => setStage('character')}
          >
            ⚡ Play Now
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setStage('rankings')}
          >
            🏆 Rankings
          </button>
        </div>

        <div className="instructions">
          <h3>How to Play:</h3>
          <ul>
            <li>🔴 Light Attack: Quick and safe</li>
            <li>🟡 Medium Attack: Balanced power</li>
            <li>🔴 Heavy Attack: Maximum damage</li>
            <li>🛡️ Defend: Block incoming attacks (center)</li>
            <li>🏃 Move: Physical position matters</li>
            <li>💪 Manage cooldowns strategically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default JoinArena;
