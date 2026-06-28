import { useState, useEffect } from 'react';
import { useSystem } from '../hooks/useSystem';
import {
  Fingerprint, Calendar, FileText, Bell, LogOut, Clock,
  CheckCircle, AlertCircle, Sparkles, Send, ShieldCheck, Mail, Inbox, Archive, Settings, Key
} from 'lucide-react';
import { Avatar, StatusBadge, RosterChip } from '../components/ui';
import { verifyAgainstStored } from '../utils/fingerprintScanner';

export default function EmployeePortal() {
  const {
    currentUser,
    logout,
    clockLogs,
    clockInOrOut,
    leaveRequests,
    leaveBalances,
    applyLeave,
    notifications,
    emails,
    clearNotifications,
    getEmployeeStatus,
    publicHolidays,
    roster,
    resetPassword,
    shiftAssignments,
  } = useSystem();
  
  const { dark, toggle } = { dark: false, toggle: () => {} }; // light mode only
  const [activeTab, setActiveTab] = useState('clock'); // 'clock' | 'leave' | 'roster' | 'notif'
  const [clockAction, setClockAction] = useState('in'); // 'in' | 'out'

  // Biometric scanner state
  const [scanState, setScanState] = useState('idle'); // 'idle' | 'scanning' | 'success' | 'error'
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState(null);

  // Form states
  const [leaveType, setLeaveType] = useState('Annual');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveMsg, setLeaveMsg] = useState(null);

  // Settings form
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState(null);

  // Filter logs for this employee
  const myLogs = clockLogs.filter(log => log.employeeId === currentUser.id);
  const myLeaves = leaveRequests.filter(req => req.employeeId === currentUser.id);
  const myBalances = leaveBalances.find(bal => bal.employeeId === currentUser.id) || {
    annual: { allocated: 18, used: 0 },
    sick: { allocated: 14, used: 0 },
    emergency: { allocated: 5, used: 0 },
    maternity: { allocated: 90, used: 0 }
  };
  const myNotifs = notifications.filter(n => n.userId === currentUser.id);
  const myEmails = emails.filter(m => m.to === currentUser.email);

  // Mark notifications read when entering notifications tab
  useEffect(() => {
    if (activeTab === 'notif') {
      clearNotifications(currentUser.id);
    }
  }, [activeTab, currentUser.id]);

  // Biometric Clock-in scanner simulation
  useEffect(() => {
    let interval;
    if (scanState === 'scanning') {
      setScanProgress(0);
      interval = setInterval(() => {
        setScanProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(async () => {
              const verify = await verifyAgainstStored(currentUser.fingerprint);
              if (!verify.success) {
                setScanState('error');
                setScanResult({ success: false, message: verify.message });
                setTimeout(() => { setScanState('idle'); setScanResult(null); }, 3000);
                return;
              }
              const res = await clockInOrOut(currentUser.id, clockAction, verify.template);
              if (res && res.success) {
                setScanState('success');
                setScanResult({ success: true, message: res.message });
              } else {
                setScanState('error');
                setScanResult({ success: false, message: res ? res.message : 'Clock action failed' });
              }
              setTimeout(() => { setScanState('idle'); setScanResult(null); }, 3000);
            }, 600);
            return 100;
          }
          return p + Math.floor(Math.random() * 20) + 5;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [scanState, clockAction, currentUser.id, clockInOrOut]);

  // Handle leave apply
  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!leaveFrom || !leaveTo) return;
    
    // Calculate days
    const d1 = new Date(leaveFrom);
    const d2 = new Date(leaveTo);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    applyLeave(currentUser.id, {
      type: leaveType,
      from: leaveFrom,
      to: leaveTo,
      days: diffDays,
      reason: leaveReason
    });

    setLeaveMsg({ success: true, text: `Leave application for ${diffDays} day(s) submitted successfully!` });
    setLeaveFrom('');
    setLeaveTo('');
    setLeaveReason('');
    
    setTimeout(() => setLeaveMsg(null), 4000);
  };

  const today = new Date();
  const todayDate = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const todayLogs = clockLogs.filter(l => l.employeeId === currentUser.id && l.date === todayDate);
  const isCurrentlyClockedIn = todayLogs.some(log => log.actualIn && !log.actualOut);
  const hasCompletedToday = todayLogs.some(log => log.actualIn && log.actualOut);

  const rosterYear = today.getFullYear();
  const rosterMonth = today.getMonth() + 1;
  const rosterMonthKey = `${rosterYear}-${rosterMonth}`;

  const currentStatus = getEmployeeStatus(currentUser.id) || { status: 'not_yet', label: 'Unknown', detail: '' };

  const myRoster = roster[rosterMonthKey]?.[currentUser.id] || roster[currentUser.id] || {};
  const daysInMonth = new Date(rosterYear, rosterMonth, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayOfWeek = (day) => {
    const d = new Date(rosterYear, rosterMonth - 1, day).getDay();
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d];
  };

  const getDefaultType = (day) => {
    const d = new Date(rosterYear, rosterMonth - 1, day).getDay();
    const assignment = shiftAssignments[currentUser.id];
    if (assignment && assignment.schedule) {
      return assignment.schedule[d] ? 'WORKING' : 'DAY_OFF';
    }
    return (d === 0 || d === 6) ? 'DAY_OFF' : 'WORKING';
  };

  const isWeekend = (day) => {
    const d = new Date(rosterYear, rosterMonth - 1, day).getDay();
    return d === 0 || d === 6;
  };

  const checkPublicHoliday = (day) => {
    const dateStr = `${rosterYear}-${String(rosterMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return publicHolidays.find(h => h.date === dateStr || (h.recurring && h.date.slice(5) === dateStr.slice(5)));
  };

  const monthLabel = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-600/20">
            <Fingerprint className="text-gold-300 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-primary-800">HR Portal</h1>
            <p className="text-[10px] text-slate-400">Employee Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <Avatar name={currentUser.name} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-primary-800 leading-tight">{currentUser.name}</p>
              <p className="text-[9px] text-slate-400 leading-tight">{currentUser.role} · {currentUser.department}</p>
            </div>
            <button onClick={logout} title="Sign Out"
              className="btn-ghost p-2 rounded-lg text-red-500 hover:bg-red-50">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-56 flex-shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {[
            { id: 'clock', label: 'Biometric Clock-In', icon: Fingerprint },
            { id: 'leave', label: 'Apply for Leave', icon: FileText },
            { id: 'roster', label: 'My Shift Roster', icon: Calendar },
            { id: 'notif', label: 'Notifications', icon: Bell, badge: myNotifs.filter(n => !n.read).length },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-primary-50 hover:text-primary-700 border border-slate-200'
              }`}
            >
              <Icon size={16} />
              <span className="flex-1 text-left">{label}</span>
              {badge > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  activeTab === id ? 'bg-white text-primary-600' : 'bg-red-500 text-white animate-pulse'
                }`}>{badge}</span>
              )}
            </button>
          ))}
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          
          {/* Tab 1: Biometric Clock-in */}
          {activeTab === 'clock' && (
            <div className="space-y-6">
              
              {/* Main Clock Card */}
              <div className="card p-6 flex flex-col md:flex-row items-center gap-8 justify-between">
                <div className="space-y-3 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-semibold border border-emerald-200">
                    <ShieldCheck size={12} /> Biometric Authentication Active
                  </div>
                  <h2 className="text-xl font-bold text-primary-800">Biometric Clock-In</h2>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Click the fingerprint button to authenticate using your device biometrics
                    (Windows Hello, Touch ID, or fingerprint reader).
                  </p>
                  
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Current Status:</span>
                      <StatusBadge status={currentStatus.status} />
                    </div>
                    {currentStatus.detail && (
                      <p className="text-[10px] text-gray-400">{currentStatus.detail}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    Assigned Shift: <span className="text-primary-500 font-semibold">{currentUser.shift}</span>
                  </div>
                </div>

                {/* Scanner Interface */}
                <div className="flex flex-col items-center justify-center p-5 border border-slate-200 rounded-2xl bg-slate-50 w-full max-w-xs gap-4">
                  {scanState === 'idle' ? (
                    <>
                      {/* Clock In / Out toggle */}
                      <div className="grid grid-cols-2 bg-slate-200 p-0.5 rounded-xl w-full">
                        <button
                          onClick={() => setClockAction('in')}
                          disabled={isCurrentlyClockedIn || hasCompletedToday}
                          className={`py-2 text-[11px] font-bold rounded-lg transition-all
                            ${clockAction === 'in'
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-primary-700'}
                            disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          Clock In
                        </button>
                        <button
                          onClick={() => setClockAction('out')}
                          disabled={!isCurrentlyClockedIn || hasCompletedToday}
                          className={`py-2 text-[11px] font-bold rounded-lg transition-all
                            ${clockAction === 'out'
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-primary-700'}
                            disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          Clock Out
                        </button>
                      </div>

                      {/* Fingerprint Scanner Button */}
                      <button
                        onClick={() => setScanState('scanning')}
                        disabled={!currentUser.fingerprint || hasCompletedToday}
                        className="relative group w-28 h-28 bg-white border-2 border-primary-200 rounded-full flex flex-col items-center justify-center shadow-lg hover:border-primary-500 hover:shadow-primary-200 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-2 rounded-full bg-primary-50 group-hover:bg-primary-100 transition-colors" />
                        <Fingerprint size={36} className="relative z-10 text-primary-600 group-hover:scale-105 transition-transform" />
                        <span className="relative z-10 text-[9px] font-bold text-primary-600 mt-1">Scan Finger</span>
                      </button>

                      {!currentUser.fingerprint && (
                        <div className="w-full text-center bg-amber-50 border border-amber-200 rounded-lg p-2">
                          <p className="text-[10px] text-amber-700 font-semibold">No fingerprint enrolled</p>
                          <p className="text-[9px] text-amber-600">Contact HR to enroll your fingerprint</p>
                        </div>
                      )}

                      {currentUser.fingerprint && !hasCompletedToday && (
                        <p className="text-[9px] text-slate-400 text-center">
                          Place your finger on the USB scanner, then click the button
                        </p>
                      )}

                      {hasCompletedToday && (
                        <div className="w-full text-center bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                          <p className="text-[10px] text-emerald-700 font-semibold">✓ Attendance recorded for today</p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* SCANNING / RESULT ANIMATION */
                    <div className="flex flex-col items-center py-4 text-center w-full gap-3">
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <div className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${
                          scanState === 'scanning' ? 'border-primary-400 animate-ping opacity-20' :
                          scanState === 'success'  ? 'border-emerald-400 scale-105 opacity-0' : 'border-red-400'
                        }`} />
                        <div className={`absolute inset-1 rounded-full border transition-colors ${
                          scanState === 'scanning' ? 'border-primary-300 bg-primary-50' :
                          scanState === 'success'  ? 'border-emerald-300 bg-emerald-50' : 'border-red-200 bg-red-50'
                        }`} />
                        <Fingerprint size={42} className={`relative z-10 ${
                          scanState === 'scanning' ? 'text-primary-500 animate-pulse' :
                          scanState === 'success'  ? 'text-emerald-500' : 'text-red-500'
                        }`} />

                        {scanState === 'scanning' && (
                          <div
                            className="absolute left-3 right-3 h-0.5 bg-primary-400 shadow shadow-primary-300 z-20 rounded"
                            style={{ animation: 'scan-line 1.5s ease-in-out infinite', top: `${scanProgress}%` }}
                          />
                        )}
                      </div>

                      <div>
                        <h4 className={`text-xs font-bold ${
                          scanState === 'success' ? 'text-emerald-600' :
                          scanState === 'error'   ? 'text-red-600' : 'text-primary-700'
                        }`}>
                          {scanState === 'scanning' ? 'Reading fingerprint…' :
                           scanState === 'success'  ? 'Verified ✓' : 'Scan Error'}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {scanState === 'scanning'
                            ? `Verifying against database: ${scanProgress}%`
                            : scanResult?.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Log Table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <h3 className="section-heading">My Attendance Logs</h3>
                  <span className="text-xs text-gray-400">{myLogs.length} Records</span>
                </div>
                {myLogs.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-xs">No attendance logs found for this period.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <th className="table-th text-left px-5">Date</th>
                          <th className="table-th text-center">Expected Shift</th>
                          <th className="table-th text-center">Clock In</th>
                          <th className="table-th text-center">Clock Out</th>
                          <th className="table-th text-center">Hours Worked</th>
                          <th className="table-th text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myLogs.map(log => (
                          <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20 border-b border-gray-100 dark:border-gray-900 text-xs text-center">
                            <td className="table-td text-left px-5 font-medium">{log.date || 'Today'}</td>
                            <td className="table-td">{log.shift} ({log.expectedIn}-{log.expectedOut})</td>
                            <td className="table-td font-semibold text-gray-800 dark:text-gray-200">{log.actualIn || '--'}</td>
                            <td className="table-td font-semibold text-gray-800 dark:text-gray-200">{log.actualOut || '--'}</td>
                            <td className="table-td font-medium">{log.totalHours !== null ? `${log.totalHours} hrs` : '--'}</td>
                            <td className="table-td">
                              <StatusBadge status={log.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Leave Application */}
          {activeTab === 'leave' && (
            <div className="space-y-6">
              
              {/* Leave Balances Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Annual Leave', key: 'annual', color: 'blue' },
                  { name: 'Sick Leave', key: 'sick', color: 'amber' },
                  { name: 'Emergency Leave', key: 'emergency', color: 'red' },
                  { name: 'Maternity Leave', key: 'maternity', color: 'purple' },
                ].map(({ name, key, color }) => {
                  const bal = myBalances[key];
                  const remaining = bal.allocated - bal.used;
                  return (
                    <div key={key} className="card p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{name}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{remaining}</span>
                        <span className="text-xs text-gray-400">/ {bal.allocated} days remaining</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            color === 'blue' ? 'bg-blue-500' :
                            color === 'amber' ? 'bg-amber-500' :
                            color === 'red' ? 'bg-red-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${(remaining / bal.allocated) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 block">{bal.used} days taken</span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Apply Form */}
                <div className="card p-5 lg:col-span-5 space-y-4">
                  <h3 className="section-heading">Apply for Leave</h3>
                  
                  {leaveMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
                      <CheckCircle size={14} /> {leaveMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
                    <div>
                      <label className="label">Leave Type</label>
                      <select
                        className="input w-full"
                        value={leaveType}
                        onChange={e => setLeaveType(e.target.value)}
                      >
                        <option>Annual</option>
                        <option>Sick</option>
                        <option>Emergency</option>
                        <option>Maternity</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Start Date</label>
                        <input
                          type="date"
                          required
                          className="input w-full"
                          value={leaveFrom}
                          onChange={e => setLeaveFrom(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">End Date</label>
                        <input
                          type="date"
                          required
                          className="input w-full"
                          value={leaveTo}
                          onChange={e => setLeaveTo(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Reason for Absence</label>
                      <textarea
                        required
                        placeholder="Please provide details (e.g. medical checkup, personal travel)"
                        rows={3}
                        className="input w-full resize-none"
                        value={leaveReason}
                        onChange={e => setLeaveReason(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn-primary w-full justify-center">
                      <Send size={14} /> Submit Application
                    </button>
                  </form>
                </div>

                {/* History Table */}
                <div className="card lg:col-span-7 flex flex-col overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="section-heading">My Leave History</h3>
                  </div>
                  {myLeaves.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8 text-gray-400 text-xs">No leave requests found.</div>
                  ) : (
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800 text-center">
                            <th className="table-th text-left px-5">Type</th>
                            <th className="table-th">Dates</th>
                            <th className="table-th">Days</th>
                            <th className="table-th text-left">Reason</th>
                            <th className="table-th">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myLeaves.map(req => (
                            <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20 border-b border-gray-100 dark:border-gray-900 text-center">
                              <td className="table-td text-left px-5 font-semibold text-gray-700 dark:text-gray-300">{req.type}</td>
                              <td className="table-td text-gray-500 whitespace-nowrap">{req.from} to {req.to}</td>
                              <td className="table-td font-semibold">{req.days}d</td>
                              <td className="table-td text-left max-w-40 truncate text-gray-500" title={req.reason}>{req.reason}</td>
                              <td className="table-td">
                                <StatusBadge status={req.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Tab 3: My Roster */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              
              <div className="card p-5 space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="section-heading text-base">My Shift Schedule — {monthLabel}</h3>
                    <p className="text-[11px] text-gray-400">Review your working days, shifts, holidays and days off for the current roster period.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800" />
                      <span className="text-[10px] text-gray-400">Scheduled Shifts</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                      <span className="text-[10px] text-gray-400">Day Off</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {monthDays.map(day => {
                    const type = myRoster[day] || getDefaultType(day);
                    const dow = getDayOfWeek(day);
                    const isWk = isWeekend(day);
                    const holiday = checkPublicHoliday(day);
                    const isToday = today.getDate() === day && today.getMonth() + 1 === rosterMonth && today.getFullYear() === rosterYear;

                    return (
                      <div
                        key={day}
                        className={`p-3 rounded-xl border flex flex-col justify-between h-20 transition-all ${
                          isToday ? 'border-primary-500 bg-primary-50/20 shadow-md ring-1 ring-primary-500/30' :
                          holiday ? 'border-orange-200 bg-orange-50/20 dark:border-orange-900/30' :
                          isWk ? 'border-gray-200 bg-gray-50/30 dark:border-gray-800/20 dark:bg-gray-950/20' :
                          'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-bold ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>{dow}</span>
                          <span className={`text-xs font-bold leading-none w-5 h-5 rounded-full flex items-center justify-center ${
                            isToday ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-800 dark:text-gray-200'
                          }`}>{day}</span>
                        </div>

                        {holiday && (
                          <span className="text-[8px] font-semibold text-orange-600 dark:text-orange-400 truncate max-w-full leading-tight" title={holiday.name}>
                            {holiday.name}
                          </span>
                        )}

                        <div className="text-right">
                          <RosterChip type={type} shiftName={type === 'WORKING' ? currentUser.shift : null} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Notifications & Email Simulator */}
          {activeTab === 'notif' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* System Notifications */}
              <div className="card flex flex-col h-[500px]">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-primary-500" />
                    <h3 className="section-heading">System Notifications</h3>
                  </div>
                  <span className="text-[10px] bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 px-2 py-0.5 rounded font-bold">
                    {myNotifs.length} Total
                  </span>
                </div>
                
                {myNotifs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
                    <Inbox size={32} className="stroke-1 mb-2" />
                    <span className="text-xs">No notifications yet</span>
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {myNotifs.map(n => (
                      <div
                        key={n.id}
                        className={`p-3.5 rounded-xl border flex gap-3 items-start transition-all ${
                          n.read
                            ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/80 opacity-75'
                            : 'bg-primary-50/20 dark:bg-primary-950/10 border-primary-100 dark:border-primary-900/40 shadow-sm'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg mt-0.5 ${
                          n.type === 'leave' ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' :
                          n.type === 'roster' ? 'bg-purple-50 text-purple-500 dark:bg-purple-900/20' :
                          'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20'
                        }`}>
                          {n.type === 'leave' ? <FileText size={14} /> :
                           n.type === 'roster' ? <Calendar size={14} /> : <Clock size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-normal">{n.message}</p>
                          <span className="text-[9px] text-gray-400 block mt-1">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Email Client Simulator */}
              <div className="card flex flex-col h-[500px]">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-indigo-500" />
                    <h3 className="section-heading">My Simulated Email Inbox</h3>
                  </div>
                  <span className="text-[9px] text-gray-400">Company Mailroom</span>
                </div>
                
                {myEmails.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
                    <Mail size={32} className="stroke-1 mb-2" />
                    <span className="text-xs">Your inbox is clean</span>
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1 p-4 space-y-3 bg-gray-50/40 dark:bg-gray-950/30">
                    {myEmails.map(mail => (
                      <div key={mail.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-2 shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded">
                            {mail.subject}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">{mail.sentAt}</span>
                        </div>
                        <div className="border-t border-gray-50 dark:border-gray-800/80 pt-2 text-[10px] text-gray-400 leading-normal">
                          <div className="font-semibold mb-1">To: <span className="text-gray-600 dark:text-gray-300">{mail.to}</span></div>
                          <div className="whitespace-pre-line text-gray-500 mt-1 font-mono">{mail.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Tab 5: Settings */}
          {activeTab === 'settings' && (
            <div className="card p-6 max-w-md mx-auto mt-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="section-heading text-lg">Account Settings</h3>
                  <p className="text-[10px] text-gray-500">Update your portal login password</p>
                </div>
              </div>

              {pwdMsg && (
                <div className={`p-3 rounded-xl border text-xs mb-4 flex items-center gap-2 ${
                  pwdMsg.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {pwdMsg.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {pwdMsg.text}
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="label">New Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    className="input w-full"
                    placeholder="Min 6 characters"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    className="input w-full"
                    placeholder="Re-enter password"
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                  />
                </div>

                <button
                  className="btn-primary w-full py-2.5 mt-2"
                  onClick={() => {
                    if (newPwd.length < 6) {
                      setPwdMsg({ success: false, text: 'Password must be at least 6 characters long.' });
                      return;
                    }
                    if (newPwd !== confirmPwd) {
                      setPwdMsg({ success: false, text: 'Passwords do not match.' });
                      return;
                    }
                    resetPassword(currentUser.id, newPwd);
                    setPwdMsg({ success: true, text: 'Password updated successfully!' });
                    setNewPwd('');
                    setConfirmPwd('');
                    setTimeout(() => setPwdMsg(null), 3000);
                  }}
                >
                  Change Password
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Embedded scanner styles */}
      <style>{`
        @keyframes scan-line {
          0% { top: 15%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
