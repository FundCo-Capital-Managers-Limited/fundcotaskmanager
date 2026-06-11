// components/LeaderboardTable.jsx
import React from 'react';
import { Crown, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const getFullName = (player) => {
  if (!player) return 'Unknown User';
  if (player.fullName) return player.fullName.trim();
  if (player.firstName || player.lastName)
    return `${player.firstName || ''} ${player.lastName || ''} ${player.otherName || ''}`.trim();
  return player.name?.trim() || 'Unknown User';
};

const RANK_STYLE = [
  { color: '#f59e0b', bg: 'rgba(245,158,11,.08)' },  // gold
  { color: '#94a3b8', bg: 'rgba(148,163,184,.08)' }, // silver
  { color: '#b45309', bg: 'rgba(180,83,9,.08)' },    // bronze
];

const LEVEL_COLOR = {
  Novice:       '#6b7280',
  Intermediate: '#d97706',
  Advanced:     '#312783',
  Expert:       '#7c3aed',
  Master:       '#dc2626',
};

const LeaderboardTable = ({ top3, rest, onAwardBonus, onUserClick }) => {
  const fullList = [...(top3 || []), ...(rest || [])];

  if (!fullList.length) return (
    <div className="rounded-xl border py-12 text-center"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      <Crown className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No leaderboard data yet</p>
    </div>
  );

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      {/* Table header */}
      <div className="grid text-xs font-bold uppercase tracking-wider px-5 py-3 border-b"
        style={{
          backgroundColor: 'var(--brand-primary)',
          color: 'rgba(255,255,255,0.85)',
          borderColor: 'var(--border-color)',
          gridTemplateColumns: onAwardBonus
            ? '56px 1fr 100px 100px 120px 80px'
            : '56px 1fr 100px 100px 120px',
        }}>
        <span>Rank</span>
        <span>Employee</span>
        <span className="text-center">Score</span>
        <span className="text-center">Done %</span>
        <span className="text-center">Level</span>
        {onAwardBonus && <span className="text-center">Action</span>}
      </div>

      {/* Rows */}
      <div className="divide-y" style={{ divideColor: 'var(--border-color)' }}>
        {fullList.map((player, idx) => {
          const displayName = getFullName(player);
          const rs = idx < 3 ? RANK_STYLE[idx] : null;
          const lc = LEVEL_COLOR[player.level] || '#6b7280';

          return (
            <motion.div
              key={player._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => onUserClick?.(player)}
              className="grid items-center px-5 py-3.5 transition-colors cursor-pointer"
              style={{
                gridTemplateColumns: onAwardBonus
                  ? '56px 1fr 100px 100px 120px 80px'
                  : '56px 1fr 100px 100px 120px',
                backgroundColor: rs ? rs.bg : 'transparent',
              }}
              onMouseEnter={e => { if (!rs) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!rs) e.currentTarget.style.backgroundColor = 'transparent'; }}>

              {/* Rank */}
              <div className="flex items-center">
                {idx < 3 ? (
                  <Crown className="w-5 h-5" style={{ color: rs.color }} />
                ) : (
                  <span className="text-sm font-black" style={{ color: 'var(--text-muted)' }}>#{player.rank || idx + 1}</span>
                )}
              </div>

              {/* Name + avatar */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                  style={{ backgroundColor: rs ? rs.color : 'var(--brand-primary)' }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
                  {player.position && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{player.position}</p>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="text-center">
                <span className="text-base font-black" style={{ color: rs ? rs.color : 'var(--brand-primary)' }}>
                  {player.totalScore}
                </span>
              </div>

              {/* Completion rate */}
              <div className="text-center">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(22,163,74,.1)', color: '#16a34a' }}>
                  {player.completionRate}%
                </span>
              </div>

              {/* Level */}
              <div className="text-center">
                <span className="text-xs font-bold" style={{ color: lc }}>{player.level}</span>
              </div>

              {/* Bonus button */}
              {onAwardBonus && (
                <div className="text-center">
                  <button
                    onClick={e => { e.stopPropagation(); onAwardBonus(player); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#f59e0b' }}>
                    + Bonus
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LeaderboardTable;