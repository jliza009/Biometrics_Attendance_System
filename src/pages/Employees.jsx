import { useState, useEffect } from 'react';
import { Search, Plus, Mail, Phone, Calendar, Fingerprint, ShieldCheck, CheckCircle, Users, WifiOff, Key, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { useSystem } from '../hooks/useSystem';
import { Avatar, StatusBadge, ShiftBadge, Drawer, Modal, ProgressBar, EmptyState } from '../components/ui';
import { captureFingerprint, getScannerStatus } from '../utils/fingerprintScanner';

const LEAVE_TYPES = ['annual', 'sick', 'emergency', 'maternity'];
const LEAVE_LABELS = { annual: 'Annual', sick: 'Sick', emergency: 'Emergency', maternity: 'Maternity' };
const LEAVE_COLORS = { annual: 'blue', sick: 'amber', emergency: 'red', maternity: 'purple' };

// ── Employee Card ──────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onClick, attendanceStatus }) {
  return (
    <button
      onClick={() => onClick(emp)}
      className="card p-5 text-left hover:shadow-md hover:border-primary-200 transition-all duration-150 group w-full"
      id={`emp-card-${emp.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <Avatar name={emp.name} size="lg" />
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
            ${emp.status === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {emp.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <p className="font-bold text-primary-800 text-sm">{emp.name}</p>
      <p className="text-xs text-slate-500 mt-0.5">{emp.role}</p>
      <p className="text-xs text-slate-400 mt-0.5">{emp.department}</p>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-1">
        {attendanceStatus && <StatusBadge status={attendanceStatus.status} />}
        <ShiftBadge shift={emp.shift} />
        {emp.fingerprint ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            <Fingerprint size={10} /> Biometric
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gold-600 bg-gold-50 px-1.5 py-0.5 rounded-full">
            <Fingerprint size={10} /> No Scan
          </span>
        )}
      </div>
    </button>
  );
}

// ── Add Employee Modal ──────────────────────────────────────────────────────────
function AddEmployeeModal({ open, onClose }) {
  const { addEmployee, departments, addDepartment, shifts } = useSystem();
  const defaultShift = shifts[0]?.name || 'Morning';
  const [form, setForm] = useState({
    name: '', role: '', department: departments[0] || '', shift: defaultShift, email: '', phone: '', password: '', confirmPassword: '',
  });
  const [newDeptMode, setNewDeptMode] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricData, setBiometricData] = useState(null);
  const [scanState, setScanState] = useState('idle'); // 'idle' | 'scanning' | 'success'
  const [scanProgress, setScanProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState(null); // null | { available, mode, message }

  // Check if the fingerprint bridge is running when the modal opens
  useEffect(() => {
    if (open) {
      getScannerStatus().then(setBridgeStatus);
    }
  }, [open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    let interval;
    if (scanState === 'scanning') {
      setScanProgress(0);
      interval = setInterval(() => {
        setScanProgress(p => (p >= 95 ? 95 : p + Math.floor(Math.random() * 12) + 4));
      }, 150);
    }
    return () => clearInterval(interval);
  }, [scanState]);

  const handleStartScan = () => {
    setScanState('scanning');
    captureFingerprint()
      .then(fp => {
        setBiometricData(fp);
        setScanState('success');
        setBiometricRegistered(true);
      })
      .catch(err => {
        alert(err.message);
        setScanState('idle');
      });
  };

  const handleSave = async () => {
    if (!form.name || !form.role || !form.email) {
      alert('Please fill in Name, Role, and Email fields.');
      return;
    }
    if (!form.password || form.password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      alert('Passwords do not match. Please re-enter.');
      return;
    }
    if (!biometricData) {
      alert('Biometric fingerprint is required for clock-in/out access.');
      return;
    }
    setSaving(true);
    const { confirmPassword, ...empData } = form;
    const result = await addEmployee({ ...empData, fingerprint: biometricData });
    setSaving(false);
    if (!result.success) { alert(result.message); return; }
    setForm({ name: '', role: '', department: departments[0] || '', shift: defaultShift, email: '', phone: '', password: '', confirmPassword: '' });
    setNewDeptMode(false);
    setNewDeptName('');
    setBiometricRegistered(false);
    setBiometricData(null);
    setScanState('idle');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Employee" width="max-w-lg">
      <div className="space-y-4 text-xs">
        {/* Name + Role */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input id="add-emp-name" className="input" placeholder="Jane Smith"
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Role / Job Title <span className="text-red-500">*</span></label>
            <input id="add-emp-role" className="input" placeholder="Software Engineer"
              value={form.role} onChange={e => set('role', e.target.value)} />
          </div>
        </div>

        {/* Department + Shift */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Department</label>
            {newDeptMode ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  className="input flex-1"
                  placeholder="Department name"
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newDeptName.trim()) {
                      addDepartment(newDeptName);
                      set('department', newDeptName.trim());
                      setNewDeptMode(false); setNewDeptName('');
                    }
                    if (e.key === 'Escape') { setNewDeptMode(false); setNewDeptName(''); }
                  }}
                />
                <button
                  type="button"
                  className="btn-primary px-2 py-1 text-[10px]"
                  onClick={() => {
                    if (newDeptName.trim()) {
                      addDepartment(newDeptName);
                      set('department', newDeptName.trim());
                    }
                    setNewDeptMode(false); setNewDeptName('');
                  }}
                >Save</button>
                <button type="button" className="btn-ghost px-2 py-1 text-[10px]" onClick={() => { setNewDeptMode(false); setNewDeptName(''); }}>✕</button>
              </div>
            ) : (
              <select
                id="add-emp-dept" className="input"
                value={form.department}
                onChange={e => {
                  if (e.target.value === '__new__') { setNewDeptMode(true); }
                  else { set('department', e.target.value); }
                }}
              >
                {departments.map(d => <option key={d}>{d}</option>)}
                <option value="__new__">+ Add new department…</option>
              </select>
            )}
          </div>
          <div>
            <label className="label">Shift</label>
            <select id="add-emp-shift" className="input" value={form.shift} onChange={e => set('shift', e.target.value)}>
              {shifts.map(s => <option key={s.id} value={s.name}>{s.name} ({s.start}–{s.end})</option>)}
            </select>
          </div>
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email Address <span className="text-red-500">*</span></label>
            <input id="add-emp-email" className="input" placeholder="jane@company.com" type="email"
              value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input id="add-emp-phone" className="input" placeholder="+1-555-0199"
              value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>

        {/* Login Password */}
        <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-4 space-y-3">
          <div>
            <span className="font-bold text-primary-800 text-xs">Login Password</span>
            <p className="text-[10px] text-slate-500 mt-0.5">Employee uses this to sign in to the HR Portal</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Password <span className="text-red-500">*</span></label>
              <input id="add-emp-password" className="input" type="password" placeholder="Min 6 characters"
                value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <div>
              <label className="label">Confirm Password <span className="text-red-500">*</span></label>
              <input id="add-emp-confirm-password" className="input" type="password" placeholder="Re-enter password"
                value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Biometric Scan Section */}
        <div className={`rounded-xl p-4 space-y-3 border-2 transition-colors ${
          biometricRegistered
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-dashed border-primary-200 bg-primary-50/40'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <span className="font-bold text-primary-800 text-xs">Biometric Registration</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Required for clock-in / clock-out via USB fingerprint reader</p>
            </div>
            {biometricRegistered ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                <ShieldCheck size={11} /> Enrolled
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-gold-600 bg-gold-100 px-2 py-1 rounded-full">
                Required
              </span>
            )}
          </div>

          {/* Bridge Status Indicator */}
          {bridgeStatus && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium border ${
              bridgeStatus.available
                ? bridgeStatus.mode === 'simulation'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {bridgeStatus.available
                ? bridgeStatus.mode === 'simulation'
                  ? <><Fingerprint size={11} /> Bridge running (simulation mode — no USB scanner detected)</>
                  : <><ShieldCheck size={11} /> USB scanner connected ({bridgeStatus.mode})</>
                : <><WifiOff size={11} /> Bridge offline — run <code className="font-mono bg-red-100 px-1 rounded">npm run dev:fp</code> in a terminal</>
              }
            </div>
          )}

          {scanState === 'idle' && (
            <button
              type="button"
              onClick={handleStartScan}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary-200 bg-white hover:bg-primary-50 text-primary-700 font-semibold text-xs transition-colors"
            >
              <Fingerprint size={15} className="text-primary-500" />
              Place Finger on USB Scanner &amp; Scan
            </button>
          )}

          {scanState === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-3 space-y-3 text-center">
              <div className="relative w-16 h-16 flex items-center justify-center border-2 border-primary-300 rounded-full bg-primary-50">
                <Fingerprint size={30} className="text-primary-500 animate-pulse" />
                <div
                  className="absolute left-2 right-2 h-0.5 bg-primary-400 shadow shadow-primary-400 rounded"
                  style={{ animation: 'scan-line 1.5s ease-in-out infinite', top: `${scanProgress}%` }}
                />
              </div>
              <div>
                <p className="text-xs font-bold text-primary-700">Scanning…</p>
                <div className="mt-2 w-40 bg-primary-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${scanProgress}%` }} />
                </div>
                <p className="text-[10px] text-primary-500 mt-1">{scanProgress}% complete</p>
              </div>
            </div>
          )}

          {scanState === 'success' && (
            <div className="flex items-center gap-3 bg-white border border-emerald-200 p-3 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-700">Fingerprint Enrolled</p>
                <p className="text-[9px] text-slate-400 font-mono truncate">ID: {biometricData?.id}</p>
              </div>
              <button
                type="button"
                onClick={() => { setScanState('idle'); setBiometricRegistered(false); setBiometricData(null); }}
                className="text-[10px] font-semibold text-slate-400 hover:text-primary-600 transition-colors"
              >
                Re-scan
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-secondary py-2" onClick={onClose}>Cancel</button>
          <button
            id="save-employee-btn"
            className="btn-primary py-2"
            onClick={handleSave}
            disabled={!form.name || !form.role || !form.email || !biometricRegistered || saving || form.password.length < 6 || form.password !== form.confirmPassword}
          >
            {saving ? 'Saving…' : 'Save Employee'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scan-line {
          0%   { top: 15%; opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
      `}</style>
    </Modal>
  );
}

// ── Employee Detail Drawer ────────────────────────────────────────────────────
function EmployeeDrawer({ emp, leaveBalances, leavePolicy, onClose, getEmployeeStatus, onResetPassword, onResetFingerprint, onDeleteEmployee, onUpdateEmployee }) {
  if (!emp) return null;
  const balance = leaveBalances.find(b => b.employeeId === emp.id);
  const status = getEmployeeStatus(emp.id);

  const [reEnrolling, setReEnrolling] = useState(false);

  const handleReEnrollFp = async () => {
    if (!window.confirm(`Register a new fingerprint for ${emp.name}? This will overwrite the existing one.`)) return;
    setReEnrolling(true);
    try {
      const { captureFingerprint } = await import('../utils/fingerprintScanner');
      const fp = await captureFingerprint({ name: emp.name, email: emp.email });
      const res = await onUpdateEmployee(emp.id, { fingerprint: fp });
      if (res.success) {
        alert('Successfully enrolled new fingerprint!');
      } else {
        alert('Failed to save new fingerprint: ' + res.message);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setReEnrolling(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to completely delete ${emp.name}? This action cannot be undone.`)) return;
    const success = await onDeleteEmployee(emp.id);
    if (success) {
      onClose();
    } else {
      alert('Failed to delete employee.');
    }
  };

  return (
    <Drawer open={!!emp} onClose={onClose} title="Employee Detail">
      <div className="space-y-5 text-xs">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
          <Avatar name={emp.name} size="lg" />
          <div>
            <p className="font-bold text-base text-primary-800">{emp.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{emp.role} · {emp.department}</p>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <StatusBadge status={emp.status} />
              <ShiftBadge shift={emp.shift} />
              {status && <StatusBadge status={status.status} />}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Contact &amp; Info</h3>
          <div className="flex items-center gap-2 text-slate-600">
            <Mail size={13} className="text-primary-400 flex-shrink-0" />
            <span>{emp.email}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Phone size={13} className="text-primary-400 flex-shrink-0" />
            <span>{emp.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={13} className="text-primary-400 flex-shrink-0" />
            <span>Joined {emp.startDate}</span>
          </div>

          {/* Fingerprint row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
            <div className="flex items-center gap-2">
              <Fingerprint size={13} className={emp.fingerprint ? 'text-emerald-500' : 'text-amber-500'} />
              <span className={`font-semibold text-[11px] ${emp.fingerprint ? 'text-emerald-600' : 'text-amber-600'}`}>
                {emp.fingerprint ? `Biometric enrolled (✓ ${emp.fingerprint?.id || 'registered'})` : 'No biometric enrolled'}
              </span>
            </div>
            <button
              onClick={handleReEnrollFp}
              disabled={reEnrolling}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${
                reEnrolling 
                  ? 'bg-primary-50 text-primary-500 cursor-not-allowed animate-pulse' 
                  : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
              }`}
              title="Scan and overwrite fingerprint"
            >
              <RotateCcw size={11} className={reEnrolling ? 'animate-spin' : ''} />
              {reEnrolling ? 'Scanning...' : (emp.fingerprint ? 'Re-enroll' : 'Enroll FP')}
            </button>
          </div>
        </div>


        {/* Leave balances */}
        {balance && (
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Leave Balances ({leavePolicy?.yearStart?.slice(0, 4) || new Date().getFullYear()})
            </h3>
            {LEAVE_TYPES.map(type => {
              const b = balance[type];
              if (!b) return null;
              return (
                <div key={type} className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">{LEAVE_LABELS[type]}</span>
                    <span className="text-slate-400 font-medium">{b.used} / {b.allocated} used</span>
                  </div>
                  <ProgressBar value={b.used} max={b.allocated} color={LEAVE_COLORS[type]} />
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Employee */}
        <div className="pt-2">
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 py-2.5 rounded-xl transition-colors"
          >
            <Trash2 size={13} /> Delete Employee Account
          </button>
        </div>
      </div>
    </Drawer>
  );
}

// ── Main Employees Page ───────────────────────────────────────────────────────
export default function Employees() {
  const {
    employees, departments, leaveBalances, leavePolicy,
    getEmployeeStatus, resetPassword, resetFingerprint, deleteEmployee, updateEmployee
  } = useSystem();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'All' || e.department === deptFilter;
    const matchStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Employee Directory</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {employees.length} total · {employees.filter(e => e.status === 'active').length} active
          </p>
        </div>
        <button id="add-employee-btn" className="btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={15} /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="emp-search"
            className="input pl-9"
            placeholder="Search by name or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select id="dept-filter" className="input w-44" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="All">All Departments</option>
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
        <select id="status-filter" className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Quick stats */}
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500 border-l border-slate-200 pl-3">
          <span><strong className="text-primary-700">{filtered.length}</strong> shown</span>
          <span className="text-slate-300">|</span>
          <span><strong className="text-emerald-600">{filtered.filter(e => e.status === 'active').length}</strong> active</span>
          <span className="text-slate-300">|</span>
          <span><strong className="text-slate-500">{filtered.filter(e => e.status === 'inactive').length}</strong> inactive</span>
        </div>
      </div>

      {/* Employee Grid */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            message={employees.length === 0 ? 'No employees yet' : 'No employees match your filters'}
            sub={employees.length === 0 ? 'Click "Add Employee" to get started' : 'Try adjusting your search or filters'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              onClick={setSelected}
              attendanceStatus={getEmployeeStatus(emp.id)}
            />
          ))}
        </div>
      )}

      {selected && (
        <EmployeeDrawer
          key={selected.id}
          emp={employees.find(e => e.id === selected.id) || selected}
          leaveBalances={leaveBalances}
          leavePolicy={leavePolicy}
          getEmployeeStatus={getEmployeeStatus}
          onResetPassword={resetPassword}
          onResetFingerprint={resetFingerprint}
          onDeleteEmployee={deleteEmployee}
          onUpdateEmployee={updateEmployee}
          onClose={() => setSelected(null)}
        />
      )}
      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
