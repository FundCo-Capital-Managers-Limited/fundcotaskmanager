import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Edit2, Lock, Plus, Search, Shield, Trash2, X } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, LoadingScreen, Modal, PageHeader, Panel, SearchInput } from '../components/ui.jsx';

const roleColors = { standard: '#6b7494', 'team-lead': '#2563eb', executive: '#7c3aed', admin: '#dc2626' };

const Users = () => {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { search } });
      setUsers(data.users || []);
    } catch {
      toast.error('Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  if (!hasRole('admin')) {
    return <EmptyState icon={Shield} title="Super Admin only" description="This route remains restricted to the admin role." />;
  }

  const handleCreate = async (form) => {
    try {
      await api.post('/users', form);
      toast.success('User created!');
      fetchUsers();
      setShowForm(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleUpdate = async (id, form) => {
    try {
      await api.put(`/users/${id}`, form);
      toast.success('Updated');
      fetchUsers();
      setEditUser(null);
      setShowForm(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Deactivated');
      fetchUsers();
    } catch {
      toast.error('Failed');
    }
  };

  const handleResetPw = async (id) => {
    const pw = prompt('New password (8+ chars):');
    if (!pw || pw.length < 8) return;
    try {
      await api.put(`/users/${id}/reset-password`, { newPassword: pw });
      toast.success('Password reset');
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader title="Users Management" actions={<button className="btn-primary rounded-full" onClick={() => { setEditUser(null); setShowForm(true); }}><Plus className="h-4 w-4" /> Create User</button>} />
      <Panel><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." icon={Search} /></Panel>
      {loading ? <LoadingScreen height="18rem" /> : users.length === 0 ? <EmptyState icon={Shield} title="No users found" description="Create the first user account to populate this directory." /> : (
        <Panel title="User directory" subtitle={`${users.length} accounts visible`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="table-header">User</th><th className="table-header">Position</th><th className="table-header">Role</th><th className="table-header">Status</th><th className="table-header text-right">Actions</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl text-white font-bold" style={{ background: roleColors[user.role] || '#6b7494' }}>{(user.firstName || 'U')[0]}</div>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--c-text-0)' }}>{user.firstName} {user.lastName}</p>
                          <p className="text-sm" style={{ color: 'var(--c-text-3)' }}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">{user.position || '-'}</td>
                    <td className="table-cell"><span className="badge capitalize" style={{ background: `${roleColors[user.role]}15`, color: roleColors[user.role] }}>{user.role}</span></td>
                    <td className="table-cell"><span className="badge" style={{ background: user.isActive ? '#ecfdf5' : '#fef2f2', color: user.isActive ? '#059669' : '#dc2626' }}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-2">
                        <button className="btn-ghost" onClick={() => { setEditUser(user); setShowForm(true); }}><Edit2 className="h-4 w-4" /></button>
                        <button className="btn-ghost" onClick={() => handleResetPw(user._id)}><Lock className="h-4 w-4" /></button>
                        <button className="btn-danger" onClick={() => handleDeactivate(user._id)}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <UserModal open={showForm} user={editUser} onCancel={() => { setShowForm(false); setEditUser(null); }} onSubmit={editUser ? (form) => handleUpdate(editUser._id, form) : handleCreate} />
    </div>
  );
};

const UserModal = ({ open, user, onSubmit, onCancel }) => {
  const [form, setForm] = useState({ firstName: '', lastName: '', otherName: '', position: '', unitSector: '', email: '', role: 'standard', password: '', isActive: true });
  const isEdit = !!user;

  useEffect(() => {
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      otherName: user?.otherName || '',
      position: user?.position || '',
      unitSector: user?.unitSector || '',
      email: user?.email || '',
      role: user?.role || 'standard',
      password: '',
      isActive: user?.isActive ?? true,
    });
  }, [user, open]);

  return (
    <Modal open={open} onClose={onCancel} title={isEdit ? 'Edit User' : 'Create User'} subtitle="User changes stay tied to the current account logic.">
      <div className="space-y-4">
        {['firstName', 'lastName', 'otherName', 'position', 'unitSector', 'email'].map((field) => <div key={field}><label className="label">{field.replace(/([A-Z])/g, ' $1').trim()}</label><input className="input-base" value={form[field]} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></div>)}
        {!isEdit ? <div><label className="label">Password</label><input type="password" className="input-base" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} /></div> : null}
        <div><label className="label">Role</label><select className="input-base" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>{['standard', 'team-lead', 'executive', 'admin'].map((role) => <option key={role} value={role}>{role}</option>)}</select></div>
        {isEdit ? <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-text-1)' }}><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} /> Active account</label> : null}
        <button className="btn-primary w-full" onClick={() => onSubmit(form)}>{isEdit ? 'Save Changes' : 'Create User'}</button>
      </div>
    </Modal>
  );
};

export default Users;
