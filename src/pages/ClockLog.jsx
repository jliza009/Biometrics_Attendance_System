import { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin, Bell } from 'lucide-react';
import { useSystem } from '../hooks/useSystem';
import { StatusBadge, Avatar } from '../components/ui';

const STATUS_ROW_COLOR = {
  on_time:         'hover:bg-green-50/50 dark:hover:bg-green-900/10',
  late:            'hover:bg-amber-50/50 dark:hover:bg-amber-900/10',
  absent:          'bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20',
  early_departure: 'hover:bg-orange-50/50 dark:hover:bg-orange-900/10',
  not_yet:         'hover:bg-gray-50 dark:hover:bg-gray-800/30',
};

export default function ClockLog() {
  const { clockLogs } = useSystem();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expanded, setExpanded] = useState(null);

  const toggleRow = (id) => setExpanded(e => e === id ? null : id);

  // Filter logs for selected date (for demo, logs with no date are assumed to be 2026-06-05)
  const logsForDate = clockLogs.filter(log => log.date === date);

  const presentCount = logsForDate.filter(l => l.actualIn).length;
  const absentCount = logsForDate.filter(l => l.status === 'absent').length;
  const lateCount = logsForDate.filter(l => l.status === 'late').length;
  
  const presentLogs = logsForDate.filter(l => l.totalHours > 0);
  const avgHoursVal = presentLogs.length > 0
    ? (presentLogs.reduce((sum, l) => sum + l.totalHours, 0) / presentLogs.length).toFixed(1)
    : '0.0';

  const summary = [
    { label: 'Present', value: presentCount, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Absent', value: absentCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Late', value: lateCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Avg Hours', value: `${avgHoursVal}h`, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="space-y-5 animate-fade-in text-xs">
      {/* Date picker */}
      <div className="flex items-center gap-4">
        <div>
          <label className="label text-[10px]">Select Date</label>
          <input
            id="log-date-picker"
            type="date"
            className="input w-48 py-1.5"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Showing logs for <strong className="text-gray-700 dark:text-gray-300">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map(({ label, value, color, bg }) => (
          <div key={label} className={`card px-4 py-2.5 flex items-center gap-3 ${bg}`}>
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                <th className="table-th w-8"></th>
                <th className="table-th">Employee Name</th>
                <th className="table-th">Department</th>
                <th className="table-th">Shift</th>
                <th className="table-th">Expected In</th>
                <th className="table-th">Actual In</th>
                <th className="table-th">Expected Out</th>
                <th className="table-th">Actual Out</th>
                <th className="table-th">Hours</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {logsForDate.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-gray-400">
                    No biometric clock-in/out recorded for this date.
                  </td>
                </tr>
              ) : (
                logsForDate.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 dark:border-gray-900">
                    <td colSpan={10} className="p-0">
                      <table className="w-full border-collapse">
                        <tbody>
                          <tr
                            className={`cursor-pointer transition-colors text-left ${STATUS_ROW_COLOR[log.status] || ''}`}
                            onClick={() => toggleRow(log.id)}
                          >
                            <td className="table-td w-8 text-center">
                              {expanded === log.id
                                ? <ChevronDown size={12} className="text-gray-400" />
                                : <ChevronRight size={12} className="text-gray-400" />}
                            </td>
                            <td className="table-td w-52 font-semibold text-gray-800 dark:text-gray-200">
                              <div className="flex items-center gap-2">
                                <Avatar name={log.employeeName} size="sm" />
                                <span>{log.employeeName}</span>
                              </div>
                            </td>
                            <td className="table-td text-gray-500">{log.department}</td>
                            <td className="table-td">
                              <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">{log.shift}</span>
                            </td>
                            <td className="table-td font-mono text-[11px] text-gray-650 dark:text-gray-400">{log.expectedIn}</td>
                            <td className="table-td font-mono text-[11px] font-bold text-gray-800 dark:text-gray-200">{log.actualIn ?? '—'}</td>
                            <td className="table-td font-mono text-[11px] text-gray-650 dark:text-gray-400">{log.expectedOut}</td>
                            <td className="table-td font-mono text-[11px] font-bold text-gray-800 dark:text-gray-200">{log.actualOut ?? '—'}</td>
                            <td className="table-td font-medium text-gray-700 dark:text-gray-300">
                              {log.totalHours > 0 ? `${log.totalHours}h` : '—'}
                            </td>
                            <td className="table-td"><StatusBadge status={log.status} /></td>
                          </tr>
                          {expanded === log.id && (
                            <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                              <td colSpan={10} className="px-8 py-3">
                                <div className="flex flex-wrap gap-6 text-[11px] font-semibold">
                                  {log.location && (
                                    <div className="flex items-center gap-2 text-gray-650 dark:text-gray-400">
                                      <MapPin size={13} className="text-gray-400" />
                                      <span>Device location: <span className="text-gray-800 dark:text-gray-200">{log.location}</span></span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-gray-650 dark:text-gray-400">
                                    <Bell size={13} className="text-gray-400" />
                                    {log.status === 'late'
                                      ? <span>Biometric Alert: Email sent at {log.actualIn} to employee inbox</span>
                                      : log.status === 'absent'
                                      ? <span>No check-in: Logged as absent. Notification dispatched to employee inbox</span>
                                      : <span>Attendance Status verified. No notification dispatch required</span>
                                    }
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
