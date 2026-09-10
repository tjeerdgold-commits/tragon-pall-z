import React, { useState, useEffect } from 'react';
import './RankingsList.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'ws://localhost:3001';

function RankingsList({ onBack }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await fetch(`http://localhost:3001/rankings`);
        const data = await response.json();
        setRankings(data);
      } catch (err) {
        console.error('Failed to fetch rankings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  return (
    <div className="rankings-container">
      <button className="btn-back-rankings" onClick={onBack}>← Back</button>
      
      <h2 className="rankings-title">🏆 RANKINGS 🏆</h2>
      
      {loading ? (
        <div className="loading">Loading rankings...</div>
      ) : rankings.length === 0 ? (
        <div className="no-rankings">No rankings yet. Play to earn your place!</div>
      ) : (
        <div className="rankings-list">
          {rankings.map((player, index) => (
            <div key={player.id} className="ranking-item">
              <div className="rank-badge">{index + 1}</div>
              <div className="rank-info">
                <div className="rank-stats">
                  <span className="wins">W: {player.wins}</span>
                  <span className="losses">L: {player.losses}</span>
                </div>
              </div>
              <div className="rank-ratio">
                {player.wins > 0 ? (player.wins / (player.wins + player.losses)).toFixed(2) : 0} WR
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RankingsList;
