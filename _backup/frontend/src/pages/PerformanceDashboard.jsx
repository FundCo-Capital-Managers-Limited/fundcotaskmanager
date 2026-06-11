// src/pages/PerformanceDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Trophy, Users, Gift, RefreshCw, Info, ChevronDown, ChevronUp,
  TrendingUp, Award, Star, Crown, CheckCircle2, Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import LeaderboardTable    from '../components/LeaderboardTable';
import UserPerformanceCard from '../components/UserPerformanceCard';
import BonusAwardModal     from '../components/BonusAwardModal';
import UserDetailModal     from '../components/UserDetailModal';
import BonusHistorySection from '../components/BonusHistorySection';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RANK_CONFIG = [
  { emoji: '🥇', accent: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.4)' },
  { emoji: '🥈', accent: '#94a3b8', bg: 'rgba(148,163,184,.08)', border: 'rgba(148,163,184,.4)' },
  { emoji: '🥉', accent: '#b45309', bg: 'rgba(180,83,9,.08)',    border: 'rgba(180,83,9,.4)' },
];

const getFullName = (u) => {
  if (!u) return 'Unknown';
  if (u.fullName) return u.fullName.trim();
  if (u.firstName || u.lastName) return `${u.firstName || ''} ${u.lastName || ''} ${u.otherName || ''}`.trim();
  return u.name?.trim() || 'Unknown';
};

// ── Section heading ─────────────────────────────────────────────────────────
const SectionHeading = ({ children, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-4">
    {Icon && <Icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
    <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{children}</h2>
    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
  </div>
);

// ── Podium card ─────────────────────────────────────────────────────────────
const PodiumCard = ({ player, idx, onClick }) => {
  const cfg  = RANK_CONFIG[idx];
  const name = getFullName(player);

  return (
    <motion.button
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: idx * 0.08 }}
      onClick={onClick}
      className="w-full rounded-2xl border-2 p-5 text-left relative overflow-hidden transition-all hover:-translate-y-1"
      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 8px 24px ${cfg.bg}`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

      {/* Rank emoji */}
      <div className="text-3xl mb-3">{cfg.emoji}</div>

      {/* Name + avatar */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
          style={{ backgroundColor: cfg.accent }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{player.level}</p>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-black leading-none" style={{ color: cfg.accent }}>{player.totalScore}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>points</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold" style={{ color: '#16a34a' }}>{player.completionRate}%</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>done</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
        <div className="h-full rounded-full" style={{ width: `${player.completionRate}%`, backgroundColor: cfg.accent }} />
      </div>
    </motion.button>
  );
};

// ── My Performance mini-bar ──────────────────────────────────────────────────
const MyPerformanceBar = ({ performance, user, onClick }) => {
  if (!performance) return null;
  const name = getFullName(user);
  const { totalScore = 0, completionRate = 0, level = 'Novice', taskPoints = 0, goalPoints = 0 } = performance;

  return (
    <motion.div whileHover={{ y: -1 }}
      onClick={onClick}
      className="rounded-xl border p-5 cursor-pointer transition-all"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.boxShadow = '0 4px 16px var(--shadow-color)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>

      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left: identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{name}</p>
            <p className="text-xs font-semibold" style={{ color: 'var(--brand-accent)' }}>{level}</p>
          </div>
        </div>

        {/* Right: stats */}
        <div className="flex items-center gap-6 flex-wrap">
          {[
            { label: 'Total Score',   value: totalScore,       color: 'var(--brand-primary)' },
            { label: 'Task Points',   value: taskPoints,       color: '#36a9e1' },
            { label: 'Goal Points',   value: goalPoints,       color: '#16a34a' },
            { label: 'Completion',    value: `${completionRate}%`, color: '#d97706' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Task completion</span>
          <span className="text-xs font-bold" style={{ color: 'var(--brand-primary)' }}>{completionRate}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${completionRate}%`, backgroundColor: 'var(--brand-primary)' }} />
        </div>
      </div>
    </motion.div>
  );
};

