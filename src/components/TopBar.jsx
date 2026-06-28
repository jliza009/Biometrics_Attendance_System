import { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, Clock, FileText, User, X, Shield } from 'lucide-react';
import { useSystem } from '../hooks/useSystem';
import { Avatar } from './ui';

const PAGE_TITLES = {
  dashboard:  'Admin Dashboard',
  employees:  'Employee Directory',
  roster:     'Monthly Roster Manager',
  leave:      'Leave Requests',
  clocklog:   'Clock-In / Out Log',
  report:     'Attendance Report',
  shifts:     'Shift Configuration',
  settings:   'Settings & Notifications',
};

export default function TopBar({ current }) {
  const { currentUser, logout, notifications, clearNotifications, deleteNotification } = useSystem();
  const [showNotif, setShowNotif] = useState(false);
  const dropdownRef = useRef(null);

  const adminNotifs = notifications.filter(n => n.userId === 'admin');
  const unreadCount = adminNotifs.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotif = () => {
    setShowNotif(prev => !prev);
    if (!showNotif) clearNotifications('admin');
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-slate-200 bg-white flex-shrink-0 sticky top-0 z-30 shadow-sm">
      {/* Page title */}
      <div className="flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-gold-400 flex-shrink-0" />
        <h1 className="text-sm font-bold text-primary-800">
          {PAGE_TITLES[current]}
        </h1>
      </div>

      <div className="flex items-center gap-1 relative">

        {/* Notifications */}
        <div ref={dropdownRef} className="relative">
          <button
            id="notifications-btn"
            onClick={handleToggleNotif}
            className="btn-ghost p-2 rounded-lg text-slate-500 hover:text-primary-700 relative"
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs animate-slide-up">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-primary-50">
                <span className="font-bold text-primary-800">System Activity</span>
                <span className="text-[10px] text-slate-400">{adminNotifs.length} items</span>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {adminNotifs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">No notifications yet.</div>
                ) : (
                  adminNotifs.map(n => (
                    <div key={n.id} className="p-3 flex gap-2.5 hover:bg-primary-50/50 transition-colors relative group">
                      <div className={`p-1.5 rounded-lg h-7 w-7 flex items-center justify-center flex-shrink-0 ${
                        n.type === 'leave'    ? 'bg-blue-100 text-primary-600' :
                        n.type === 'clock'   ? 'bg-gold-100 text-gold-600' :
                        'bg-purple-50 text-purple-500'
                      }`}>
                        {n.type === 'leave'  ? <FileText size={12} /> :
                         n.type === 'clock'  ? <Clock size={12} />    : <User size={12} />}
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-medium text-slate-700 leading-normal">{n.message}</p>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{n.time}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                        className="absolute right-2 top-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Shield size={14} className="text-gold-300" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-primary-800 leading-none">{currentUser?.name || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{currentUser?.role || 'HR Admin'}</p>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="ml-1 p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
