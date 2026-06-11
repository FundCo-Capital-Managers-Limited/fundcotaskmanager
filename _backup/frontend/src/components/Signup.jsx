// src/pages/Signup.jsx
import React from 'react';
import { ShieldAlert, Mail, LogIn, ArrowLeft } from 'lucide-react';

const Signup = ({ onSwitchMode }) => {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-6" style={{ backgroundColor: '#f0f2f8' }}>
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
          {/* Top accent bar */}
          <div className="h-1.5 w-full" style={{ backgroundColor: '#312783' }} />

          <div className="p-8 sm:p-10">
            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: '#fef2f2' }}
            >
              <ShieldAlert className="w-7 h-7" style={{ color: '#dc2626' }} />
            </div>

            {/* Heading */}
            <h2 className="text-2xl font-black tracking-tight mb-2" style={{ color: '#1a1a2e' }}>
              Registration Restricted
            </h2>
            <p className="text-sm font-bold uppercase tracking-widest mb-5" style={{ color: '#dc2626' }}>
              Self-registration is disabled
            </p>

            {/* Body */}
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Accounts on this platform are created exclusively by the Administrator.
              To get access, contact your team lead or admin and your account will be set up for you.
            </p>

            {/* Info box */}
            <div
              className="rounded-xl p-5 mb-8 border"
              style={{ backgroundColor: '#f0f4ff', borderColor: '#c7d2fe' }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#312783' }}
                >
                  <Mail className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-sm" style={{ color: '#312783' }}>How to request an account</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#4c4c8a' }}>
                Contact your team lead or admin and provide your{' '}
                <strong>full name</strong>, <strong>email address</strong>,{' '}
                <strong>position</strong>, and <strong>unit/sector</strong>.
                Your account will be created and credentials sent directly to you.
              </p>
            </div>

            {/* Back to login */}
            <button
              onClick={onSwitchMode}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#312783' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} FundCo Capital Managers
        </p>
      </div>
    </div>
  );
};

export default Signup;