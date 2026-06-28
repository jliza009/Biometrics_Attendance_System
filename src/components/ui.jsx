// Shared UI primitives — White + Blue + Gold theme

// ── StatusBadge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    on_time:         { label: 'On Time',         cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    late:            { label: 'Late',             cls: 'bg-amber-100  text-amber-700  border border-amber-200' },
    absent:          { label: 'Absent',           cls: 'bg-red-100    text-red-700    border border-red-200' },
    early_departure: { label: 'Early Departure',  cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
    not_yet:         { label: 'Not Yet',          cls: 'bg-slate-100  text-slate-500  border border-slate-200' },
    clocked_in:      { label: 'Clocked In',       cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    clocked_out:     { label: 'Clocked Out',      cls: 'bg-primary-100 text-primary-700 border border-primary-200' },
    on_leave:        { label: 'On Leave',         cls: 'bg-purple-100 text-purple-700 border border-purple-200' },
    day_off:         { label: 'Day Off',          cls: 'bg-slate-100  text-slate-500  border border-slate-200' },
    pending:         { label: 'Pending',          cls: 'bg-gold-100   text-gold-700   border border-gold-200' },
    approved:        { label: 'Approved',         cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    rejected:        { label: 'Rejected',         cls: 'bg-red-100    text-red-700    border border-red-200' },
    active:          { label: 'Active',           cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    inactive:        { label: 'Inactive',         cls: 'bg-slate-100  text-slate-500  border border-slate-200' },
    Open:            { label: 'Open',             cls: 'bg-primary-100 text-primary-700 border border-primary-200' },
    Processing:      { label: 'Processing',       cls: 'bg-gold-100   text-gold-700   border border-gold-200' },
    Approved:        { label: 'Approved',         cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    Disbursed:       { label: 'Disbursed',        cls: 'bg-purple-100 text-purple-700 border border-purple-200' },
    Paid:            { label: 'Paid',             cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
    Pending:         { label: 'Pending',          cls: 'bg-gold-100   text-gold-700   border border-gold-200' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600 border border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ── RosterChip ───────────────────────────────────────────────────────────────
export function RosterChip({ type, shiftName }) {
  const map = {
    WORKING:        { label: shiftName || 'Work', cls: 'bg-primary-100 text-primary-700' },
    DAY_OFF:        { label: 'Off',               cls: 'bg-slate-100 text-slate-500' },
    ANNUAL:         { label: 'AL',                cls: 'bg-emerald-100 text-emerald-700' },
    SICK:           { label: 'Sick',              cls: 'bg-amber-100 text-amber-700' },
    EMERGENCY:      { label: 'Emg',               cls: 'bg-red-100 text-red-700' },
    MATERNITY:      { label: 'Mat',               cls: 'bg-purple-100 text-purple-700' },
    HALF_DAY:       { label: '½ Day',             cls: 'bg-teal-100 text-teal-700' },
    PUBLIC_HOLIDAY: { label: 'PH',                cls: 'bg-gold-100 text-gold-700' },
  };
  const { label, cls } = map[type] || { label: type, cls: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap leading-tight ${cls}`}>
      {label}
    </span>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-primary-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-teal-500',    'bg-emerald-500','bg-gold-500',   'bg-orange-500',
];
export function Avatar({ name, size = 'md' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colorIdx = name.charCodeAt(0) % AVATAR_COLORS.length;
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div className={`${sizes[size]} ${AVATAR_COLORS[colorIdx]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue:   'bg-primary-50 text-primary-600',
    green:  'bg-emerald-50 text-emerald-600',
    amber:  'bg-gold-50 text-gold-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow duration-200">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="mt-1 text-2xl font-bold text-primary-800">{value}</p>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-primary-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto border border-slate-200`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-primary-50 rounded-t-2xl">
          <h2 className="section-heading">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────
export function Drawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-primary-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl animate-slide-in-right border-l border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-primary-50 sticky top-0 z-10">
          <h2 className="section-heading">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = 'blue' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = {
    blue:   'bg-primary-500',
    green:  'bg-emerald-500',
    amber:  'bg-gold-500',
    red:    'bg-red-500',
    purple: 'bg-purple-500',
    teal:   'bg-teal-500',
  };
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colors[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ message = 'No data found', sub = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-500">{message}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── ShiftBadge ────────────────────────────────────────────────────────────────
export function ShiftBadge({ shift }) {
  const colors = {
    Morning:   'bg-primary-100 text-primary-700',
    Afternoon: 'bg-purple-100 text-purple-700',
    Night:     'bg-slate-100 text-slate-600',
    Flexi:     'bg-teal-100 text-teal-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[shift] || 'bg-slate-100 text-slate-600'}`}>
      {shift}
    </span>
  );
}
