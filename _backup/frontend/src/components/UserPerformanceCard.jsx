// components/UserPerformanceCard.jsx
import React from 'react';
import { Award, TrendingUp, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const getFullName = (user) => {
  if (!user) return 'Unknown User';
  if (user.fullName) return user.fullName.trim();
  if (user.firstName || user.lastName)
    return `${user.firstName || ''} ${user.lastName || ''} ${user.otherName || ''}`.trim();
  return user.name?.trim() || 'Unknown User';
};

const getInitial = (user) => {
  const name = user?.firstName || user?.name || 'U';
  return name.charAt(0).toUpperCase();
};

const LEVEL_COLOR = {
  Novice:       { color: '#6b7280', bg: '#f3f4f6' },
  Intermediate: { color: '#d97706', bg: '#fef3c7' },
  Advanced:     { color: '#312783', bg: '#eef2ff' },
  Expert:       { color: '#7c3aed', bg: '#f3e8ff' },
  Master:       { color: '#dc2626', bg: '#fef2f2' },
};

const UserPerformanceCard = ({ performance, user, compact = false, onAwardBonus }) => {
  const { totalScore = 0, completionRate = 0, level = 'Novice' } = performance || {};
  const fullName = getFullName(user);
  const initial  = getInitial(user);
  const lc       = LEVEL_COLOR[level] || LEVEL_COLOR.Novice;

  if (compact) {
    return (
      <motion.div whileHover={{ y: -2 }}
        className="rounded-xl border p-4 transition-all"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-color)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{fullName}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: lc.bg, color: lc.color }}>{level}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2.5 text-center" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <p className="text-lg font-black" style={{ color: 'var(--brand-primary)' }}>{totalScore}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Score</p>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <p className="text-lg font-black" style={{ color: '#16a34a' }}>{completionRate}%</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Done</p>
          </div>
        </div>
        {onAwardBonus && (
          <button onClick={() => onAwardBonus(user)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#f59e0b' }}>
            <Award className="w-3.5 h-3.5" /> Award Bonus
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div whileHover={{ y: -2 }}
      className="rounded-xl border p-5 transition-all"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            {initial}
          </div>
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{fullName}</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: lc.bg, color: lc.color }}>{level}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: 'var(--brand-primary)' }}>{totalScore}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>total pts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Score</span>
          </div>
          <p className="text-xl font-black" style={{ color: 'var(--brand-primary)' }}>{totalScore}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Completion</span>
          </div>
          <p className="text-xl font-black" style={{ color: '#16a34a' }}>{completionRate}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Progress</span>
          <span className="text-xs font-bold" style={{ color: 'var(--brand-primary)' }}>{completionRate}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%`, backgroundColor: 'var(--brand-primary)' }} />
        </div>
      </div>

      {onAwardBonus && (
        <button onClick={() => onAwardBonus(user)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#f59e0b' }}>
          <Award className="w-4 h-4" /> Award Bonus
        </button>
      )}
    </motion.div>
  );
};

export default UserPerformanceCard;