// ── Main Dashboard ───────────────────────────────────────────────────────────
const PerformanceDashboard = () => {
  const { user, onLogout } = useOutletContext();
  const [leaderboardData,      setLeaderboardData]      = useState({ top3: [], rest: [] });
  const [myPerformance,        setMyPerformance]        = useState(null);
  const [allUsers,             setAllUsers]             = useState([]);
  const [loading,              setLoading]              = useState(true);
  const [showBonusModal,       setShowBonusModal]       = useState(false);
  const [selectedBonusUser,    setSelectedBonusUser]    = useState(null);
  const [selectedDetailUserId, setSelectedDetailUserId] = useState(null);
  const [detailData,           setDetailData]           = useState(null);
  const [showDetailModal,      setShowDetailModal]      = useState(false);
  const [showPointsCalc,       setShowPointsCalc]       = useState(false);
  const [myBonusHistory, setMyBonusHistory] = useState([]);

  const isAdmin = user?.role === 'admin';

  const fetchData = async () => {
    const currentUserId = user?._id || user?.id;

    // ← SAFEGUARD: prevent the "undefined" crash
    if (!currentUserId) {
      console.warn('⚠️ User ID not ready yet – skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [lbRes, myRes, detailsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/performance/leaderboard`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        axios.get(`${API_BASE}/api/performance/me`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
        axios.get(`${API_BASE}/api/performance/user/${currentUserId}/details`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      setLeaderboardData(lbRes.data.leaderboard);
      setMyPerformance(myRes.data.performance);
      setMyBonusHistory(detailsRes.data.bonusHistory || []);   // ← this is what we need
      setAllUsers(lbRes.data.allUsers || []);
    } catch (err) {
      console.error('Fetch data error:', err);
      if (err.response?.status === 401) onLogout?.();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?._id || user?.id]);

  const fetchUserDetails = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE}/api/performance/user/${userId}/details`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setDetailData(res.data);
      setShowDetailModal(true);
    } catch {
      alert('Could not load user details');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenDetails = (userObj) => {
    if (!userObj?._id) return;
    setSelectedDetailUserId(userObj._id);
    fetchUserDetails(userObj._id);
  };

  const handleAwardBonus = (targetUser) => { setSelectedBonusUser(targetUser); setShowBonusModal(true); };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading performance data…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-7 py-4">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Performance Board</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Monthly Bonus System · 100% Transparent Scoring
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {isAdmin && (
            <button onClick={() => handleAwardBonus(null)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#f59e0b' }}>
              <Gift className="w-4 h-4" /> Award Bonus
            </button>
          )}
        </div>
      </div>

      {/* ── How points work accordion ─────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <button onClick={() => setShowPointsCalc(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>How Points Are Calculated</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{showPointsCalc ? 'Hide' : 'Show'}</span>
            {showPointsCalc ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
          </div>
        </button>

        <AnimatePresence>
          {showPointsCalc && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
              <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="pt-4 grid sm:grid-cols-3 gap-3 mb-3">
                  {[
                    { title: 'Task Points',  desc: 'Priority weight (Low: 10 / Med: 25 / High: 50) + Approval bonus (+30) + Checklist bonus (0–20)', color: 'var(--brand-primary)' },
                    { title: 'Goal Points',  desc: '% of sub-goals completed × 100 (max 100 per goal)', color: '#36a9e1' },
                    { title: 'Total Score',  desc: 'Sum of all Task Points + all Goal Points',           color: '#f59e0b' },
                  ].map(item => (
                    <div key={item.title} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                      <p className="text-xs font-bold mb-1.5" style={{ color: item.color }}>{item.title}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>
                  ⚠️ This exact formula determines who receives a monthly bonus.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Top 3 Podium ─────────────────────────────────────────────────── */}
      {leaderboardData.top3.length > 0 && (
        <div>
          <SectionHeading icon={Crown}>Top Performers</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaderboardData.top3.map((player, idx) => (
              <PodiumCard key={player._id} player={player} idx={idx} onClick={() => handleOpenDetails(player)} />
            ))}
          </div>
        </div>
      )}

      {/* ── My Performance ────────────────────────────────────────────────── */}
      {myPerformance && (
        <div>
          <SectionHeading icon={Star}>Your Performance</SectionHeading>
          <MyPerformanceBar
            performance={myPerformance}
            user={{ ...user, fullName: getFullName(user) }}
            onClick={() => handleOpenDetails({ _id: user.id || user._id, ...user })}
          />
          <BonusHistorySection bonusHistory={myBonusHistory} />
        </div>
      )}

      {/* ── Full Leaderboard ──────────────────────────────────────────────── */}
      <div>
        <SectionHeading icon={Trophy}>Full Leaderboard</SectionHeading>
        <LeaderboardTable
          top3={leaderboardData.top3}
          rest={leaderboardData.rest}
          onAwardBonus={isAdmin ? handleAwardBonus : null}
          onUserClick={handleOpenDetails}
        />
      </div>

      {/* ── All Participants grid ─────────────────────────────────────────── */}
      {allUsers.length > 0 && (
        <div>
          <SectionHeading icon={Users}>All Participants</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUsers.map(u => (
              <div key={u._id} onClick={() => handleOpenDetails(u)} className="cursor-pointer">
                <UserPerformanceCard
                  performance={u}
                  user={{ ...u, fullName: getFullName(u) }}
                  compact
                  onAwardBonus={isAdmin ? handleAwardBonus : null}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <BonusAwardModal
        isOpen={showBonusModal}
        onClose={() => setShowBonusModal(false)}
        targetUser={selectedBonusUser}
      />
      <UserDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        data={detailData}
        userId={selectedDetailUserId}
      />
    </div>
  );
};

export default PerformanceDashboard;