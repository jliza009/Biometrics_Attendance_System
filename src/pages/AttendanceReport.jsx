import { useState, useMemo } from 'react';
import { Download, Users, UserCheck, UserX, Clock, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { StatCard, Avatar } from '../components/ui';
import { useSystem } from '../hooks/useSystem';

export default function AttendanceReport() {
  const { employees, clockLogs, departments } = useSystem();
  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = today.toISOString().split('T')[0];

  const [empFilter, setEmpFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(monthEnd);

  const detailRows = useMemo(() => employees
    .filter(e => deptFilter === 'All' || e.department === deptFilter)
    .filter(e => empFilter === 'All' || String(e.id) === empFilter)
    .map(e => {
      const logs = clockLogs.filter(log => log.employeeId === e.id && log.date >= fromDate && log.date <= toDate);
      const present = logs.filter(l => l.actualIn).length;
      const late = logs.filter(l => l.status === 'late').length;
      const absent = logs.filter(l => l.status === 'absent').length;
      const daysInRange = Math.max(1, Math.ceil((new Date(toDate) - new Date(fromDate)) / 86400000) + 1);
      const workingDays = Math.min(22, daysInRange);
      const rate = Math.min(100, Math.round((present / workingDays) * 100));
      return { ...e, present, absent, late, rate: `${rate}%` };
    }), [employees, clockLogs, deptFilter, empFilter, fromDate, toDate]);

  const dailyChart = useMemo(() => {
    const data = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const activeCount = employees.filter(e => e.status === 'active').length || 1;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const present = employees.filter(emp =>
        clockLogs.some(l => l.employeeId === emp.id && l.date === dateStr && l.actualIn)
      ).length;
      data.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: Math.round((present / activeCount) * 100),
      });
    }
    return data;
  }, [fromDate, toDate, employees, clockLogs]);

  const totalEmployees = detailRows.length;
  const avgPresent = totalEmployees > 0 ? (detailRows.reduce((s, r) => s + r.present, 0) / totalEmployees).toFixed(1) : '0';
  const avgAbsent = totalEmployees > 0 ? (detailRows.reduce((s, r) => s + r.absent, 0) / totalEmployees).toFixed(1) : '0';
  const avgLate = totalEmployees > 0 ? (detailRows.reduce((s, r) => s + r.late, 0) / totalEmployees).toFixed(1) : '0';
  const avgRate = totalEmployees > 0 ? (detailRows.reduce((s, r) => s + parseFloat(r.rate), 0) / totalEmployees).toFixed(1) : '0';

  const handleExportCSV = () => {
    const headers = 'Employee Name,Role,Department,Shift,Present,Absent,Late,Rate';
    const rows = detailRows.map(r =>
      `"${r.name}","${r.role}","${r.department}","${r.shift}",${r.present},${r.absent},${r.late},"${r.rate}"`
    ).join('\n');
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + '\n' + rows);
    link.download = `Attendance_Report_${fromDate}_${toDate}.csv`;
    link.click();
  };

  return (
    <div className="space-y-5 animate-fade-in text-xs">
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label text-[10px]">Employee</label>
            <select className="input w-52 py-1.5" value={empFilter} onChange={e => setEmpFilter(e.target.value)}>
              <option value="All">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-[10px]">Department</label>
            <select className="input w-44 py-1.5" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="All">All Departments</option>
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-[10px]">From</label>
            <input type="date" className="input w-40 py-1" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="label text-[10px]">To</label>
            <input type="date" className="input w-40 py-1" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <button onClick={handleExportCSV} className="btn-secondary py-1.5 ml-auto"><Download size={13} /> Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard title="Employees" value={totalEmployees} icon={Users} color="blue" />
        <StatCard title="Avg Present" value={avgPresent} icon={UserCheck} color="green" />
        <StatCard title="Avg Absent" value={avgAbsent} icon={UserX} color="red" />
        <StatCard title="Avg Late" value={avgLate} icon={Clock} color="amber" />
        <StatCard title="Avg Attendance" value={`${avgRate}%`} icon={TrendingUp} color="purple" />
      </div>

      <div className="card p-5">
        <h2 className="section-heading mb-4">Daily Attendance Rate</h2>
        {dailyChart.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No data for selected range.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(dailyChart.length / 10))} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => [`${v}%`, 'Rate']} />
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="4 3" />
              <Line type="monotone" dataKey="rate" stroke="#1E4D8C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b"><h2 className="section-heading">Employee Summary</h2></div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 text-left">
              <th className="table-th pl-5">Employee</th>
              <th className="table-th">Department</th>
              <th className="table-th text-center">Present</th>
              <th className="table-th text-center">Absent</th>
              <th className="table-th text-center">Late</th>
              <th className="table-th">Rate</th>
            </tr>
          </thead>
          <tbody>
            {detailRows.map(row => (
              <tr key={row.id} className="border-b border-gray-100 dark:border-gray-900">
                <td className="table-td pl-5"><Avatar name={row.name} size="sm" /> {row.name}</td>
                <td className="table-td">{row.department}</td>
                <td className="table-td text-center text-green-600">{row.present}</td>
                <td className="table-td text-center text-red-500">{row.absent}</td>
                <td className="table-td text-center text-amber-600">{row.late}</td>
                <td className="table-td font-semibold">{row.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
