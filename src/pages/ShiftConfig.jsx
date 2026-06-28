import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Clock, MapPin, Users, CalendarDays, CheckSquare } from 'lucide-react';
import { useSystem } from '../hooks/useSystem';
import { Modal } from '../components/ui';

// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const ALL_DAYS = [
  { key: 1, label: 'Mon', short: 'M' },
  { key: 2, label: 'Tue', short: 'T' },
  { key: 3, label: 'Wed', short: 'W' },
  { key: 4, label: 'Thu', short: 'T' },
  { key: 5, label: 'Fri', short: 'F' },
  { key: 6, label: 'Sat', short: 'S' },
  { key: 0, label: 'Sun', short: 'S' },
];

// Quick-select presets
const DAY_PRESETS = [
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekend',  days: [6, 0] },
  { label: 'All Week', days: [1, 2, 3, 4, 5, 6, 0] },
  { label: 'Mon–Sat',  days: [1, 2, 3, 4, 5, 6] },
];

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri

/** Render a compact day-dot preview */
function DayDots({ days = [] }) {
  const set = new Set(days);
  return (
    <div className="flex gap-0.5 items-center">
      {ALL_DAYS.map(d => (
        <span
          key={d.key}
          title={d.label}
          className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center
            ${set.has(d.key)
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-400'}`}
        >
          {d.short}
        </span>
      ))}
    </div>
  );
}

// ── Add / Edit Shift Modal ────────────────────────────────────────────────────
function ShiftModal({ open, onClose, shift, onSave, systemSettings }) {
  const defaultDays = shift?.workingDays || DEFAULT_WORKING_DAYS;

  const [form, setForm] = useState(() => shift || {
    name: '',
    start: '09:00',
    end: '17:00',
    grace: systemSettings?.gracePeriodMinutes || 10,
    location: 'Main Office',
    workingDays: defaultDays,
  });

  // Reset form when the shift prop changes (edit vs new)
  useEffect(() => {
    if (open) {
      setForm(shift || {
        name: '',
        start: '09:00',
        end: '17:00',
        grace: systemSettings?.gracePeriodMinutes || 10,
        location: 'Main Office',
        workingDays: DEFAULT_WORKING_DAYS,
      });
    }
  }, [open, shift]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (dayKey) => {
    setForm(f => {
      const days = f.workingDays || [];
      return {
        ...f,
        workingDays: days.includes(dayKey)
          ? days.filter(d => d !== dayKey)
          : [...days, dayKey],
      };
    });
  };

  const applyPreset = (days) => setForm(f => ({ ...f, workingDays: days }));

  const handleSave = () => {
    if (!form.name) return;
    onSave(form);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={shift ? 'Edit Shift' : 'Add New Shift'}>
      <div className="space-y-4 text-xs">
        {/* Name */}
        <div>
          <label className="label">Shift Name <span className="text-red-500">*</span></label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Morning, Weekend, Night" />
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start Time</label>
            <input type="time" className="input" value={form.start} onChange={e => set('start', e.target.value)} />
          </div>
          <div>
            <label className="label">End Time</label>
            <input type="time" className="input" value={form.end} onChange={e => set('end', e.target.value)} />
          </div>
        </div>

        {/* Grace + Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Grace Period (minutes)</label>
            <input type="number" min={0} max={60} className="input" value={form.grace} onChange={e => set('grace', e.target.value)} />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={form.location} onChange={e => set('location', e.target.value)} />
          </div>
        </div>

        {/* Working Days */}
        <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-4 space-y-3">
          <div>
            <span className="font-bold text-primary-800">Default Working Days</span>
            <p className="text-[10px] text-slate-500 mt-0.5">Which days do employees on this shift work?</p>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {DAY_PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.days)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors
                  ${JSON.stringify([...form.workingDays || []].sort()) === JSON.stringify([...p.days].sort())
                    ? 'bg-gold-500 border-gold-500 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Day toggles */}
          <div className="flex gap-2 flex-wrap">
            {ALL_DAYS.map(d => {
              const active = (form.workingDays || []).includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className={`flex flex-col items-center w-12 py-2 rounded-xl border-2 text-[10px] font-bold transition-all
                    ${active
                      ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-primary-300'}`}
                >
                  <span className="text-[11px]">{d.label}</span>
                  <span className={`mt-1 w-3 h-3 rounded-full border ${active ? 'bg-white border-white' : 'border-slate-300'}`} />
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <p className="text-[10px] text-slate-500">
            Selected: <span className="font-semibold text-primary-700">
              {(form.workingDays || []).length === 0
                ? 'None'
                : ALL_DAYS.filter(d => (form.workingDays || []).includes(d.key)).map(d => d.label).join(', ')}
            </span>
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!form.name}>
            {shift ? 'Update' : 'Create'} Shift
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Public Holiday Modal ───────────────────────────────────────────────────
function HolidayModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', date: '', recurring: false });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) setForm({ name: '', date: '', recurring: false });
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Add Public Holiday">
      <div className="space-y-4 text-xs">
        <div>
          <label className="label">Holiday Name <span className="text-red-500">*</span></label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Christmas Day" />
        </div>
        <div>
          <label className="label">Date <span className="text-red-500">*</span></label>
          <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <input
            type="checkbox"
            id="recurring-check"
            checked={form.recurring}
            onChange={e => set('recurring', e.target.checked)}
            className="w-4 h-4 accent-primary-600"
          />
          <label htmlFor="recurring-check" className="font-medium text-slate-700 cursor-pointer">
            Recurring annually <span className="text-slate-400 font-normal">(repeats every year on same date)</span>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => { if (form.name && form.date) { onSave(form); onClose(); } }}
          >
            Add Holiday
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Assign Shift Modal ────────────────────────────────────────────────────────
// KEY FIX: use key={employee?.id} on this modal to force remount on employee change,
// which resets all internal state. Also uses useEffect to sync when shift changes.
function AssignmentModal({ open, onClose, employee, shifts, assignment, onSave }) {
  // Build a schedule from a shift's workingDays — only those days get a shift assigned
  const buildScheduleFromShift = (shift) => {
    if (!shift) return {};
    const schedule = {};
    const days = shift.workingDays || DEFAULT_WORKING_DAYS;
    days.forEach(d => { schedule[d] = shift.id; });
    return schedule;
  };

  const firstShift = shifts[0];
  const initialShiftName = assignment?.shiftName || employee?.shift || firstShift?.name || '';
  const initialShift = shifts.find(s => s.name === initialShiftName) || firstShift;
  const initialSchedule = assignment?.schedule || buildScheduleFromShift(initialShift);

  const [shiftName, setShiftName] = useState(initialShiftName);
  const [schedule, setSchedule] = useState(initialSchedule);

  // ── Critical fix: reset state every time a new employee is loaded ──
  useEffect(() => {
    if (open && employee) {
      const newShiftName = assignment?.shiftName || employee.shift || firstShift?.name || '';
      const newShift = shifts.find(s => s.name === newShiftName) || firstShift;
      const newSchedule = assignment?.schedule || buildScheduleFromShift(newShift);
      setShiftName(newShiftName);
      setSchedule(newSchedule);
    }
  }, [open, employee?.id]); // re-run when EMPLOYEE changes

  const handleShiftChange = (name) => {
    setShiftName(name);
    const shift = shifts.find(s => s.name === name);
    if (shift) setSchedule(buildScheduleFromShift(shift));
  };

  const toggleDay = (dayKey) => {
    setSchedule(prev => {
      const current = { ...prev };
      const shift = shifts.find(s => s.name === shiftName);
      if (current[dayKey]) {
        delete current[dayKey];
      } else {
        current[dayKey] = shift?.id || shifts[0]?.id;
      }
      return current;
    });
  };

  const handleSave = () => {
    const shift = shifts.find(s => s.name === shiftName);
    onSave(employee.id, { shiftName, shiftId: shift?.id, schedule });
    onClose();
  };

  if (!employee) return null;

  const activeShift = shifts.find(s => s.name === shiftName);
  const workingDayCount = Object.values(schedule).filter(Boolean).length;

  return (
    <Modal open={open} onClose={onClose} title={`Assign Shift — ${employee.name}`} width="max-w-lg">
      <div className="space-y-4 text-xs">

        {/* Employee info */}
        <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl border border-primary-100">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-primary-800">{employee.name}</p>
            <p className="text-[10px] text-slate-500">{employee.role} · {employee.department}</p>
          </div>
        </div>

        {/* Primary Shift selector */}
        <div>
          <label className="label">Primary Shift</label>
          <select
            className="input w-full"
            value={shiftName}
            onChange={e => handleShiftChange(e.target.value)}
          >
            {shifts.map(s => (
              <option key={s.id} value={s.name}>
                {s.name} ({s.start}–{s.end})
              </option>
            ))}
          </select>
          {activeShift?.workingDays && (
            <p className="text-[10px] text-slate-500 mt-1">
              This shift's default days: <span className="font-semibold text-primary-700">
                {ALL_DAYS.filter(d => activeShift.workingDays.includes(d.key)).map(d => d.label).join(', ')}
              </span>
            </p>
          )}
        </div>

        {/* Per-day override */}
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-primary-800">Weekly Schedule Override</span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Toggle individual days. Checked days = this employee works that day.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
              {workingDayCount} day{workingDayCount !== 1 ? 's' : ''}/week
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {ALL_DAYS.map(d => {
              const active = !!schedule[d.key];
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(d.key)}
                  className={`flex flex-col items-center w-12 py-2.5 rounded-xl border-2 text-[10px] font-bold transition-all
                    ${active
                      ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-primary-300 hover:text-primary-600'}`}
                >
                  <span>{d.label}</span>
                  <CheckSquare size={10} className={`mt-1 ${active ? 'text-white' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-[10px] text-slate-400 self-center mr-1">Quick:</span>
            {DAY_PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  const shift = shifts.find(s => s.name === shiftName);
                  const newSchedule = {};
                  p.days.forEach(d => { newSchedule[d] = shift?.id || shifts[0]?.id; });
                  setSchedule(newSchedule);
                }}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-gold-400 hover:text-gold-600 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Holiday note */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <CalendarDays size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700">
            Public holidays are handled separately (Shift Config → Public Holidays tab).
            Days marked as public holidays will show as <strong>Public Holiday</strong> in the roster regardless of schedule.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Assignment</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main ShiftConfig Page ─────────────────────────────────────────────────────
export default function ShiftConfig() {
  const {
    shifts, publicHolidays, employees, shiftAssignments, systemSettings,
    addShift, updateShift, deleteShift, addPublicHoliday, deletePublicHoliday, assignEmployeeShift,
  } = useSystem();

  const [shiftModal, setShiftModal] = useState({ open: false, shift: null });
  const [holidayModal, setHolidayModal] = useState(false);
  const [assignModal, setAssignModal] = useState({ open: false, employee: null });
  const [tab, setTab] = useState('shifts');

  const handleSaveShift = (form) => {
    if (shiftModal.shift) {
      updateShift(shiftModal.shift.id, form);
    } else {
      addShift(form);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="page-title">Shift Configuration</h2>
        <p className="text-xs text-slate-400 mt-0.5">Define shifts, assign employees, and manage public holidays.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[['shifts', 'Shifts'], ['assignments', 'Employee Assignments'], ['holidays', 'Public Holidays']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`tab-btn ${tab === id ? 'active' : ''}`}>{label}</button>
        ))}
      </div>

      {/* ── Shifts Tab ── */}
      {tab === 'shifts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">Defined Shifts</h2>
            <button className="btn-primary" onClick={() => setShiftModal({ open: true, shift: null })}>
              <Plus size={14} /> Add Shift
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {['Shift', 'Hours', 'Grace', 'Working Days', 'Location', 'Actions'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map(shift => (
                  <tr key={shift.id} className="hover:bg-slate-50">
                    <td className="table-td font-bold text-primary-800">{shift.name}</td>
                    <td className="table-td font-mono text-slate-600">{shift.start} – {shift.end}</td>
                    <td className="table-td text-slate-500">{shift.grace} min</td>
                    <td className="table-td">
                      <DayDots days={shift.workingDays || DEFAULT_WORKING_DAYS} />
                    </td>
                    <td className="table-td text-slate-500">{shift.location}</td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button
                          className="btn-ghost py-1 px-2"
                          onClick={() => setShiftModal({ open: true, shift })}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="btn-danger py-1 px-2"
                          onClick={() => deleteShift(shift.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shifts.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No shifts defined yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Assignments Tab ── */}
      {tab === 'assignments' && (
        <div className="space-y-3">
          <div>
            <h2 className="section-heading">Assign Employees to Shifts</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Each employee can have their own weekly schedule — including weekends and public holidays.
              Working days are set per shift but can be overridden individually.
            </p>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {['Employee', 'Assigned Shift', 'Working Days', 'Actions'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.filter(e => e.status === 'active').map(emp => {
                  const a = shiftAssignments[emp.id];
                  const activeDays = a?.schedule ? Object.keys(a.schedule).filter(k => a.schedule[k]).map(Number) : null;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="table-td">
                        <div>
                          <p className="font-bold text-primary-800">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{emp.department}</p>
                        </div>
                      </td>
                      <td className="table-td">
                        {a?.shiftName
                          ? <span className="font-semibold text-primary-700">{a.shiftName}</span>
                          : <span className="text-slate-400 italic">{emp.shift || 'Not assigned'}</span>
                        }
                      </td>
                      <td className="table-td">
                        {activeDays
                          ? <DayDots days={activeDays} />
                          : <span className="text-slate-400 text-[10px]">Default schedule</span>
                        }
                      </td>
                      <td className="table-td">
                        <button
                          className="btn-secondary py-1 px-2"
                          onClick={() => setAssignModal({ open: true, employee: emp })}
                        >
                          <Users size={12} /> Assign
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {employees.filter(e => e.status === 'active').length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">Add employees first to assign shifts.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Holidays Tab ── */}
      {tab === 'holidays' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">Public Holidays</h2>
            <button className="btn-primary" onClick={() => setHolidayModal(true)}>
              <Plus size={14} /> Add Holiday
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {['Holiday', 'Date', 'Recurring', 'Actions'].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {publicHolidays.map(hol => (
                  <tr key={hol.id} className="hover:bg-slate-50">
                    <td className="table-td font-semibold text-primary-800">{hol.name}</td>
                    <td className="table-td font-mono text-slate-600">{hol.date}</td>
                    <td className="table-td">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${hol.recurring ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {hol.recurring ? 'Annual' : 'One-time'}
                      </span>
                    </td>
                    <td className="table-td">
                      <button className="btn-danger py-1 px-2" onClick={() => deletePublicHoliday(hol.id)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {publicHolidays.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">No public holidays configured.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ShiftModal
        open={shiftModal.open}
        shift={shiftModal.shift}
        systemSettings={systemSettings}
        onSave={handleSaveShift}
        onClose={() => setShiftModal({ open: false, shift: null })}
      />
      <HolidayModal
        open={holidayModal}
        onClose={() => setHolidayModal(false)}
        onSave={addPublicHoliday}
      />

      {/* KEY: force remount when employee changes → fresh state, no stale data */}
      {assignModal.open && (
        <AssignmentModal
          key={assignModal.employee?.id}
          open={assignModal.open}
          employee={assignModal.employee}
          shifts={shifts}
          assignment={assignModal.employee ? shiftAssignments[assignModal.employee.id] : null}
          onSave={assignEmployeeShift}
          onClose={() => setAssignModal({ open: false, employee: null })}
        />
      )}
    </div>
  );
}
