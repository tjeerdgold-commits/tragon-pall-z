import React, { useState, useEffect, useRef } from 'react';
import './GameArena.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'ws://localhost:3001';

function GameArena({ arenaId, onBack }) {
  const [gameState, setGameState] = useState({
    playerId: null,
    players: [],
    energyBalls: [],
    myPlayer: null
  });

  const [controls, setControls] = useState({
    charging: false,
    chargeTime: 0,
    defending: false,
    lastActionTime: 0
  });

  const ws = useRef(null);
  const canvasRef = useRef(null);
  const chargeIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Connect to WebSocket
  useEffect(() => {
    ws.current = new WebSocket(SERVER_URL);

    ws.current.onopen = () => {
      console.log('Connected to server');
      ws.current.send(JSON.stringify({
        type: 'JOIN_ARENA',
        arenaId: arenaId
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
        case 'PLAYER_HIT':
          console.log(`Player ${message.playerId} took ${message.damage} damage!`);
          break;
        case 'PLAYER_DEFEATED':
          console.log(`Player ${message.playerId} defeated!`);
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
  }, [arenaId]);

  // Handle charge button
  const handleChargeStart = () => {
    if (controls.defending) return;
    setControls(prev => ({ ...prev, charging: true, chargeTime: 0 }));
    
    chargeIntervalRef.current = setInterval(() => {
      setControls(prev => ({
        ...prev,
        chargeTime: Math.min(prev.chargeTime + 10, 3000)
      }));
    }, 10);
  };

  const handleChargeEnd = () => {
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
    }

    const power = Math.min(controls.chargeTime / 3000, 1); // Normalize to 0-1
    if (power > 0 && ws.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        ws.current.send(JSON.stringify({
          type: 'SHOOT',
          targetX: centerX,
          targetY: centerY,
          power: power
        }));
      }
    }

    setControls(prev => ({
      ...prev,
      charging: false,
      chargeTime: 0,
      lastActionTime: Date.now()
    }));
  };

  // Handle defend
  const handleDefend = () => {
    if (controls.charging) return;
    setControls(prev => ({ ...prev, defending: true, lastActionTime: Date.now() }));
    
    if (ws.current) {
      ws.current.send(JSON.stringify({ type: 'DEFEND' }));
    }

    setTimeout(() => {
      setControls(prev => ({ ...prev, defending: false }));
    }, 800);
  };

  // Handle canvas click/swipe
  const handleCanvasClick = (e) => {
    if (controls.defending || !gameState.myPlayer) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const power = Math.min(controls.chargeTime / 3000, 1);
    
    if (ws.current) {
      ws.current.send(JSON.stringify({
        type: 'SHOOT',
        targetX: x,
        targetY: y,
        power: Math.max(power, 0.3)
      }));
    }

    handleChargeEnd();
  };

  // Handle position update
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
      // Clear canvas
      ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
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
        const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 15);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 107, 53, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Aura
        ctx.strokeStyle = `rgba(255, 107, 53, ${0.5 * (1 - ball.power)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 20, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw players
      gameState.players.forEach(player => {
        if (!player) return;

        // Draw player circle
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Draw aura if defending
        if (player.shieldActive) {
          ctx.strokeStyle = 'rgba(0, 191, 255, 0.8)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(player.x, player.y, 35, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw HP bar
        ctx.fillStyle = '#333';
        ctx.fillRect(player.x - 25, player.y - 45, 50, 8);
        
        const hpPercent = Math.max(0, player.hp / 100);
        ctx.fillStyle = hpPercent > 0.3 ? '#00ff00' : '#ff0000';
        ctx.fillRect(player.x - 25, player.y - 45, 50 * hpPercent, 8);

        // Draw state
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        const stateText = player.shieldActive ? '🛡️' : (player.state === 'attacking' ? '⚔️' : '');
        ctx.fillText(stateText, player.x, player.y + 40);
      });

      // Draw UI
      if (gameState.myPlayer) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`HP: ${gameState.myPlayer.hp}`, 20, 40);

        if (controls.charging) {
          ctx.fillStyle = '#ff6b35';
          ctx.font = 'bold 16px Arial';
          ctx.fillText(`Charging: ${(controls.chargeTime / 30).toFixed(0)}%`, 20, 70);
        }

        if (controls.defending) {
          ctx.fillStyle = '#00bfff';
          ctx.font = 'bold 16px Arial';
          ctx.fillText('DEFENDING', 20, 70);
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
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        className="game-canvas"
      />

      <div className="controls">
        <button
          className="btn-control btn-assault"
          onMouseDown={handleChargeStart}
          onMouseUp={handleChargeEnd}
          onTouchStart={handleChargeStart}
          onTouchEnd={handleChargeEnd}
        >
          ⚔️ ASSAULT
        </button>
        <button
          className="btn-control btn-defend"
          onMouseDown={handleDefend}
          disabled={controls.defending}
        >
          🛡️ DEFEND
        </button>
      </div>

      <button className="btn-back" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

export default GameArena;
