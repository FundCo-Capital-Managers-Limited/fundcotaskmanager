import React from 'react';

const BonusHistorySection = ({ bonusHistory = [] }) => {
  if (!bonusHistory.length) return null;

  return (
    <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
      <p className="text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-1.5"
        style={{ color: '#f59e0b' }}>
        🏅 Bonus Awards ({bonusHistory.length})
      </p>
      <div className="space-y-2">
        {bonusHistory.map((bonus, i) => (
          <div
            key={i}
            className="rounded-xl p-3 flex items-center justify-between"
            style={{
              backgroundColor: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.2)'
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {bonus.details}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {bonus.timestamp
                  ? new Date(bonus.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </p>
            </div>
            <div className="flex-shrink-0 ml-3 text-right">
              <span className="text-lg font-black" style={{ color: '#f59e0b' }}>
                +{bonus.details?.match(/^(\d+)/)?.[1] || '?'}
              </span>
              <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BonusHistorySection;