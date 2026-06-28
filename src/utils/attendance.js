const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function todayStr() {
  // Use LOCAL calendar date — avoids UTC offset causing wrong date in +03:00 timezone
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function getCurrentTimeStr() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function getShiftForEmployee(employee, shifts, shiftAssignments) {
  const assignment = shiftAssignments?.[employee.id];
  const today = new Date();
  const dayOfWeek = today.getDay();

  if (assignment?.schedule?.[dayOfWeek]) {
    const shiftId = assignment.schedule[dayOfWeek];
    const byId = shifts.find(s => s.id === shiftId);
    if (byId) return byId;
  }

  const shiftName = assignment?.shiftName || employee.shift;
  return shifts.find(s => s.name === shiftName) || shifts[0] || null;
}

export function isScheduledToWorkToday(employee, roster, shiftAssignments, publicHolidays) {
  const today = todayStr();
  const date = new Date();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const dayOfWeek = date.getDay();

  const holiday = publicHolidays?.find(h => {
    if (h.recurring) {
      const hd = new Date(h.date);
      return hd.getMonth() + 1 === month && hd.getDate() === day;
    }
    return h.date === today;
  });
  if (holiday) return { working: false, reason: 'public_holiday', holiday };

  const empRoster = roster?.[`${year}-${month}`]?.[employee.id] || roster?.[employee.id];
  if (empRoster) {
    const dayType = empRoster[day];
    if (dayType && dayType !== 'WORKING' && dayType !== 'HALF_DAY') {
      return { working: false, reason: dayType.toLowerCase(), dayType };
    }
  }

  const assignment = shiftAssignments?.[employee.id];
  if (assignment?.schedule) {
    const shiftId = assignment.schedule[dayOfWeek];
    if (!shiftId) return { working: false, reason: 'day_off' };
  } else if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { working: false, reason: 'weekend' };
  }

  return { working: true, reason: null };
}

export function getEmployeeAttendanceStatus(employee, {
  clockLogs,
  leaveRequests,
  roster,
  shiftAssignments,
  shifts,
  publicHolidays,
}) {
  const today = todayStr();
  const schedule = isScheduledToWorkToday(employee, roster, shiftAssignments, publicHolidays);

  const onLeave = leaveRequests.find(req =>
    req.employeeId === employee.id &&
    req.status === 'approved' &&
    today >= req.from &&
    today <= req.to
  );
  if (onLeave) {
    return { status: 'on_leave', label: 'On Leave', detail: `${onLeave.type} leave` };
  }

  if (!schedule.working) {
    if (schedule.reason === 'sick') return { status: 'on_leave', label: 'Sick', detail: 'Marked sick on roster' };
    if (schedule.reason === 'annual') return { status: 'on_leave', label: 'On Leave', detail: 'Annual leave' };
    if (schedule.reason === 'weekend' || schedule.reason === 'day_off') {
      return { status: 'day_off', label: 'Day Off', detail: 'Not scheduled today' };
    }
    if (schedule.reason === 'public_holiday') {
      return { status: 'day_off', label: 'Public Holiday', detail: schedule.holiday?.name };
    }
    return { status: 'day_off', label: 'Off Schedule', detail: schedule.reason };
  }

  const todayLogs = clockLogs.filter(l => l.employeeId === employee.id && l.date === today);
  const openLog = todayLogs.find(l => l.actualIn && !l.actualOut);
  const completedLog = todayLogs.find(l => l.actualIn && l.actualOut);

  if (openLog) {
    if (openLog.status === 'late') {
      return { status: 'clocked_in', label: 'Clocked In (Late)', detail: `In at ${openLog.actualIn}` };
    }
    return { status: 'clocked_in', label: 'Clocked In', detail: `In at ${openLog.actualIn}` };
  }

  if (completedLog) {
    if (completedLog.status === 'early_departure') {
      return { status: 'early_departure', label: 'Early Departure', detail: `Left at ${completedLog.actualOut}` };
    }
    return { status: 'clocked_out', label: 'Clocked Out', detail: `Completed ${completedLog.totalHours}h` };
  }

  const shift = getShiftForEmployee(employee, shifts, shiftAssignments);
  if (shift) {
    const nowMins = parseTimeToMinutes(getCurrentTimeStr());
    const startMins = parseTimeToMinutes(shift.start);
    const grace = shift.grace ?? 10;
    if (nowMins > startMins + grace) {
      return { status: 'absent', label: 'Absent', detail: `Expected by ${shift.start}` };
    }
    return { status: 'not_yet', label: 'Not Yet Clocked In', detail: `Shift starts ${shift.start}` };
  }

  return { status: 'not_yet', label: 'Not Yet', detail: 'Awaiting clock-in' };
}

export function createEmptyRosterRow(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    cells[d] = dow === 0 || dow === 6 ? 'DAY_OFF' : 'WORKING';
  }
  return cells;
}

export { DAY_NAMES };
