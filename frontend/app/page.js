'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../lib/store';
import { Shield, Lock, Mail, User, ArrowRight, Activity, Terminal } from 'lucide-react';

export default function AuthPortal() {
  const router = useRouter();
  const { login, signup, isAuthenticated, authError, authLoading, token } = useStore();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('admin@riskplatform.com'); // Pre-fill with default admin
  const [password, setPassword] = useState('admin123'); // Pre-fill with default admin
  const [name, setName] = useState('');
  const [role, setRole] = useState('USER');
  const [statusMsg, setStatusMsg] = useState(null);

  // Auto-login default admin to bypass credentials screen completely and make dashboard public
  useEffect(() => {
    if (isAuthenticated || token) {
      router.push('/dashboard');
    } else {
      login('admin@riskplatform.com', 'admin123').then((success) => {
        if (success) {
          router.push('/dashboard');
        }
      });
    }
  }, [isAuthenticated, token, router, login]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(null);

    if (isLogin) {
      const success = await login(email, password);
      if (success) {
        router.push('/dashboard');
      }
    } else {
      if (!name) {
        setStatusMsg({ type: 'error', text: 'Please fill in your name.' });
        return;
      }
      const success = await signup(name, email, password, role);
      if (success) {
        setStatusMsg({ type: 'success', text: 'Account created successfully! Switching to Login...' });
        setTimeout(() => {
          setIsLogin(true);
          setPassword('');
          setStatusMsg(null);
        }, 2000);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Cyber Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20" />

      <div className="w-full max-w-md z-10">
        {/* Brand Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-900/30 mb-4 pulse-threat-high">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">
            ANTIGRAVITY
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium tracking-wider flex items-center gap-1.5 uppercase">
            <Activity className="w-4 h-4 text-cyan-400 glowing-dot-active" />
            Risk Intelligence Core
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="glass-panel glass-panel-glow-violet p-8 rounded-3xl border border-white/5 relative">
          <div className="absolute top-0 right-0 w-28 h-28 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
          
          <h2 className="text-2xl font-bold text-white mb-6">
            {isLogin ? 'Secure Core Access' : 'Create Security Account'}
          </h2>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Name field for Signup */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">FullName</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@riskplatform.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Security Token / Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            {/* Role dropdown for signup */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Access Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm focus:bg-slate-900"
                >
                  <option value="USER" className="bg-slate-950 text-white">Standard Security Operator</option>
                  <option value="ADMIN" className="bg-slate-950 text-white">System Administrator (MLOps)</option>
                </select>
              </div>
            )}

            {/* Error / Success Banners */}
            {(authError || statusMsg) && (
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                authError || (statusMsg && statusMsg.type === 'error')
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
              }`}>
                <Terminal className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError || (statusMsg && statusMsg.text)}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full btn-primary py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Access Core Workspace' : 'Initialize Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle form button */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setStatusMsg(null);
              }}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-wider"
            >
              {isLogin ? 'Register New Security Operator' : 'Already Authorized? Login'}
            </button>
          </div>
        </div>

        {/* Quick Demo Credentials Badge */}
        {isLogin && (
          <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 max-w-sm mx-auto shadow-lg">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Operator Credentials</p>
              <p className="text-xs font-semibold text-slate-200">
                admin@riskplatform.com / <span className="text-violet-400">admin123</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
