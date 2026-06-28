import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Send, Upload, X, CheckCircle } from 'lucide-react';
import { useSystem } from '../hooks/useSystem';
import { RosterChip, Avatar, Modal } from '../components/ui';

const DAY_TYPES = ['WORKING', 'DAY_OFF', 'ANNUAL', 'SICK', 'EMERGENCY', 'MATERNITY', 'HALF_DAY', 'PUBLIC_HOLIDAY'];

const LEGEND = [
  { type: 'WORKING', label: 'Working' },
  { type: 'DAY_OFF', label: 'Day Off' },
  { type: 'ANNUAL', label: 'Annual Leave' },
  { type: 'SICK', label: 'Sick' },
  { type: 'EMERGENCY', label: 'Emergency' },
  { type: 'MATERNITY', label: 'Maternity' },
  { type: 'HALF_DAY', label: 'Half Day' },
  { type: 'PUBLIC_HOLIDAY', label: 'Public Holiday' },
];

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getMonthName(month) {
  return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
}

function getDayOfWeek(year, month, day) {
  const d = new Date(year, month - 1, day).getDay();
  return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d];
}

function isWeekend(year, month, day) {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 || d === 6;
}

function getPublicHoliday(holidays, year, month, day) {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return holidays.find(h => h.date === dateStr || (h.recurring && h.date.slice(5) === dateStr.slice(5)));
}

