import React from 'react';
import './Leaderboard.css';

function Leaderboard({ leaderboard, currentUserId, error, windowDays }) {
  return (
    <section className="leaderboard-section">
      <div className="leaderboard-header">
        <h3>Weekly Ranking</h3>
        <p>Last {windowDays} days</p>
      </div>

      {error && <p className="leaderboard-error">{error}</p>}

      {!error && leaderboard.length === 0 && (
        <p className="leaderboard-empty">No weekly contributions yet.</p>
      )}

      {!error && leaderboard.length > 0 && (
        <div className="leaderboard-list">
          {leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className={`leaderboard-row ${entry.userId === currentUserId ? 'is-me' : ''}`}
            >
              <div className="leaderboard-rank">#{entry.rank}</div>
              <div className="leaderboard-identity">
                <span className="leaderboard-avatar">{entry.avatarEmoji || '🦢'}</span>
                <span className="leaderboard-name">{entry.displayName}</span>
              </div>
              <div className="leaderboard-stats">
                <span className="leaderboard-score">{entry.score} pts</span>
                <small>
                  {entry.reportCount}R / {entry.commentCount}C / {entry.reactionCount}X
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Leaderboard;
