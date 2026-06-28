import { useState } from 'react';
import { useSystem } from '../hooks/useSystem';
import { api } from '../api/client';
import {
  Mail, Lock, ShieldAlert, CheckCircle2, KeyRound, Eye, EyeOff, LogIn, ShieldCheck,
} from 'lucide-react';

export default function Login() {
  const { login, employees, verifyAdminPin, apiConnected } = useSystem();
  const [activeTab, setActiveTab] = useState('employee');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [empError, setEmpError] = useState('');
  const [empLoading, setEmpLoading] = useState(false);

  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const [loginState, setLoginState] = useState('idle');

  const handleEmployeeLogin = async (e) => {
    e.preventDefault();
    setEmpError('');
    setEmpLoading(true);
    try {
      if (apiConnected) {
        const auth = await api.authEmail?.(email, password);
        if (auth?.success && auth.employee) {
          setLoginState('success');
          setTimeout(() => login('employee', auth.employee), 1000);
          return;
        }
      }
      const emp = employees.find(
        e => e.email?.toLowerCase() === email.trim().toLowerCase() && e.status === 'active'
      );
      if (!emp) { setEmpError('No active account found for this email address.'); return; }
      if (!emp.password) { setEmpError('No password set for this account. Contact HR administrator.'); return; }
      if (password !== emp.password) { setEmpError('Incorrect password. Please try again.'); return; }
      setLoginState('success');
      setTimeout(() => login('employee', emp), 1000);
    } catch (err) {
      setEmpError(err.message || 'Login failed. Please try again.');
    } finally {
      setEmpLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);
    try {
      const ok = await verifyAdminPin(adminPin);
      if (ok) {
        setLoginState('success');
        setTimeout(() => {
          login('admin', { id: 'admin', name: 'Administrator', role: 'HR Admin', department: 'HR', email: 'hr-admin@company.com' });
        }, 800);
      } else {
        setAdminError('Invalid admin passcode.');
      }
    } finally {
      setAdminLoading(false);
    }
  };

  if (loginState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gold-50 p-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-xl flex flex-col items-center text-center w-full max-w-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-emerald-100">
            <CheckCircle2 className="text-emerald-600 w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-primary-800">Access Granted</h2>
          <p className="text-sm text-slate-400 mt-1">Redirecting you to the portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gold-50 p-4 relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="absolute top-[-60px] right-[-60px] w-72 h-72 bg-primary-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 bg-gold-100 rounded-full blur-3xl opacity-50" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">

          {/* Blue header banner */}
          <div className="bg-primary-700 px-8 py-7 text-white text-center">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3 ring-2 ring-white/20">
              <ShieldCheck className="text-gold-300 w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">HR Portal</h1>
            <p className="text-xs text-primary-200 mt-1">Attendance & Roster Management</p>
          </div>

          <div className="p-8">
            {/* Tab switcher */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-7 gap-1">
              <button
                id="tab-employee"
                onClick={() => { setActiveTab('employee'); setEmpError(''); setAdminError(''); }}
                className={`py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  activeTab === 'employee'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-primary-600'
                }`}
              >
                Employee Login
              </button>
              <button
                id="tab-admin"
                onClick={() => { setActiveTab('admin'); setEmpError(''); setAdminError(''); }}
                className={`py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  activeTab === 'admin'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-primary-600'
                }`}
              >
                Admin Login
              </button>
            </div>

            {/* ── Employee Login ── */}
            {activeTab === 'employee' && (
              <form onSubmit={handleEmployeeLogin} className="space-y-4">
                <div className="bg-primary-50 border border-primary-100 rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-primary-700">
                    Use your company email and the password set by HR when your account was created.
                  </p>
                </div>

                <div>
                  <label className="label">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      id="employee-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmpError(''); }}
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      id="employee-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setEmpError(''); }}
                      className="input pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {empError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs">{empError}</p>
                  </div>
                )}

                {employees.filter(e => e.status === 'active').length === 0 && (
                  <div className="bg-gold-50 border border-gold-200 rounded-lg px-3 py-2">
                    <p className="text-[11px] text-gold-700">
                      No active employees yet. An admin must add employees first.
                    </p>
                  </div>
                )}

                <button
                  id="employee-login-btn"
                  type="submit"
                  disabled={empLoading}
                  className="btn-primary w-full justify-center py-2.5 mt-1"
                >
                  {empLoading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <LogIn className="w-4 h-4" />}
                  {empLoading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            )}

            {/* ── Admin Login ── */}
            {activeTab === 'admin' && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-slate-500">
                    Default passcode:{' '}
                    <code className="font-mono font-bold text-primary-700">admin123</code>
                    {' '}(change in Settings)
                  </p>
                </div>

                <div>
                  <label className="label">Admin Passcode</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      id="admin-passcode"
                      type="password"
                      required
                      placeholder="Enter passcode"
                      value={adminPin}
                      onChange={e => { setAdminPin(e.target.value); setAdminError(''); }}
                      className="input pl-10"
                    />
                  </div>
                </div>

                {adminError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs">{adminError}</p>
                  </div>
                )}

                <button
                  id="admin-login-btn"
                  type="submit"
                  disabled={adminLoading}
                  className="btn-primary w-full justify-center py-2.5 mt-1"
                >
                  {adminLoading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <ShieldCheck className="w-4 h-4" />}
                  {adminLoading ? 'Verifying…' : 'Log In as Administrator'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="h-px flex-1 bg-slate-200" />
          <p className="text-[11px] text-slate-400 px-3">HR Attendance System · Secure Access</p>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
