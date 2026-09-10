import React, { useState, useEffect, useRef } from 'react';
import './GameArena.css';
import SoundManager from '../utils/SoundManager';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'ws://localhost:3001';

function GameArena({ arenaId, character, onBack }) {
  const [gameState, setGameState] = useState({
    playerId: null,
    players: [],
    energyBalls: [],
    myPlayer: null
  });

  const [controls, setControls] = useState({
    defending: false,
    lastActionTime: 0
  });

  const soundManager = useRef(new SoundManager());
  const ws = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(SERVER_URL);

    ws.current.onopen = () => {
      console.log('Connected to server');
      ws.current.send(JSON.stringify({
        type: 'JOIN_ARENA',
        arenaId: arenaId,
        character: character
      }));
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'JOINED':
          setGameState(prev => ({
            ...prev,
            playerId: message.playerId,
            myPlayer: message.playerData
          }));
          break;
        case 'GAME_STATE':
          setGameState(prev => ({
            ...prev,
            players: message.players,
            energyBalls: message.balls
          }));
          break;
        case 'ENERGY_BALL_FIRED':
          soundManager.current.playShoot(message.ball.attackType);
          break;
        case 'PLAYER_HIT':
          soundManager.current.playHit();
          console.log(`Hit: ${message.damage.toFixed(1)} damage`);
          break;
        case 'PLAYER_DEFENDING':
          soundManager.current.playDefend();
          break;
        case 'PLAYER_DEFEATED':
          soundManager.current.playDefeat();
          break;
        default:
          break;
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('Disconnected from server');
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [arenaId, character]);

  const handleAttack = (attackType) => {
    if (controls.defending || !gameState.myPlayer || !ws.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ws.current.send(JSON.stringify({
      type: 'SHOOT',
      targetX: centerX,
      targetY: centerY,
      attackType: attackType
    }));
  };

  const handleDefend = () => {
    if (!gameState.myPlayer || !ws.current) return;
    
    setControls(prev => ({ ...prev, defending: true, lastActionTime: Date.now() }));
    
    ws.current.send(JSON.stringify({ type: 'DEFEND' }));

    setTimeout(() => {
      setControls(prev => ({ ...prev, defending: false }));
    }, 800);
  };

  const handleMouseMove = (e) => {
    if (!gameState.myPlayer || !ws.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ws.current.send(JSON.stringify({
      type: 'POSITION',
      x: x,
      y: y
    }));
  };

  // Rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const draw = () => {
      ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(0, 191, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw energy balls
      gameState.energyBalls.forEach(ball => {
        let ballColor = '#ffd700';
        if (ball.attackType === 'light') ballColor = '#87ceeb';
        if (ball.attackType === 'medium') ballColor = '#ffd700';
        if (ball.attackType === 'heavy') ballColor = '#ff6b35';

        const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 15);
        gradient.addColorStop(0, ballColor);
        gradient.addColorStop(1, 'rgba(255, 107, 53, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = ballColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 20, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw players
      gameState.players.forEach(player => {
        if (!player) return;

        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
        ctx.fill();

        if (player.shieldActive) {
          ctx.strokeStyle = 'rgba(0, 191, 255, 0.8)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(player.x, player.y, 35, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = '#333';
        ctx.fillRect(player.x - 25, player.y - 45, 50, 8);
        
        const hpPercent = Math.max(0, player.hp / 100);
        ctx.fillStyle = hpPercent > 0.3 ? '#00ff00' : '#ff0000';
        ctx.fillRect(player.x - 25, player.y - 45, 50 * hpPercent, 8);
      });

      // Draw UI
      if (gameState.myPlayer) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`HP: ${gameState.myPlayer.hp}`, 20, 40);
        ctx.fillText(`Wins: ${gameState.myPlayer.wins} | Losses: ${gameState.myPlayer.losses}`, 20, 70);

        if (controls.defending) {
          ctx.fillStyle = '#00bfff';
          ctx.font = 'bold 16px Arial';
          ctx.fillText('DEFENDING', 20, 100);
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, controls]);

  return (
    <div className="game-arena">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseMove={handleMouseMove}
        className="game-canvas"
      />

      <div className="controls-bottom">
        <button
          className="btn-attack btn-light"
          onMouseDown={() => handleAttack('light')}
          onTouchStart={() => handleAttack('light')}
        >
          🔵 Light
        </button>
        <button
          className="btn-attack btn-medium"
          onMouseDown={() => handleAttack('medium')}
          onTouchStart={() => handleAttack('medium')}
        >
          🟡 Medium
        </button>
        <button
          className="btn-attack btn-heavy"
          onMouseDown={() => handleAttack('heavy')}
          onTouchStart={() => handleAttack('heavy')}
        >
          🔴 Heavy
        </button>
      </div>

      <button 
        className="btn-defend-center"
        onMouseDown={handleDefend}
        disabled={controls.defending}
        title="Defense"
      >
        🛡️
      </button>

      <button className="btn-back" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

export default GameArena;
