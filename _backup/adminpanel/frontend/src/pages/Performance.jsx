import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Gift, TrendingUp, Trophy } from 'lucide-react';
import api from '../utils/api.js';
import { LoadingScreen, Modal, PageHeader, Panel, StatCard } from '../components/ui.jsx';

const medal = ['🥇', '🥈', '🥉'];
const medalColors = ['#f59e0b', '#94a3b8', '#b45309'];

const Performance = () => {
  const [data, setData] = useState({ top3: [], rest: [], allUsers: [] });
  const [loading, setLoading] = useState(true);
  const [bonusUser, setBonusUser] = useState(null);

  useEffect(() => {
    api
      .get('/performance/leaderboard')
      .then(({ data: payload }) => setData({ top3: payload.leaderboard?.top3 || [], rest: payload.leaderboard?.rest || [], allUsers: payload.allUsers || [] }))
      .catch(() => toast.error('Failed'))
      .finally(() => setLoading(false));
  }, []);

  const award = async (userId, amount, reason) => {
    try {
      await api.post('/performance/award', { userId, bonusAmount: amount, reason });
      toast.success('Bonus awarded!');
      setBonusUser(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Performance" title="Performance" />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Ranked users" value={data.allUsers.length} icon={Trophy} tone="var(--c-accent)" />
        <StatCard label="Top score" value={data.top3[0]?.totalScore || 0} icon={TrendingUp} tone="#059669" />
        <StatCard label="Bonus ready" value={data.top3.length} icon={Gift} tone="#f59e0b" />
      </div>

      {data.top3.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {data.top3.map((person, index) => (
            <div key={person._id} className="card p-6 text-center">
              <div className="mb-3 text-4xl">{medal[index]}</div>
              <p className="text-lg font-black" style={{ color: 'var(--c-text-0)' }}>{person.fullName}</p>
              <p className="text-sm" style={{ color: 'var(--c-text-3)' }}>{person.level}</p>
              <p className="stat-value mt-4 text-4xl" style={{ color: medalColors[index] }}>{person.totalScore}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--c-text-3)' }}>{person.completionRate}% completion rate</p>
              <button className="btn-secondary mt-4" onClick={() => setBonusUser(person)}><Gift className="h-4 w-4" /> Award Bonus</button>
            </div>
          ))}
        </div>
      ) : null}

      <Panel title="Leaderboard" subtitle="Live ranking across the organization">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">User</th>
                <th className="table-header">Level</th>
                <th className="table-header text-right">Score</th>
                <th className="table-header text-right">Done</th>
                <th className="table-header text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.allUsers.map((user) => (
                <tr key={user._id} className="table-row">
                  <td className="table-cell">{user.rank}</td>
                  <td className="table-cell font-semibold" style={{ color: 'var(--c-text-0)' }}>{user.fullName}</td>
                  <td className="table-cell">{user.level}</td>
                  <td className="table-cell text-right font-bold" style={{ color: 'var(--c-accent)' }}>{user.totalScore}</td>
                  <td className="table-cell text-right" style={{ color: '#059669' }}>{user.completionRate}%</td>
                  <td className="table-cell text-right"><button className="btn-ghost" onClick={() => setBonusUser(user)}><Gift className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <BonusModal open={!!bonusUser} user={bonusUser} onClose={() => setBonusUser(null)} onAward={award} />
    </div>
  );
};

const BonusModal = ({ open, user, onClose, onAward }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Award Bonus" subtitle={user ? `To ${user.fullName}` : ''}>
      <div className="space-y-4">
        <input type="number" className="input-base" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Points" />
        <textarea className="input-base min-h-28" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason..." />
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" style={{ background: '#f59e0b' }} onClick={() => { if (!amount || amount <= 0) return toast.error('Enter amount'); onAward(user._id, Number(amount), reason); }}>Award</button>
        </div>
      </div>
    </Modal>
  );
};

export default Performance;
