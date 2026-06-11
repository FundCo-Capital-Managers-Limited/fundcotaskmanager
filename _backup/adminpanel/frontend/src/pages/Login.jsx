import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Enter email and password');

    setLoading(true);

    try {
      const data = await login(email, password);

      if (data.success) {
        // Show toast with auto-dismiss
        toast.success('Welcome back!', {
          duration: 2500,        // 2.5 seconds
          position: 'top-center',
        });

        // Small delay so user actually sees the success message
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 800);
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8 lg:py-8" style={{ background: 'var(--c-bg)' }}>
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1480px] overflow-hidden rounded-[2rem] border shadow-[var(--shadow-lg)] lg:grid-cols-[1.1fr_0.9fr]" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
        
        {/* Left side - unchanged */}
        <section className="hidden border-r px-10 py-10 lg:flex lg:flex-col lg:justify-between" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
          <div>
            <div className="flex items-center gap-4">
              <img src="/Fundco.svg" alt="FundCo" className="h-16 w-auto object-contain" />
              <h1 className="flex items-center text-7xl font-black leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                <span style={{ color: '#312783' }}>A</span>
                <span style={{ color: '#36a9e1' }}>I</span>
              </h1>
            </div>
            <div className="mt-16 max-w-xl">
              <p className="section-title mb-4">Admin Control</p>
              <h2 className="text-5xl font-black leading-[1.02] tracking-[-0.06em]" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-display)' }}>
                Clear control for teams, goals, projects, and reporting.
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Tasks closed', value: '98%' },
              { label: 'Reports tracked', value: '24/7' },
              { label: 'Team clarity', value: 'A+' },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border p-5" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <p className="stat-value text-2xl" style={{ color: 'var(--brand-primary)' }}>{item.value}</p>
                <p className="mt-2 text-sm" style={{ color: 'var(--c-text-soft)' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Right side - Login form */}
        <section className="flex items-center justify-center px-5 py-8 lg:px-12">
          <div className="w-full max-w-[460px]">
            {/* Mobile logo */}
            <div className="mb-8 lg:hidden">
              <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--c-text-faint)' }}>
                FundCo Capital Managers
              </p>
              <h1 className="mt-2 text-2xl font-black" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-display)' }}>
                FundCo AI
              </h1>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-black tracking-[-0.05em]" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-display)' }}>
                Sign in
              </h2>
              <p className="mt-3 text-sm leading-6" style={{ color: 'var(--c-text-soft)' }}>
                Enter your email and password.
              </p>
            </div>

            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--c-text-faint)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-base"
                    placeholder="admin@company.com"
                    style={{ paddingLeft: 46 }}
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--c-text-faint)' }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-base"
                    placeholder="••••••••"
                    style={{ paddingLeft: 46, paddingRight: 46 }}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--c-text-faint)' }}
                    onClick={() => setShowPw((prev) => !prev)}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full rounded-full">
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;