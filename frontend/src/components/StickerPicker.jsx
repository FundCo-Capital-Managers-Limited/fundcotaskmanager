import React from 'react';

const STICKERS = [
  { key: 'approved', emoji: '\u2705', label: 'Approved', background: 'linear-gradient(135deg, #16a34a, #22c55e)' },
  { key: 'celebrate', emoji: '\ud83c\udf89', label: 'Celebrate', background: 'linear-gradient(135deg, #7c3aed, #a855f7)' },
  { key: 'fire', emoji: '\ud83d\udd25', label: 'Fire', background: 'linear-gradient(135deg, #ea580c, #f97316)' },
  { key: 'love', emoji: '\ud83d\udc99', label: 'Love this', background: 'linear-gradient(135deg, #2563eb, #38bdf8)' },
  { key: 'thanks', emoji: '\ud83d\ude4f', label: 'Thanks', background: 'linear-gradient(135deg, #0f766e, #14b8a6)' },
  { key: 'idea', emoji: '\ud83d\udca1', label: 'Idea', background: 'linear-gradient(135deg, #ca8a04, #facc15)' },
  { key: 'go', emoji: '\ud83d\ude80', label: 'Lets go', background: 'linear-gradient(135deg, #db2777, #f472b6)' },
  { key: 'clap', emoji: '\ud83d\udc4f', label: 'Well done', background: 'linear-gradient(135deg, #4f46e5, #818cf8)' },
  { key: 'urgent', emoji: '\u26a1', label: 'Urgent', background: 'linear-gradient(135deg, #dc2626, #f87171)' },
  { key: 'noted', emoji: '\ud83d\udcdd', label: 'Noted', background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)' },
  { key: 'mindblown', emoji: '\ud83e\udd2f', label: 'Wow', background: 'linear-gradient(135deg, #9333ea, #c084fc)' },
  { key: 'done', emoji: '\u2714\ufe0f', label: 'Done', background: 'linear-gradient(135deg, #15803d, #4ade80)' },
];

export const getStickerByKey = (key) => STICKERS.find((sticker) => sticker.key === key) || null;

const StickerPicker = ({ onPick, onClose }) => (
  <div
    className="absolute bottom-full left-0 right-0 mb-3 rounded-[1.4rem] border p-3 shadow-2xl"
    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
  >
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-xs font-black uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Stickers</p>
      <button type="button" onClick={onClose} className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
        Close
      </button>
    </div>
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {STICKERS.map((sticker) => (
        <button
          key={sticker.key}
          type="button"
          onClick={() => onPick(sticker)}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[1rem] px-2 py-2 text-center transition-transform hover:-translate-y-0.5"
          style={{ background: sticker.background }}
          title={sticker.label}
        >
          <span className="text-2xl leading-none">{sticker.emoji}</span>
          <span className="text-[10px] font-bold leading-3 text-white">{sticker.label}</span>
        </button>
      ))}
    </div>
  </div>
);

export default StickerPicker;
