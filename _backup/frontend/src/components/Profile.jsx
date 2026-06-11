// profile.jsx
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { ChevronLeft, Lock, LogOut, Save, Shield, UserCircle, Briefcase, Building, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const Field = ({ icon: Icon, label, children }) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
      {label}
    </label>
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
      style={{
        backgroundColor: 'var(--input-bg)',
        borderColor: 'var(--input-border)',
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
      {children}
    </div>
  </div>
);

const Profile = ({ setCurrentUser, onLogout }) => {
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', otherName: '',
    position: '', unitSector: '', email: '', role: 'standard',
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      onLogout?.();
      return;
    }
    axios
      .get(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (data.success) {
          setProfile({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            otherName: data.user.otherName || '',
            position: data.user.position || '',
            unitSector: data.user.unitSector || '',
            email: data.user.email,
            role: data.user.role,
          });
        } else toast.error(data.message);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Unable to load profile.');
        if (err.response?.status === 401) onLogout?.();
      });
  }, [onLogout]);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put(
        `${API_URL}/api/user/profile`,
        {
          firstName: profile.firstName,
          lastName: profile.lastName,
          otherName: profile.otherName,
          position: profile.position,
          unitSector: profile.unitSector,
          email: profile.email,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setCurrentUser?.((prev) => ({
          ...prev,
          ...profile,
          fullName: `${profile.firstName} ${profile.lastName} ${profile.otherName || ''}`.trim(),
        }));
        toast.success('Profile updated successfully');
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Profile update failed');
      if (err.response?.status === 401) onLogout?.();
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return toast.error('Passwords do not match');
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put(
        `${API_URL}/api/user/password`,
        { currentPassword: passwords.current, newPassword: passwords.new },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success('Password changed successfully');
        setPasswords({ current: '', new: '', confirm: '' });
        setShowPasswords({ current: false, new: false, confirm: false });
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
      if (err.response?.status === 401) onLogout?.();
    }
  };

  const initial = profile.firstName ? profile.firstName[0].toUpperCase() : 'U';
  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || 'User';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-app)' }}>
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pt-20">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Profile header */}
        <div
          className="rounded-2xl border p-6 mb-6 flex items-center gap-5"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {initial}
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{fullName}</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{profile.email}</p>
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full mt-2"
              style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}
            >
              <Shield className="w-3 h-3" /> {profile.role}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          >
            <div
              className="px-6 py-4 border-b flex items-center gap-2.5"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <UserCircle className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Personal Information</h2>
            </div>
            <form onSubmit={saveProfile} className="p-6 space-y-4">
              {[
                { name: 'firstName', label: 'First Name', icon: UserCircle },
                { name: 'lastName', label: 'Last Name', icon: UserCircle },
                { name: 'otherName', label: 'Other Name', icon: UserCircle },
                { name: 'position', label: 'Position / Role', icon: Briefcase },
                { name: 'unitSector', label: 'Unit / Sector', icon: Building },
                { name: 'email', label: 'Email Address', icon: UserCircle, type: 'email' },
              ].map(({ name, label, icon: Icon, type = 'text' }) => (
                <Field key={name} icon={Icon} label={label}>
                  <input
                    type={type}
                    value={profile[name]}
                    onChange={(e) => setProfile({ ...profile, [name]: e.target.value })}
                    className="flex-1 text-sm focus:outline-none bg-transparent"
                    style={{ color: 'var(--text-primary)' }}
                    placeholder={label}
                    required={name !== 'otherName'}
                  />
                </Field>
              ))}
              <Field icon={Shield} label="Account Type">
                <input
                  type="text"
                  value={profile.role}
                  readOnly
                  className="flex-1 text-sm focus:outline-none bg-transparent cursor-not-allowed"
                  style={{ color: 'var(--text-muted)' }}
                />
              </Field>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </form>
          </div>

          {/* Security */}
          <div className="space-y-6">
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div
                className="px-6 py-4 border-b flex items-center gap-2.5"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <Shield className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Change Password</h2>
              </div>
              <form onSubmit={changePassword} className="p-6 space-y-4">
                {[
                  { name: 'current', label: 'Current Password' },
                  { name: 'new', label: 'New Password' },
                  { name: 'confirm', label: 'Confirm New Password' },
                ].map(({ name, label }) => (
                  <div key={name}>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {label}
                    </label>
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--input-border)',
                      }}
                    >
                      <Lock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                      <input
                        type={showPasswords[name] ? 'text' : 'password'}
                        value={passwords[name]}
                        onChange={(e) => setPasswords({ ...passwords, [name]: e.target.value })}
                        className="flex-1 text-sm focus:outline-none bg-transparent"
                        style={{ color: 'var(--text-primary)' }}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords((p) => ({ ...p, [name]: !p[name] }))}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {showPasswords[name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--brand-accent)' }}
                >
                  <Shield className="w-4 h-4" /> Update Password
                </button>
              </form>
            </div>

            {/* Danger zone */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: '#fecaca' }}
            >
              <div className="px-6 py-4 border-b" style={{ borderColor: '#fecaca' }}>
                <h2 className="font-bold flex items-center gap-2" style={{ color: '#dc2626' }}>
                  <LogOut className="w-4 h-4" /> Danger Zone
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Signing out will end your current session.
                </p>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 transition-colors hover:bg-red-50"
                  style={{ color: '#dc2626', borderColor: '#fecaca' }}
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;