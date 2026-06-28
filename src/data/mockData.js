// ─── Default configuration (no dummy employee/attendance data) ───────────────

export const defaultDepartments = [
  'Engineering', 'HR', 'Finance', 'Operations', 'Marketing', 'Sales',
];

// workingDays: array of JS day-of-week numbers (0=Sun, 1=Mon ... 6=Sat)
export const defaultShifts = [
  { id: 1, name: 'Morning',   start: '07:00', end: '15:00', grace: 10,  location: 'Main Office', workingDays: [1,2,3,4,5]    },
  { id: 2, name: 'Afternoon', start: '14:00', end: '22:00', grace: 10,  location: 'Main Office', workingDays: [1,2,3,4,5]    },
  { id: 3, name: 'Night',     start: '22:00', end: '06:00', grace: 15,  location: 'Branch B',    workingDays: [1,2,3,4,5]    },
  { id: 4, name: 'Weekend',   start: '08:00', end: '16:00', grace: 15,  location: 'Main Office', workingDays: [6,0]           },
  { id: 5, name: 'Full Week', start: '09:00', end: '17:00', grace: 30,  location: 'Main Office', workingDays: [1,2,3,4,5,6,0] },
  { id: 6, name: 'Flexi',     start: '09:00', end: '17:00', grace: 30,  location: 'Remote',      workingDays: [1,2,3,4,5]    },
];

export const defaultPublicHolidays = [
  { id: 1, name: "New Year's Day", date: '2026-01-01', recurring: true },
  { id: 2, name: 'Labour Day',     date: '2026-05-01', recurring: true },
  { id: 3, name: 'Independence Day', date: '2026-07-04', recurring: true },
  { id: 4, name: 'Christmas Day',  date: '2026-12-25', recurring: true },
];

export const defaultLeavePolicy = {
  yearStart: `${new Date().getFullYear()}-01-01`,
  yearEnd:   `${new Date().getFullYear()}-12-31`,
  defaults:  { annual: 18, sick: 14, emergency: 5, maternity: 90 },
};

export const defaultSystemSettings = {
  gracePeriodMinutes: 10,
  missedClockInReminder: true,
  missedClockOutReminder: true,
  escalateToManager: true,
  emailDigest: false,
  leaveApprovalAlert: true,
  adminPin: 'admin123',
  reminderEmailTemplate:
    `Dear {employee_name},\n\nThis is a reminder that your scheduled shift starts at {shift_time} and we have not yet received your clock-in.\n\nPlease clock in as soon as possible or contact your manager.\n\nBest regards,\nHR System`,
  clockOutReminderTemplate:
    `Dear {employee_name},\n\nYour shift was scheduled to end at {shift_time}. We have not received your clock-out scan.\n\nPlease clock out or contact HR if you are still on site.\n\nBest regards,\nHR System`,
};

// Empty initial data — real data entered by admin
export const employees    = [];
export const leaveBalances  = [];
export const leaveRequests  = [];
export const clockLogs      = [];
export const clockFeed      = [];

// ── localStorage persistence helpers ─────────────────────────────────────────
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

export function loadFromStorage() {
  return {
    employees:       lsGet('hr-employees',        []),
    shifts:          lsGet('hr-shifts',            defaultShifts),
    shiftAssignments:lsGet('hr-shiftAssignments',  {}),
    departments:     lsGet('hr-departments',       defaultDepartments),
    leaveBalances:   lsGet('hr-leaveBalances',     []),
    leaveRequests:   lsGet('hr-leaveRequests',     []),
    clockLogs:       lsGet('hr-clockLogs',         []),
    clockFeed:       lsGet('hr-clockFeed',         []),
    publicHolidays:  lsGet('hr-publicHolidays',    defaultPublicHolidays),
    roster:          lsGet('hr-roster',            {}),
    systemSettings:  lsGet('hr-systemSettings',    defaultSystemSettings),
    leavePolicy:     lsGet('hr-leavePolicy',       defaultLeavePolicy),
  };
}

export function generateRosterRow(_empId, year, month, schedule) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (schedule) {
      cells[d] = schedule[dow] ? 'WORKING' : 'DAY_OFF';
    } else {
      cells[d] = dow === 0 || dow === 6 ? 'DAY_OFF' : 'WORKING';
    }
  }
  return cells;
}

/** Build a shift assignment schedule from a shift's workingDays array */
export function buildScheduleFromShift(shift) {
  const days = shift?.workingDays || [1,2,3,4,5];
  const schedule = {};
  days.forEach(d => { schedule[d] = shift.id; });
  return schedule;
}
