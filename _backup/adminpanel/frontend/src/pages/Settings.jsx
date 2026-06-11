import { useState } from 'react';
import { User, Lock, Palette, Sun, Moon, Monitor, Save, Check } from 'lucide-react';
import api from '../utils/api.js';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { TabBar, Field, Avatar } from '../components/ui.jsx';

export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const r = await api.put('/auth/me', profile);
      setUser?.(r.data);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (!passwords.current) { toast.error('Current password required'); return; }
    if (passwords.next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (passwords.next !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    } catch { toast.error('Failed to change password'); }
    finally { setSaving(false); }
  };

  const THEMES = [
    { value: 'light',  label: 'Light',  icon: Sun,     desc: 'Clean light interface' },
    { value: 'dark',   label: 'Dark',   icon: Moon,    desc: 'Easy on the eyes' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Follows your OS setting' },
  ];

  return (
    <div className="page-content">
      <div className="page-hd">
        <div>
          <p className="page-eyebrow">Account</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your profile, security and preferences.</p>
        </div>
      </div>

      <div style={{ maxWidth: '640px' }}>
        <div className="panel" style={{ overflow: 'visible' }}>
          <div className="tab-bar" style={{ padding: '0 1.125rem' }}>
            <TabBar
              tabs={[
                { value: 'profile', label: 'Profile', icon: User },
                { value: 'security', label: 'Security', icon: Lock },
                { value: 'appearance', label: 'Appearance', icon: Palette },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>

          <div style={{ padding: '1.5rem' }}>
            {tab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                {/* Avatar preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1.125rem', borderBottom: '1px solid var(--c-border)' }}>
                  <Avatar name={profile.name || user?.name || 'U'} size="xl" />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--c-text)', fontSize: '.95rem' }}>{user?.name || 'Admin'}</p>
                    <p style={{ color: 'var(--c-text-faint)', fontSize: '.8rem', textTransform: 'capitalize' }}>{user?.role || 'admin'}</p>
                  </div>
                </div>

                <Field label="Full Name" required>
                  <input className="input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
                </Field>
                <Field label="Email Address" required>
                  <input className="input" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
                </Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                    {saving ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> : <Save size={15} />}
                    Save Profile
                  </button>
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <div style={{ padding: '.875rem', background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-lg)', fontSize: '.845rem', color: 'var(--c-text-soft)', lineHeight: 1.6 }}>
                  Choose a strong password with at least 8 characters, including numbers and symbols.
                </div>
                <Field label="Current Password" required>
                  <input className="input" type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
                </Field>
                <Field label="New Password" required>
                  <input className="input" type="password" value={passwords.next} onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))} placeholder="Min. 8 characters" />
                </Field>
                <Field label="Confirm New Password" required>
                  <input className="input" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
                </Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={savePassword} disabled={saving}>
                    {saving ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> : <Lock size={15} />}
                    Change Password
                  </button>
                </div>
              </div>
            )}

            {tab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p className="label">Theme</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {THEMES.map(t => {
                    const Icon = t.icon;
                    const active = theme === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '1rem',
                          padding: '.875rem 1rem',
                          border: `1px solid ${active ? 'var(--brand-primary)' : 'var(--c-border)'}`,
                          background: active ? 'var(--c-brand-tint)' : 'var(--c-surface)',
                          borderRadius: 'var(--radius-lg)',
                          cursor: 'pointer',
                          transition: 'border-color var(--ease), background var(--ease)',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: 'var(--radius-md)', background: active ? 'var(--brand-primary)' : 'var(--c-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={16} color={active ? '#fff' : 'var(--c-text-soft)'} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: '.875rem', color: active ? 'var(--brand-primary)' : 'var(--c-text)', margin: 0 }}>{t.label}</p>
                          <p style={{ fontSize: '.78rem', color: 'var(--c-text-faint)', margin: 0 }}>{t.desc}</p>
                        </div>
                        {active && <Check size={16} color="var(--brand-primary)" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
