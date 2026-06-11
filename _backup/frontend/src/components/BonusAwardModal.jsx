// components/BonusAwardModal.jsx
import React, { useState } from 'react';
import { X, Gift, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const getFullName = (user) => {
  if (!user) return 'Unknown User';
  if (user.fullName) return user.fullName.trim();
  if (user.firstName || user.lastName)
    return `${user.firstName || ''} ${user.lastName || ''} ${user.otherName || ''}`.trim();
  return user.name?.trim() || 'Unknown User';
};

const PRESET_AMOUNTS = [50, 100, 250, 500];

const BonusAwardModal = ({ isOpen, onClose, targetUser }) => {
  const [amount,  setAmount]  = useState(100);
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAward = async () => {
    if (!amount || amount <= 0) return;
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/performance/award`,
        { userId: targetUser?._id || targetUser?.id, bonusAmount: amount, reason },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setAmount(100); setReason(''); onClose(); }, 1800);
    } catch {
      alert('Failed to award bonus');
    } finally {
      setLoading(false);
    }
  };

  const displayName = getFullName(targetUser);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18 }}
            className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(245,158,11,.12)' }}>
                  <Gift className="w-4 h-4" style={{ color: '#f59e0b' }} />
                </div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Award Bonus</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Recipient */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Recipient
                </label>
                <div className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                    style={{ backgroundColor: 'var(--brand-primary)' }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{displayName}</span>
                </div>
              </div>

              {/* Preset amounts */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Bonus Amount
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {PRESET_AMOUNTS.map(p => (
                    <button key={p} onClick={() => setAmount(p)}
                      className="py-2 rounded-xl border text-sm font-bold transition-all"
                      style={amount === p
                        ? { backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: '#fff' }
                        : { backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                      {p}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--text-muted)' }}>pts</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    min={1}
                    className="w-full text-center text-2xl font-black py-3 rounded-xl border focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--input-border)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--brand-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Reason <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Outstanding Q1 performance…"
                  className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none resize-none transition-colors"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--input-border)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--brand-accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                Cancel
              </button>
              <button onClick={handleAward} disabled={loading || !amount || amount <= 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: success ? '#16a34a' : '#f59e0b' }}>
                {success ? (
                  '✓ Awarded!'
                ) : loading ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Awarding…</>
                ) : (
                  <><Award className="w-4 h-4" /> Award {amount} pts</>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BonusAwardModal;