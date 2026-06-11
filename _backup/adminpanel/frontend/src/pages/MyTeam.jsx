import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Briefcase, Info, Mail, Trash2, UserPlus, UsersRound } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, LoadingScreen, Modal, PageHeader, Panel, SearchInput } from '../components/ui.jsx';

const roleLabel = (role) => {
  if (role === 'admin') return 'Super Admin';
  if (role === 'executive') return 'Executive';
  if (role === 'team-lead') return 'Team Lead';
  return 'Standard';
};

const MyTeam = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState({ members: [], name: 'My Team' });
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([api.get('/team'), api.get('/team/available-users')]);
      setTeam(t.data.team || { members: [], name: 'My Team' });
      setAllUsers(u.data.users || []);
    } catch {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addMember = async (userId) => {
    try {
      const { data } = await api.post('/team/member', { userId });
      setTeam(data.team);
      toast.success('Member added to your team');
    } catch {
      toast.error('Failed to add member');
    }
  };

  const removeMember = async (userId) => {
    try {
      const { data } = await api.delete(`/team/member/${userId}`);
      setTeam(data.team);
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  if (user?.role === 'admin') {
    return (
      <div className="page-shell">
        <PageHeader title="My Team" />
        <Panel>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl" style={{ background: 'var(--c-accent-muted)' }}>
              <UsersRound className="h-7 w-7" style={{ color: 'var(--c-accent)' }} />
            </div>
            <h2 className="text-xl font-black" style={{ color: 'var(--c-text-0)' }}>Full Organization Access</h2>
            <p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--c-text-3)' }}>As Super Admin, you automatically have visibility into all users, tasks, goals, and reports across the organization.</p>
          </div>
        </Panel>
      </div>
    );
  }

  const memberIds = new Set((team.members || []).map((member) => member._id || member));
  const available = allUsers.filter((candidate) => !memberIds.has(candidate._id) && candidate._id !== user?.id).filter((candidate) => !search || `${candidate.firstName} ${candidate.lastName} ${candidate.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-shell">
      <PageHeader title="My Team" actions={<button className="btn-primary rounded-full" onClick={() => setShowPicker(true)}><UserPlus className="h-4 w-4" /> Add Members</button>} />
      <Panel>
        <div className="flex items-start gap-3 rounded-[1.35rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-info-bg)' }}>
          <Info className="mt-0.5 h-5 w-5" style={{ color: 'var(--c-accent)' }} />
          <p className="text-sm" style={{ color: 'var(--c-text-1)' }}>All downstream analytics and admin views filter to your selected team members. This preserves the existing business behavior while making team scope more obvious.</p>
        </div>
      </Panel>
      {loading ? <LoadingScreen height="18rem" /> : !team.members?.length ? <EmptyState icon={UsersRound} title="No team members yet" description="Select the users you want this admin workspace to track." action={<button className="btn-primary" onClick={() => setShowPicker(true)}><UserPlus className="h-4 w-4" /> Select Team Members</button>} /> : (
        <Panel title="Team members" subtitle={`${team.members.length} members selected`}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {team.members.map((member) => (
              <div key={member._id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white font-bold" style={{ background: 'var(--brand-primary)' }}>{(member.firstName || 'U')[0]}</div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--c-text-0)' }}>{member.firstName} {member.lastName}</p>
                      <p className="text-sm" style={{ color: 'var(--c-text-3)' }}>{member.position || roleLabel(member.role)}</p>
                    </div>
                  </div>
                  <button className="btn-danger" onClick={() => removeMember(member._id)}><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-4 space-y-2 text-sm" style={{ color: 'var(--c-text-3)' }}>
                  <p><Mail className="mr-1 inline h-4 w-4" />{member.email}</p>
                  {member.position ? <p><Briefcase className="mr-1 inline h-4 w-4" />{member.position}</p> : null}
                  <p>{roleLabel(member.role)}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <Modal open={showPicker} onClose={() => { setShowPicker(false); setSearch(''); }} title="Add Team Members" subtitle="Choose who should be included in your managed team scope." width="max-w-2xl">
        <div className="space-y-4">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." />
          <div className="max-h-[420px] overflow-y-auto space-y-2">
            {available.length === 0 ? <p className="text-sm" style={{ color: 'var(--c-text-3)' }}>{search ? 'No matching users found' : 'All available users are already in your team'}</p> : available.map((candidate) => (
              <button key={candidate._id} className="card card-hover flex w-full items-center justify-between p-4 text-left" onClick={() => addMember(candidate._id)}>
                <div>
                  <p className="font-bold" style={{ color: 'var(--c-text-0)' }}>{candidate.firstName} {candidate.lastName}</p>
                  <p className="text-sm" style={{ color: 'var(--c-text-3)' }}>{candidate.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge" style={{ background: 'var(--c-surface-3)', color: 'var(--c-text-soft)' }}>{roleLabel(candidate.role)}</span>
                  <span className="badge" style={{ background: 'var(--c-accent-muted)', color: 'var(--c-accent)' }}>Add</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyTeam;