function Popover({ cell, onClose, onSave }) {
  const [selected, setSelected] = useState(cell.type);
  if (!cell) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 w-64 z-10 animate-slide-up"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {cell.empName} · Day {cell.day}
          </p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {DAY_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setSelected(t)}
              className={`text-left px-2 py-1.5 rounded-lg border text-xs transition-colors ${
                selected === t
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <RosterChip type={t} />
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center text-xs py-1.5">Cancel</button>
          <button
            onClick={() => { onSave(cell.empId, cell.day, selected); onClose(); }}
            className="btn-primary flex-1 justify-center text-xs py-1.5"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Roster() {
  const { employees, roster, updateRosterCell, importRoster, publicHolidays, departments, shiftAssignments } = useSystem();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [deptFilter, setDeptFilter] = useState('All');
  const [popover, setPopover] = useState(null);
  
  // Roster Import State
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const visibleEmps = deptFilter === 'All' ? employees : employees.filter(e => e.department === deptFilter);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const monthKey = `${year}-${month}`;
  const monthRoster = roster[monthKey] || {};

  function getDefaultType(empId, day) {
    const dow = new Date(year, month - 1, day).getDay();
    const assignment = shiftAssignments[empId];
    if (assignment && assignment.schedule) {
      return assignment.schedule[dow] ? 'WORKING' : 'DAY_OFF';
    }
    // fallback if no assignment
    return (dow === 0 || dow === 6) ? 'DAY_OFF' : 'WORKING';
  }

  function handleCellClick(e, emp, day) {
    const cellData = monthRoster[emp.id]?.[day] || getDefaultType(emp.id, day);
    setPopover({ empId: emp.id, empName: emp.name, day, type: cellData });
  }

  function handleSave(empId, day, type) {
    updateRosterCell(empId, day, type, year, month);
  }

  function getRowSummary(empId) {
    const cells = monthRoster[empId] || {};
    let working = 0, leave = 0, off = 0;
    days.forEach(d => {
      const t = cells[d] || getDefaultType(empId, d);
      if (t === 'WORKING' || t === 'HALF_DAY') working++;
      else if (t === 'DAY_OFF') off++;
      else if (t === 'ANNUAL' || t === 'SICK' || t === 'EMERGENCY' || t === 'MATERNITY' || t === 'PUBLIC_HOLIDAY') leave++;
    });
    return { working, leave, off };
  }

  // Template Downloader
  const handleDownloadTemplate = () => {
    // Generate June 2026 Template
    let header = "Employee ID,Employee Name," + Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`).join(",");
    let rows = employees.map(emp => {
      const currentRoster = monthRoster[emp.id] || {};
      const rowVals = Array.from({ length: daysInMonth }, (_, i) => currentRoster[i + 1] || "WORKING").join(",");
      return `"${emp.id}","${emp.name}",${rowVals}`;
    }).join("\n");

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + "\n" + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `Roster_Template_${getMonthName(month)}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV file parser
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return;

      // Extract shift values
      const parsedRows = [];
      let totalCells = 0;
      let conflictCount = 0;

      for (let i = 1; i < lines.length; i++) {
        // Simple regex CSV splitter (handles quotation marks)
        const parts = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
        const empId = parseInt(parts[0], 10);
        const empName = parts[1];
        
        if (empId) {
          const daysRoster = {};
          for (let d = 1; d <= daysInMonth; d++) {
            const index = d + 1; // ID, Name is 0, 1
            if (parts[index]) {
              const val = parts[index].toUpperCase().trim();
              let normalizedVal = 'WORKING';
              if (val === 'OFF' || val === 'DAY_OFF') normalizedVal = 'DAY_OFF';
              else if (val === 'ANNUAL' || val === 'AL') normalizedVal = 'ANNUAL';
              else if (val === 'SICK' || val === 'S') normalizedVal = 'SICK';
              else if (val === 'EMERGENCY' || val === 'EMG') normalizedVal = 'EMERGENCY';
              else if (val === 'MATERNITY' || val === 'MAT') normalizedVal = 'MATERNITY';
              else if (val === 'HALF' || val === 'HALF_DAY') normalizedVal = 'HALF_DAY';
              else if (val === 'HOLIDAY' || val === 'PH' || val === 'PUBLIC_HOLIDAY') normalizedVal = 'PUBLIC_HOLIDAY';

              // Check conflict: Work shift on weekend or holiday
              if (normalizedVal === 'WORKING') {
                const wk = isWeekend(year, month, d);
                const hol = getPublicHoliday(publicHolidays, year, month, d);
                if (wk || hol) {
                  conflictCount++;
                }
              }

              daysRoster[d] = normalizedVal;
              totalCells++;
            }
          }
          parsedRows.push({ employeeId: empId, days: daysRoster, name: empName });
        }
      }

      // Store parsed data for confirmation
      setImportSummary({
        data: parsedRows,
        employeeCount: parsedRows.length,
        shiftCount: totalCells,
        conflicts: conflictCount
      });
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (importSummary) {
      importRoster(importSummary.data, year, month);
      setImportSummary(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  return (
    <div className="space-y-4 animate-fade-in text-xs">
      {/* Top controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month navigator */}
        <div className="flex items-center gap-2 card px-3 py-1.5">
          <button id="prev-month" onClick={prevMonth} className="btn-ghost p-1"><ChevronLeft size={14} /></button>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 w-32 text-center">
            {getMonthName(month)} {year}
          </span>
          <button id="next-month" onClick={nextMonth} className="btn-ghost p-1"><ChevronRight size={14} /></button>
        </div>

        <select
          id="roster-dept-filter"
          className="input w-44 py-1.5"
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
        >
          <option value="All">All Departments</option>
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {/* File Upload Hidden */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="btn-secondary py-1.5"
            title="Upload CSV Roster Sheet"
          >
            <Upload size={13} /> Import Excel / CSV
          </button>
          <button onClick={handleDownloadTemplate} className="btn-secondary py-1.5">
            <Download size={13} /> Template
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[10px] text-gray-400 font-semibold uppercase">Legend:</span>
        {LEGEND.map(({ type, label }) => (
          <span key={type} className="flex items-center gap-1">
            <RosterChip type={type} />
            <span className="text-[10px] text-gray-400">{label}</span>
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="border-collapse" style={{ tableLayout: 'fixed', minWidth: `${220 + daysInMonth * 48 + 100}px` }}>
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th
                  className="sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 border-b border-r border-gray-100 dark:border-gray-700 px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  style={{ width: 200, minWidth: 200 }}
                >
                  Employee Name
                </th>
                {days.map(d => {
                  const hol = getPublicHoliday(publicHolidays, year, month, d);
                  const isWk = isWeekend(year, month, d);
                  return (
                    <th
                      key={d}
                      className={`border-b border-gray-100 dark:border-gray-700 text-center text-[10px] font-semibold py-2 ${
                        hol ? 'bg-orange-100/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400' :
                        isWk ? 'bg-gray-100/80 dark:bg-gray-700/60' : ''
                      } ${isCurrentMonth && d === today.getDate() ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}
                      style={{ width: 48, minWidth: 48 }}
                    >
                      <div>{d}</div>
                      <div className="font-normal text-[9px] text-gray-400 dark:text-gray-500">{getDayOfWeek(year, month, d)}</div>
                    </th>
                  );
                })}
                <th
                  className="sticky right-0 z-30 bg-gray-50 dark:bg-gray-800 border-b border-l border-gray-100 dark:border-gray-700 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-2"
                  style={{ width: 100, minWidth: 100 }}
                >
                  Summary
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleEmps.map((emp, ri) => {
                const { working, leave, off } = getRowSummary(emp.id);
                return (
                  <tr
                    key={emp.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${ri % 2 === 1 ? 'bg-gray-50/30 dark:bg-gray-900/30' : ''}`}
                  >
                    {/* Sticky employee name */}
                    <td
                      className="sticky left-0 z-10 bg-white dark:bg-gray-900 border-b border-r border-gray-100 dark:border-gray-800 px-3 py-1.5"
                      style={{ width: 200, minWidth: 200 }}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={emp.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{emp.name}</p>
                          <p className="text-[9px] text-gray-400 truncate">{emp.role}</p>
                        </div>
                      </div>
                    </td>

                    {/* Roster shift cells */}
                    {days.map(d => {
                      const type = monthRoster[emp.id]?.[d] || getDefaultType(emp.id, d);
                      const isWk = isWeekend(year, month, d);
                      const hol = getPublicHoliday(publicHolidays, year, month, d);
                      
                      return (
                        <td
                          key={d}
                          className={`border-b border-gray-50 dark:border-gray-800/60 text-center py-1 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors ${
                            hol ? 'bg-orange-50/30 dark:bg-orange-900/10' :
                            isWk ? 'bg-gray-50/50 dark:bg-gray-800/10' : ''
                          }`}
                          onClick={e => handleCellClick(e, emp, d)}
                          style={{ width: 48, minWidth: 48 }}
                          title={hol ? `Holiday: ${hol.name}` : undefined}
                        >
                          {hol && type === 'WORKING' ? (
                            <span className="relative inline-block">
                              <RosterChip type="PUBLIC_HOLIDAY" />
                              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-orange-500 rounded-full border border-white" />
                            </span>
                          ) : (
                            <RosterChip type={type} shiftName={type === 'WORKING' ? emp.shift : null} />
                          )}
                        </td>
                      );
                    })}

                    {/* Summary column */}
                    <td
                      className="sticky right-0 z-10 bg-white dark:bg-gray-900 border-b border-l border-gray-50 dark:border-gray-800 text-center py-1.5 px-2"
                      style={{ width: 100, minWidth: 100 }}
                    >
                      <div className="space-y-0.5 text-[9px] font-semibold">
                        <p className="text-blue-600 font-semibold">{working}d work</p>
                        <p className="text-orange-500 font-medium">{leave}d abs</p>
                        <p className="text-gray-400 font-medium">{off}d off</p>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roster Cell Popover Editor */}
      {popover && (
        <Popover
          cell={popover}
          onClose={() => setPopover(null)}
          onSave={handleSave}
        />
      )}

      {/* CSV Import Preview Modal */}
      {importSummary && (
        <Modal open={!!importSummary} onClose={() => setImportSummary(null)} title="Roster Parse Confirmation" width="max-w-md">
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg text-blue-600 dark:text-blue-400 leading-relaxed">
              <p className="font-bold">File Interpreted Successfully</p>
              <ul className="list-disc list-inside mt-1.5 space-y-0.5 font-medium">
                <li>Profiles detected: {importSummary.employeeCount}</li>
                <li>Shift records parsed: {importSummary.shiftCount}</li>
                <li>Weekend / Holiday conflicts flagged: {importSummary.conflicts}</li>
              </ul>
            </div>
            
            {importSummary.conflicts > 0 && (
              <p className="text-[10px] text-amber-500 font-semibold">
                ⚠️ Warning: {importSummary.conflicts} working shifts are assigned on weekends or holidays. The system will flag these for overtime rates.
              </p>
            )}

            <p className="text-gray-400 leading-normal">
              Would you like to import this roster data? This will overwrite existing schedules for {getMonthName(month)} {year} and notify employees.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setImportSummary(null)}>Discard</button>
              <button className="btn-primary" onClick={handleConfirmImport}>
                <CheckCircle size={14} /> Import Shifts
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
