import React, { useState } from 'react';
import './JoinArena.css';

function JoinArena({ onJoin }) {
  const [arenaId, setArenaId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleJoin = () => {
    const id = isCreating ? `arena-${Date.now()}` : arenaId;
    if (id.trim()) {
      onJoin(id);
    }
  };

  return (
    <div className="join-arena">
      <div className="join-container">
        <h1 className="title">🐉 TRAGON PALL Z 🐉</h1>
        <p className="subtitle">Real-time Energy Ball Battles</p>
        
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter Arena ID or leave blank to create"
            value={arenaId}
            onChange={(e) => setArenaId(e.target.value)}
            disabled={isCreating}
            className="arena-input"
          />
        </div>

        <div className="button-group">
          <button 
            className="btn btn-primary"
            onClick={() => {
              if (isCreating) {
                handleJoin();
              } else {
                handleJoin();
              }
            }}
          >
            {isCreating || !arenaId ? '⚡ Create New Arena' : '⚡ Join Arena'}
          </button>
        </div>

        <div className="instructions">
          <h3>How to Play:</h3>
          <ul>
            <li>🎯 Swipe toward opponent to shoot energy balls</li>
            <li>🛡️ Press DEFEND to block incoming attacks (cooldown applies)</li>
            <li>⚔️ Hold ASSAULT to charge power (makes you vulnerable)</li>
            <li>🏃 Move in real life to dodge incoming energy balls</li>
            <li>💪 First to 0 HP loses</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default JoinArena;
