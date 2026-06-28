import { useState } from 'react';
import { useSystem } from '../hooks/useSystem';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Login from '../pages/Login';
import EmployeePortal from '../pages/EmployeePortal';
import Dashboard from '../pages/Dashboard';
import Employees from '../pages/Employees';
import Roster from '../pages/Roster';
import LeaveManagement from '../pages/LeaveManagement';
import ClockLog from '../pages/ClockLog';
import AttendanceReport from '../pages/AttendanceReport';
import ShiftConfig from '../pages/ShiftConfig';
import Settings from '../pages/Settings';

const PAGES = {
  dashboard:  Dashboard,
  employees:  Employees,
  roster:     Roster,
  leave:      LeaveManagement,
  clocklog:   ClockLog,
  report:     AttendanceReport,
  shifts:     ShiftConfig,
  settings:   Settings,
};

export default function Layout() {
  // All hooks must be called unconditionally at the top
  const { role, loading, apiError } = useSystem();
  const [current, setCurrent] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gold-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-primary-700 font-semibold">Loading HR System…</p>
        </div>
      </div>
    );
  }

  if (apiError && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gold-50 p-6">
        <div className="card p-6 max-w-md text-center space-y-3">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-primary-700">Database Connection Required</h2>
          <p className="text-sm text-slate-500">{apiError}</p>
          <p className="text-xs text-slate-400">
            Import <code className="text-primary-600">backend/database/schema.sql</code> into phpMyAdmin,
            configure <code className="text-primary-600">backend/.env</code>, and start the PHP API on port 8080.
          </p>
        </div>
      </div>
    );
  }

  if (!role) return <Login />;
  if (role === 'employee') return <EmployeePortal />;

  const Page = PAGES[current] || Dashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar current={current} onChange={setCurrent} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar current={current} />
        <main className="flex-1 overflow-y-auto p-6">
          <Page />
        </main>
      </div>
    </div>
  );
}
