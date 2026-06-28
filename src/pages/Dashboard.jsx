import { Users, UserCheck, UserX, Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { StatCard, StatusBadge, Avatar } from '../components/ui';
import { useSystem } from '../hooks/useSystem';

const DEPT_COLORS = {
  Engineering: '#1E4D8C', HR: '#7c3aed', Finance: '#059669',
  Operations: '#d97706', Marketing: '#db2777', Sales: '#0891b2',
};

export default function Dashboard() {
  const { employees, leaveRequests, clockFeed, clockLogs, updateLeaveStatus, departments, getEmployeeStatus } = useSystem();
  const today = new Date().toISOString().split('T')[0];

  const pendingLeaves = leaveRequests.filter(r => r.status === 'pending');
  const activeEmployees = employees.filter(e => e.status === 'active');

  const todayLogs = clockLogs.filter(l => l.date === today);
  const presentCount = activeEmployees.filter(emp => {
    const status = getEmployeeStatus(emp.id);
    return status && ['clocked_in', 'clocked_out', 'late', 'early_departure', 'on_time'].includes(status.status);
  }).length;

  const onLeaveCount = activeEmployees.filter(emp => {
    const s = getEmployeeStatus(emp.id);
    return s?.status === 'on_leave';
  }).length;

  const absentCount = activeEmployees.filter(emp => {
    const s = getEmployeeStatus(emp.id);
    return s?.status === 'absent';
  }).length;

  const lateCount = todayLogs.filter(log => log.status === 'late').length;
  const attendanceRate = activeEmployees.length > 0 ? Math.round((presentCount / activeEmployees.length) * 100) : 0;

  const weeklyData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => {
    const row = { day };
    departments.forEach(dept => {
      const deptEmps = activeEmployees.filter(e => e.department === dept);
      if (deptEmps.length === 0) {
        row[dept] = 0;
        return;
      }
      const d = new Date();
      const dayOffset = d.getDay() === 0 ? i - 6 : i - (d.getDay() - 1);
      const target = new Date(d);
      target.setDate(d.getDate() + dayOffset);
      const dateStr = target.toISOString().split('T')[0];
      const present = deptEmps.filter(emp =>
        clockLogs.some(l => l.employeeId === emp.id && l.date === dateStr && l.actualIn)
      ).length;
      row[dept] = Math.round((present / deptEmps.length) * 100);
    });
    return row;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={activeEmployees.length} subtitle="Active staff" icon={Users} color="blue" />
        <StatCard title="Present Today" value={presentCount} subtitle={`${attendanceRate}% attendance`} icon={UserCheck} color="green" />
        <StatCard title="On Leave / Off" value={onLeaveCount} subtitle={`${absentCount} absent without leave`} icon={UserX} color="amber" />
        <StatCard title="Late Arrivals" value={lateCount} subtitle="Today" icon={Clock} color="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 card p-5">
          <h2 className="section-heading mb-4">Attendance Rate by Department — This Week</h2>
          {activeEmployees.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs">Add employees to see attendance charts.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9ca3af' }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {departments.filter(d => activeEmployees.some(e => e.department === d)).map(dept => (
                  <Bar key={dept} dataKey={dept} fill={DEPT_COLORS[dept] || '#6b7280'} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5 flex flex-col">
          <h2 className="section-heading mb-3">Today's Clock Feed</h2>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[260px]">
            {clockFeed.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">No activity yet today.</div>
            ) : (
              clockFeed.slice(0, 15).map(entry => (
                <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800">
                  <Avatar name={entry.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.name}</p>
                    <p className="text-xs text-gray-400">Clocked {entry.type === 'in' ? 'In' : 'Out'} · {entry.time}</p>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="section-heading">Employee Status Today</h2>
        </div>
        {activeEmployees.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No employees yet. Add staff from the Employee Directory.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                  <th className="table-th pl-5">Employee</th>
                  <th className="table-th">Department</th>
                  <th className="table-th">Shift</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Detail</th>
                </tr>
              </thead>
              <tbody>
                {activeEmployees.map(emp => {
                  const s = getEmployeeStatus(emp.id) || { status: 'not_yet', label: '—', detail: '' };
                  return (
                    <tr key={emp.id} className="border-b border-gray-100 dark:border-gray-900">
                      <td className="table-td pl-5">
                        <div className="flex items-center gap-2">
                          <Avatar name={emp.name} size="sm" />
                          <span className="font-medium">{emp.name}</span>
                        </div>
                      </td>
                      <td className="table-td text-gray-500">{emp.department}</td>
                      <td className="table-td">{emp.shift}</td>
                      <td className="table-td"><StatusBadge status={s.status} /></td>
                      <td className="table-td text-gray-400">{s.detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="section-heading">Pending Leave Requests</h2>
          <span className="text-xs text-gray-400">{pendingLeaves.length} awaiting approval</span>
        </div>
        {pendingLeaves.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No pending requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                  <th className="table-th pl-5">Employee</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Dates</th>
                  <th className="table-th">Days</th>
                  <th className="table-th text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map(req => (
                  <tr key={req.id} className="border-b border-gray-100 dark:border-gray-900">
                    <td className="table-td pl-5 font-medium">{req.employeeName}</td>
                    <td className="table-td">{req.type}</td>
                    <td className="table-td">{req.from} → {req.to}</td>
                    <td className="table-td">{req.days}d</td>
                    <td className="table-td">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => updateLeaveStatus(req.id, 'approved')} className="btn-success py-1 text-[11px]">
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button onClick={() => updateLeaveStatus(req.id, 'rejected')} className="btn-danger py-1 text-[11px]">
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
