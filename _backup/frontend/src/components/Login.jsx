// login.jsx
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL    = import.meta.env.VITE_API_URL || 'http://localhost:4001';
const INIT_FORM  = { email: '', password: '' };

const Login = ({ onSubmit, onSwitchMode }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [formData,     setFormData]     = useState(INIT_FORM);
  const [rememberMe,   setRememberMe]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token  = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (token && userId) {
      (async () => {
        try {
          const { data } = await axios.get(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } });
          if (data.success) { onSubmit?.({ token, userId, ...data.user }); toast.success('Welcome back!'); navigate('/'); }
          else { localStorage.clear(); toast.error('Session invalid.'); }
        } catch { localStorage.clear(); }
      })();
    }
  }, [navigate, onSubmit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/user/login`, formData);
      if (!data.success || !data.token) throw new Error(data.message || 'Login failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      onSubmit?.({ token: data.token, userId: data.user.id, ...data.user });
      toast.success('Login successful!');
      setFormData(INIT_FORM);
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--input-bg)',
    color:           'var(--text-primary)',
    borderColor:     'var(--input-border)',
  };

  return (
    <div className="min-h-screen w-screen flex" style={{ backgroundColor: 'var(--bg-app)' }}>
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />

      {/* Left branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-5/12 xl:w-1/2 p-12 xl:p-16"
        style={{ backgroundColor: 'var(--brand-primary)' }}
      >
        <div className="flex items-center gap-3">
          <img src="/Fundco.svg" alt="FundCo" className="h-9 w-auto object-contain brightness-0 invert opacity-90" />
          <span className="text-white/40 text-xs font-semibold tracking-widest uppercase">Capital Managers</span>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ backgroundColor: 'rgba(54,169,225,0.2)', color: 'var(--brand-accent)' }}>
            AI Powered Task Management Platform
          </div>
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
            Plan. Track.<br />
            <span style={{ color: 'var(--brand-accent)' }}>Deliver.</span>
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-sm">
            A unified workspace to manage tasks, track performance, and collaborate from anywhere.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { label: 'Task Tracking', desc: 'Real-time updates' },
              { label: 'Performance',   desc: 'Monthly scoring'  },
              { label: 'AI Assistant',  desc: 'Chat & automate'  },
              { label: 'Analytics',     desc: 'Deep analysis'    },
            ].map((f) => (
              <div key={f.label} className="p-3.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-xs">© {new Date().getFullYear()} FundCo Capital Managers</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-lg leading-none" style={{ color: 'var(--brand-primary)' }}>FundCo TM</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Capital Managers</p>
            </div>
          </div>

          <h2 className="text-3xl font-black tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>Sign in</h2>
          <p className="mb-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Enter your credentials to access your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email" placeholder="you@fundco.ng"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--brand-accent)'}
                  onBlur={(e)  => e.target.style.borderColor = 'var(--input-border)'}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-11 py-3 rounded-xl border text-sm focus:outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--brand-accent)'}
                  onBlur={(e)  => e.target.style.borderColor = 'var(--input-border)'}
                  required
                />
                <button type="button" onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <input type="checkbox" id="rm" checked={rememberMe} onChange={() => setRememberMe((p) => !p)}
                className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: 'var(--brand-primary)' }} />
              <label htmlFor="rm" className="text-sm cursor-pointer select-none" style={{ color: 'var(--text-secondary)' }}>
                Keep me signed in
              </label>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign In</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <button onClick={() => { toast.dismiss(); onSwitchMode?.(); }}
                className="font-bold hover:underline transition-colors"
                style={{ color: 'var(--brand-primary)' }}>
                Request access
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;