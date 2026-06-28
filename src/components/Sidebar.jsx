import { useState } from 'react';
import {
  LayoutDashboard, Users, CalendarDays, FileText, Clock,
  BarChart3, Settings, ChevronLeft, ChevronRight,
  Fingerprint, AlarmClock, Shield
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'employees',   label: 'Employee Directory',  icon: Users },
  { id: 'roster',      label: 'Monthly Roster',      icon: CalendarDays },
  { id: 'leave',       label: 'Leave Management',    icon: FileText },
  { id: 'clocklog',    label: 'Clock-In / Out Log',  icon: Clock },
  { id: 'report',      label: 'Attendance Report',   icon: BarChart3 },
  { id: 'shifts',      label: 'Shift Config',        icon: AlarmClock },
  { id: 'settings',    label: 'Settings',            icon: Settings },
];

export default function Sidebar({ current, onChange }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        flex-shrink-0 h-screen sticky top-0 flex flex-col
        bg-white border-r border-slate-200
        transition-all duration-200 shadow-sm
        ${collapsed ? 'w-16' : 'w-62'}
      `}
      style={{ width: collapsed ? 64 : 248 }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-slate-100 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-600/30">
          <Shield size={18} className="text-gold-300" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-800 leading-tight">HR Portal</p>
            <p className="text-[10px] text-slate-400 leading-tight">Attendance & Roster</p>
          </div>
        )}
      </div>

      {/* Nav label */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Navigation</span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => onChange(id)}
            className={`sidebar-link w-full ${current === id ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={17} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Gold accent bar + collapse */}
      <div className="border-t border-slate-100 px-2 py-3">
        {!collapsed && (
          <div className="mb-2 mx-1 h-0.5 rounded-full bg-gradient-to-r from-gold-400 to-gold-200 opacity-60" />
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`sidebar-link w-full text-slate-400 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span className="text-xs">Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}
