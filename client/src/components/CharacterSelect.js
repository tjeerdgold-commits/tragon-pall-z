import React, { useState } from 'react';
import './CharacterSelect.css';

function CharacterSelect({ onSelectCharacter }) {
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  const handleSelect = (character) => {
    setSelectedCharacter(character);
    setTimeout(() => {
      onSelectCharacter(character);
    }, 300);
  };

  return (
    <div className="character-select">
      <h2 className="select-title">Choose Your Fighter</h2>
      
      <div className="character-grid">
        {/* Man Character */}
        <div 
          className={`character-card ${selectedCharacter === 'man' ? 'selected' : ''}`}
          onClick={() => handleSelect('man')}
        >
          <div className="character-avatar man-avatar">
            <div className="head"></div>
            <div className="body"></div>
            <div className="arms">
              <div className="arm-left"></div>
              <div className="arm-right"></div>
            </div>
            <div className="legs">
              <div className="leg-left"></div>
              <div className="leg-right"></div>
            </div>
          </div>
          <h3>Warrior</h3>
          <p>Strong and fast</p>
        </div>

        {/* Woman Character */}
        <div 
          className={`character-card ${selectedCharacter === 'woman' ? 'selected' : ''}`}
          onClick={() => handleSelect('woman')}
        >
          <div className="character-avatar woman-avatar">
            <div className="head"></div>
            <div className="body"></div>
            <div className="arms">
              <div className="arm-left"></div>
              <div className="arm-right"></div>
            </div>
            <div className="legs">
              <div className="leg-left"></div>
              <div className="leg-right"></div>
            </div>
          </div>
          <h3>Fighter</h3>
          <p>Swift and powerful</p>
        </div>
      </div>

      <button 
        className="btn-start"
        disabled={!selectedCharacter}
      >
        ⚡ Enter Arena
      </button>
    </div>
  );
}

export default CharacterSelect;
