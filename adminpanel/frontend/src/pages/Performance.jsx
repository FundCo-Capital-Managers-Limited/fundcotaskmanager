import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Gift, RefreshCw, Target, TrendingUp, Trophy } from 'lucide-react';
import api from '../utils/api.js';
import {
  LoadingScreen,
  Modal,
  PageHeader,
  ProgressBar,
  StatCard,
  StatusPill,
} from '../components/ui.jsx';
import PerformanceDetailModal from '../components/PerformanceDetailModal.jsx';

const medal = ['#f59e0b', '#94a3b8', '#b45309'];

const formatPersonName = (user) => {
  if (!user) return 'Unknown user';
  if (user.fullName) return user.fullName.trim();
  return `${user.firstName || ''} ${user.lastName || ''} ${user.otherName || ''}`.replace(/\s+/g, ' ').trim() || 'Unknown user';
};

const PodiumCard = ({ person, index, onOpen, onBonus }) => (
  <button
    type="button"
    onClick={() => onOpen(person)}
    className="card group p-6 text-left transition-transform hover:-translate-y-1"
  >
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] text-lg font-black text-white" style={{ background: medal[index] }}>
        {index + 1}
      </div>
      <StatusPill tone="secondary">{person.level}</StatusPill>
    </div>
    <p className="text-lg font-black" style={{ color: 'var(--c-text-0)' }}>{formatPersonName(person)}</p>
    <p className="mt-1 text-sm" style={{ color: 'var(--c-text-3)' }}>{person.position || 'Team member'}</p>
    <div className="mt-5 flex items-end justify-between gap-3">
      <div>
        <p className="text-4xl font-black" style={{ color: medal[index] }}>{person.totalScore || 0}</p>
        <p className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>Score</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-black" style={{ color: '#059669' }}>{person.completionRate || 0}%</p>
        <p className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>Completion</p>
      </div>
    </div>
    <div className="mt-4">
      <ProgressBar value={person.completionRate || 0} tone={medal[index]} />
    </div>
    <div className="mt-4 flex justify-end">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBonus(person);
        }}
        className="btn-secondary"
      >
        <Gift className="h-4 w-4" />
        Award bonus
      </button>
    </div>
  </button>
);

const Performance = () => {
  const [data, setData] = useState({ top3: [], rest: [], allUsers: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bonusUser, setBonusUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchLeaderboard = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: payload } = await api.get('/performance/leaderboard');
      setData({
        top3: payload.leaderboard?.top3 || [],
        rest: payload.leaderboard?.rest || [],
        allUsers: payload.allUsers || [],
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load performance');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const award = async (userId, amount, reason) => {
    try {
      await api.post('/performance/award', { userId, bonusAmount: amount, reason });
      toast.success('Bonus awarded');
      setBonusUser(null);
      await fetchLeaderboard(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to award bonus');
    }
  };

  const stats = useMemo(() => {
    const all = data.allUsers || [];
    const top = all[0];
    const avgCompletion = all.length
      ? Math.round(all.reduce((sum, user) => sum + Number(user.completionRate || 0), 0) / all.length)
      : 0;
    return {
      rankedUsers: all.length,
      topScore: top?.totalScore || 0,
      averageCompletion: avgCompletion,
      highMomentum: all.filter((user) => Number(user.completionRate || 0) >= 80).length,
    };
  }, [data.allUsers]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Performance"
        title="Performance Command Center"
        actions={(
          <button type="button" className="btn-secondary" onClick={() => fetchLeaderboard(true)} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Ranked users" value={stats.rankedUsers} icon={Trophy} tone="var(--c-accent)" />
        <StatCard label="Top score" value={stats.topScore} icon={TrendingUp} tone="#059669" />
        <StatCard label="Avg completion" value={`${stats.averageCompletion}%`} icon={Target} tone="#2563eb" />
        <StatCard label="80%+ completion" value={stats.highMomentum} icon={Gift} tone="#f59e0b" />
      </div>

      {data.top3.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {data.top3.map((person, index) => (
            <PodiumCard
              key={person._id}
              person={person}
              index={index}
              onOpen={setSelectedUser}
              onBonus={setBonusUser}
            />
          ))}
        </div>
      ) : null}

      <section className="surface-panel overflow-hidden">
        <div className="border-b px-4 py-4 lg:px-5" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black" style={{ color: 'var(--c-text)' }}>Organization leaderboard</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                Click any user to open the full performance breakdown and Super AI analysis.
              </p>
            </div>
            <StatusPill tone="secondary">{data.allUsers.length} participants</StatusPill>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">User</th>
                <th className="table-header">Level</th>
                <th className="table-header text-right">Score</th>
                <th className="table-header text-right">Completion</th>
                <th className="table-header text-right">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {data.allUsers.map((user) => (
                <tr
                  key={user._id}
                  className="table-row cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="table-cell">{user.rank}</td>
                  <td className="table-cell">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--c-text-0)' }}>{formatPersonName(user)}</p>
                      <p className="text-xs" style={{ color: 'var(--c-text-faint)' }}>{user.position || user.unitSector || 'Team member'}</p>
                    </div>
                  </td>
                  <td className="table-cell">{user.level}</td>
                  <td className="table-cell text-right font-bold" style={{ color: 'var(--c-accent)' }}>{user.totalScore}</td>
                  <td className="table-cell text-right" style={{ color: '#059669' }}>{user.completionRate}%</td>
                  <td className="table-cell text-right">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        setBonusUser(user);
                      }}
                    >
                      <Gift className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <BonusModal open={!!bonusUser} user={bonusUser} onClose={() => setBonusUser(null)} onAward={award} />
      <PerformanceDetailModal open={!!selectedUser} userSummary={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
};

const BonusModal = ({ open, user, onClose, onAward }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setReason('');
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Award bonus" subtitle={user ? `To ${formatPersonName(user)}` : ''}>
      <div className="space-y-4">
        <input type="number" className="input-base" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Points" />
        <textarea className="input-base min-h-28" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason..." />
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1"
            style={{ background: '#f59e0b' }}
            onClick={() => {
              if (!amount || Number(amount) <= 0) {
                toast.error('Enter a valid amount');
                return;
              }
              onAward(user._id, Number(amount), reason);
            }}
          >
            Award
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default Performance;



