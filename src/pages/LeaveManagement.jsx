import { useState } from 'react';
import { Plus, Check, X, Eye, ShieldAlert, Thermometer } from 'lucide-react';
import { useSystem } from '../hooks/useSystem';
import { StatusBadge, Avatar, Modal, ProgressBar } from '../components/ui';

const LEAVE_TYPES = ['Annual', 'Sick', 'Emergency', 'Maternity'];
const LEAVE_COLORS = { Annual: 'blue', Sick: 'amber', Emergency: 'red', Maternity: 'purple' };

function LogSickDayModal({ open, onClose }) {
  const { employees, addSickDay } = useSystem();
  const [empId, setEmpId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!empId || !date) return;
    addSickDay(parseInt(empId, 10), date);
    setEmpId('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Log Sick Day (Direct Approval)" width="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-amber-50/20 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/40 p-3 rounded-lg flex gap-2.5">
          <Thermometer className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-gray-500 leading-normal">
            This logs a sick day for the employee. It automatically creates an <strong>Approved</strong> Sick Leave entry and marks the day as <strong>Sick (S)</strong> on the roster.
          </p>
        </div>

        <div>
          <label className="label text-[10px]">Select Employee</label>
          <select required className="input w-full" value={empId} onChange={e => setEmpId(e.target.value)}>
            <option value="">Choose employee…</option>
            {employees.filter(e => e.status === 'active').map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label text-[10px]">Date of Absence</label>
          <input type="date" required className="input w-full" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!empId || !date} className="btn-primary bg-amber-600 hover:bg-amber-500 shadow-amber-500/10">
            Log Sick Day
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ApplyLeaveModal({ open, onClose }) {
  const { employees, applyLeave } = useSystem();
  const [form, setForm] = useState({ employeeId: '', type: 'Annual', from: '', to: '', reason: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const days = form.from && form.to
    ? Math.max(1, Math.ceil((new Date(form.to) - new Date(form.from)) / 86400000) + 1)
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.from || !form.to) return;
    
    applyLeave(parseInt(form.employeeId, 10), {
      type: form.type,
      from: form.from,
      to: form.to,
      days: days,
      reason: form.reason
    });

    setForm({ employeeId: '', type: 'Annual', from: '', to: '', reason: '' });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Submit Leave Request" width="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="label text-[10px]">Employee</label>
          <select required className="input w-full" value={form.employeeId} onChange={e => set('employeeId', e.target.value)}>
            <option value="">Select employee…</option>
            {employees.filter(e => e.status === 'active').map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-[10px]">Leave Type</label>
          <select className="input w-full" value={form.type} onChange={e => set('type', e.target.value)}>
            {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-[10px]">From Date</label>
            <input required type="date" className="input w-full" value={form.from} onChange={e => set('from', e.target.value)} />
          </div>
          <div>
            <label className="label text-[10px]">To Date</label>
            <input required type="date" className="input w-full" value={form.to} onChange={e => set('to', e.target.value)} />
          </div>
        </div>
        {days > 0 && (
          <p className="text-xs text-primary-600 dark:text-primary-400 font-semibold">
            Total Duration: {days} calendar day{days !== 1 ? 's' : ''}
          </p>
        )}
        <div>
          <label className="label text-[10px]">Reason</label>
          <textarea
            required
            className="input w-full resize-none"
            rows={3}
            placeholder="Briefly describe the reason…"
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!form.employeeId || !form.from || !form.to} className="btn-primary">
            Submit Request
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LeaveRequestsTab() {
  const { leaveRequests, updateLeaveStatus } = useSystem();
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = leaveRequests.filter(r => {
    const ms = statusFilter === 'All' || r.status === statusFilter.toLowerCase();
    const mt = typeFilter === 'All' || r.type === typeFilter;
    return ms && mt;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select id="req-status-filter" className="input w-40 text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {['All', 'Pending', 'Approved', 'Rejected'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select id="req-type-filter" className="input w-40 text-xs" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="All">All Types</option>
          {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-2">{filtered.length} records found</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                <th className="table-th pl-5">Employee</th>
                <th className="table-th">Leave Type</th>
                <th className="table-th">From</th>
                <th className="table-th">To</th>
                <th className="table-th">Days</th>
                <th className="table-th">Reason</th>
                <th className="table-th">Status</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 border-b border-gray-100 dark:border-gray-900 transition-colors">
                  <td className="table-td pl-5">
                    <div className="flex items-center gap-2">
                      <Avatar name={req.employeeName} size="sm" />
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{req.employeeName}</p>
                        <p className="text-[10px] text-gray-400">{req.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-${LEAVE_COLORS[req.type]}-100 text-${LEAVE_COLORS[req.type]}-700 dark:bg-${LEAVE_COLORS[req.type]}-900/20 dark:text-${LEAVE_COLORS[req.type]}-400`}>
                      {req.type}
                    </span>
                  </td>
                  <td className="table-td text-gray-500">{req.from}</td>
                  <td className="table-td text-gray-500">{req.to}</td>
                  <td className="table-td font-semibold text-gray-800 dark:text-gray-200">{req.days}d</td>
                  <td className="table-td max-w-[160px]">
                    <p className="truncate text-gray-500" title={req.reason}>{req.reason}</p>
                  </td>
                  <td className="table-td"><StatusBadge status={req.status} /></td>
                  <td className="table-td">
                    {req.status === 'pending' ? (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => updateLeaveStatus(req.id, 'approved')} className="btn-success py-1 text-xs" id={`approve-${req.id}`}>
                          <Check size={12} /> Approve
                        </button>
                        <button onClick={() => updateLeaveStatus(req.id, 'rejected')} className="btn-danger py-1 text-xs" id={`reject-${req.id}`}>
                          <X size={12} /> Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-[10px] font-medium">Logged & Processed</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdjustBalanceModal({ open, onClose }) {
  const { employees, adjustLeaveBalance } = useSystem();
  const [empId, setEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('Annual');
  const [days, setDays] = useState(1);
  const [action, setAction] = useState('add');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!empId || days < 1) return;
    adjustLeaveBalance(parseInt(empId, 10), leaveType, days, action);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Adjust Leave Balance (Admin Only)" width="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <p className="text-gray-400">Adding days increases allocation. Deduction increases used days (admin-triggered only).</p>
        <div>
          <label className="label">Employee</label>
          <select required className="input w-full" value={empId} onChange={e => setEmpId(e.target.value)}>
            <option value="">Select…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Leave Type</label>
            <select className="input w-full" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
              {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Days</label>
            <input type="number" min={1} className="input w-full" value={days} onChange={e => setDays(parseInt(e.target.value, 10) || 1)} />
          </div>
        </div>
        <div>
          <label className="label">Action</label>
          <select className="input w-full" value={action} onChange={e => setAction(e.target.value)}>
            <option value="add">Add to allocation</option>
            <option value="deduct">Deduct (mark as used)</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Apply Adjustment</button>
        </div>
      </form>
    </Modal>
  );
}

function LeavePolicyTab() {
  const { leavePolicy, updateLeavePolicy } = useSystem();
  const [policy, setPolicy] = useState(leavePolicy);
  const set = (k, v) => setPolicy(p => ({ ...p, [k]: v }));
  const setDefault = (k, v) => setPolicy(p => ({ ...p, defaults: { ...p.defaults, [k]: parseInt(v, 10) || 0 } }));

  return (
    <div className="card p-5 space-y-4 text-xs max-w-lg">
      <h3 className="section-heading">Annual Leave Policy</h3>
      <p className="text-gray-400">Set the leave year period and default days allocated to new employees.</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Year Start</label>
          <input type="date" className="input w-full" value={policy.yearStart} onChange={e => set('yearStart', e.target.value)} />
        </div>
        <div>
          <label className="label">Year End</label>
          <input type="date" className="input w-full" value={policy.yearEnd} onChange={e => set('yearEnd', e.target.value)} />
        </div>
      </div>
      {Object.entries(policy.defaults).map(([key, val]) => (
        <div key={key}>
          <label className="label capitalize">{key} Leave (days/year)</label>
          <input type="number" min={0} className="input w-32" value={val} onChange={e => setDefault(key, e.target.value)} />
        </div>
      ))}
      <button className="btn-primary" onClick={() => updateLeavePolicy(policy)}>Save Leave Policy</button>
    </div>
  );
}

const BALANCE_TYPES = ['annual', 'sick', 'emergency', 'maternity'];
const BALANCE_LABELS = { annual: 'Annual', sick: 'Sick', emergency: 'Emergency', maternity: 'Maternity' };
const BALANCE_COLORS = { annual: 'blue', sick: 'amber', emergency: 'red', maternity: 'purple' };

function LeaveBalancesTab() {
  const { employees, leaveBalances } = useSystem();

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 text-left">
              <th className="table-th pl-5">Employee</th>
              {BALANCE_TYPES.map(t => (
                <th key={t} className="table-th text-center" colSpan={3}>{BALANCE_LABELS[t]} Leave</th>
              ))}
            </tr>
            <tr className="bg-gray-50/50 dark:bg-gray-800/20 text-center">
              <th className="table-th border-t-0 pt-0 text-left pl-5 text-gray-300 dark:text-gray-600">—</th>
              {BALANCE_TYPES.flatMap(t => ['Allocated', 'Used', 'Remaining'].map(sub => (
                <th key={`${t}-${sub}`} className="table-th border-t-0 pt-0 text-[10px] text-gray-400 normal-case tracking-normal font-normal">{sub}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              const bal = leaveBalances.find(b => b.employeeId === emp.id);
              return (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 border-b border-gray-100 dark:border-gray-900 text-center">
                  <td className="table-td text-left pl-5">
                    <div className="flex items-center gap-2">
                      <Avatar name={emp.name} size="sm" />
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{emp.name}</p>
                        <p className="text-[10px] text-gray-400">{emp.department}</p>
                      </div>
                    </div>
                  </td>
                  {BALANCE_TYPES.map(type => {
                    const b = bal?.[type] || { allocated: 0, used: 0 };
                    const remaining = b.allocated - b.used;
                    return [
                      <td key={`${emp.id}-${type}-alloc`} className="table-td text-gray-600 dark:text-gray-400 font-medium">{b.allocated}d</td>,
                      <td key={`${emp.id}-${type}-used`} className="table-td max-w-28">
                        <div className="space-y-1">
                          <span className="text-gray-600 dark:text-gray-400">{b.used}d</span>
                          <ProgressBar value={b.used} max={b.allocated || 1} color={BALANCE_COLORS[type]} />
                        </div>
                      </td>,
                      <td key={`${emp.id}-${type}-rem`} className={`table-td font-bold ${remaining < 3 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                        {remaining}d
                      </td>,
                    ];
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeaveManagement() {
  const [tab, setTab] = useState('requests');
  const [applyOpen, setApplyOpen] = useState(false);
  const [sickOpen, setSickOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-150 dark:bg-gray-800/60 rounded-xl p-1">
          <button onClick={() => setTab('requests')} className={`tab-btn ${tab === 'requests' ? 'active' : ''}`}>Leave Requests</button>
          <button onClick={() => setTab('balances')} className={`tab-btn ${tab === 'balances' ? 'active' : ''}`}>Leave Balances</button>
          <button onClick={() => setTab('policy')} className={`tab-btn ${tab === 'policy' ? 'active' : ''}`}>Leave Policy</button>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setAdjustOpen(true)}>Adjust Balance</button>
          <button className="btn-secondary text-amber-600" onClick={() => setSickOpen(true)}>
            <Thermometer size={14} /> Log Sick Day
          </button>
          <button className="btn-primary" onClick={() => setApplyOpen(true)}>
            <Plus size={14} /> Apply Leave
          </button>
        </div>
      </div>

      {tab === 'requests' && <LeaveRequestsTab />}
      {tab === 'balances' && <LeaveBalancesTab />}
      {tab === 'policy' && <LeavePolicyTab />}

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} />
      <LogSickDayModal open={sickOpen} onClose={() => setSickOpen(false)} />
      <AdjustBalanceModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  );
}
