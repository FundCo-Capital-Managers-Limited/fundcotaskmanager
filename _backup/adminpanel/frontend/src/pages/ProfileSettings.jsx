import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BellRing, KeyRound, Palette, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../utils/api.js';
import userApi from '../utils/userApi.js';
import { getInitials, getRoleLabel } from '../utils/adminFormat.js';
import { InfoStrip, LoadingScreen, PageHeader, Panel, SegmentedTabs, StatusPill, SurfaceMetric } from '../components/ui.jsx';

const defaultChannels = {
  inApp: true,
  email: true,
  push: false,
};

const ProfileSettings = () => {
  const { user, syncUser, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingChannels, setSavingChannels] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', otherName: '', position: '', unitSector: '', email: '', avatar: '' });
  const [channels, setChannels] = useState(defaultChannels);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    let mounted = true;

    userApi
      .get('/api/user/me')
      .then(({ data }) => {
        if (!mounted || !data.success) return;
        const profile = data.user;
        setForm({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          otherName: profile.otherName || '',
          position: profile.position || '',
          unitSector: profile.unitSector || '',
          email: profile.email || '',
          avatar: profile.avatar || '',
        });
        setChannels(profile.preferences?.reminders?.defaultDeliveryChannels || defaultChannels);
      })
      .catch(() => {
        if (!mounted) return;
        setForm({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          otherName: user?.otherName || '',
          position: user?.position || '',
          unitSector: user?.unitSector || '',
          email: user?.email || '',
          avatar: user?.avatar || '',
        });
        setChannels(defaultChannels);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleProfileSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error('First name, last name, and email are required.');
      return;
    }

    setSavingProfile(true);
    try {
      const { data } = await userApi.put('/api/user/profile', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        otherName: form.otherName.trim(),
        position: form.position.trim(),
        unitSector: form.unitSector.trim(),
        email: form.email.trim(),
      });

      if (data.success) {
        const nextUser = {
          ...user,
          ...data.user,
          avatar: user?.avatar || form.avatar || '',
        };
        syncUser(nextUser);
        await refreshUser().catch(() => null);
        toast.success('Profile updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChannelsSave = async () => {
    setSavingChannels(true);
    try {
      const { data } = await userApi.put('/api/reminders/preferences', {
        defaultDeliveryChannels: channels,
      });
      if (data.success) toast.success('Notification preferences updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update notifications.');
    } finally {
      setSavingChannels(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Enter your current and new password.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password confirmation does not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const { data } = await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      if (data.success) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-shell">
      <PageHeader title="Admin identity and preferences"  aside={<StatusPill tone="brand">{getRoleLabel(user?.role)}</StatusPill>} />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Identity" subtitle="Shared profile details used across the platform">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.8rem] text-2xl font-black text-white" style={{ background: 'var(--brand-primary)' }}>
                  {getInitials(user, 'AD')}
                </div>
                <div>
                  <p className="text-xl font-black tracking-[-0.03em]" style={{ color: 'var(--c-text)' }}>{user?.fullName || `${form.firstName} ${form.lastName}`.trim() || 'Admin'}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--c-text-soft)' }}>{form.position || 'Position not set'} {form.unitSector ? `• ${form.unitSector}` : ''}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--c-text-faint)' }}>{form.email}</p>
                </div>
              </div>
              <StatusPill tone="secondary">{theme === 'system' ? 'System theme' : theme}</StatusPill>
            </div>

          

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">First Name</label>
                <input className="input-base" value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input-base" value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} />
              </div>
              <div>
                <label className="label">Other Name</label>
                <input className="input-base" value={form.otherName} onChange={(event) => setForm((current) => ({ ...current, otherName: event.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input-base" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </div>
              <div>
                <label className="label">Position</label>
                <input className="input-base" value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} />
              </div>
              <div>
                <label className="label">Unit / Sector</label>
                <input className="input-base" value={form.unitSector} onChange={(event) => setForm((current) => ({ ...current, unitSector: event.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="btn-primary" onClick={handleProfileSave} disabled={savingProfile}>
                <UserCircle2 className="h-4 w-4" />
                {savingProfile ? 'Saving profile...' : 'Save profile'}
              </button>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Workspace preferences" subtitle="Theme and default reminder delivery">
            <div className="space-y-5">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                  <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>Theme</p>
                </div>
                <SegmentedTabs items={[{ label: 'System', value: 'system' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} value={theme} onChange={setTheme} />
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <BellRing className="h-4 w-4" style={{ color: 'var(--brand-secondary)' }} />
                  <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>Default reminder delivery</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { key: 'inApp', title: 'In-app', description: 'Show alerts in the workspace.' },
                    { key: 'email', title: 'Email', description: 'Send reminders to your inbox.' },
                    { key: 'push', title: 'Push', description: 'Use push.' },
                  ].map((channel) => (
                    <button
                      key={channel.key}
                      type="button"
                      onClick={() => setChannels((current) => ({ ...current, [channel.key]: !current[channel.key] }))}
                      className="rounded-[1.35rem] border px-4 py-4 text-left transition-colors"
                      style={channels[channel.key] ? { borderColor: 'var(--brand-primary)', background: 'var(--brand-primary-soft)' } : { borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}
                    >
                      <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{channel.title}</p>
                      <p className="mt-2 text-sm leading-6" style={{ color: 'var(--c-text-soft)' }}>{channel.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" className="btn-primary" onClick={handleChannelsSave} disabled={savingChannels}>
                  <BellRing className="h-4 w-4" />
                  {savingChannels ? 'Saving...' : 'Save notifications'}
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Security">
            <div className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input type="password" className="input-base" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
              </div>
              <div>
                <label className="label">New Password</label>
                <input type="password" className="input-base" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" className="input-base" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
              </div>
              <InfoStrip title="Password rule" description="Use at least 8 characters. This updates the shared login credential used across the entire platform." tone="warning" />
              <div className="flex justify-end">
                <button type="button" className="btn-primary" onClick={handlePasswordSave} disabled={savingPassword}>
                  <KeyRound className="h-4 w-4" />
                  {savingPassword ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Account snapshot" subtitle="Quick view of current admin identity state">
            <div className="grid gap-3 md:grid-cols-2">
              <SurfaceMetric title="Role" value={getRoleLabel(user?.role)} detail="Current admin privilege" tone="var(--brand-primary)" />
              <SurfaceMetric title="Email" value={form.email || 'Not set'} detail="Primary account email" tone="var(--brand-secondary)" />
              <SurfaceMetric title="Reminder channels" value={`App ${channels.inApp ? 'On' : 'Off'} / Email ${channels.email ? 'On' : 'Off'}`} detail="Default delivery mix" tone="var(--c-success)" />
              <SurfaceMetric title="Security context" value="Shared" detail="Profile and password sync with the full platform" tone="var(--c-warning)" />
            </div>
            <div className="mt-4 rounded-[1.35rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>Shared security contract</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
