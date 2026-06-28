const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}/${path}`.replace(/\/+/g, '/').replace(':/', '://'), {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `API error ${res.status}`);
  }
  return data;
}

export const api = {
  health: () => request('health'),
  bootstrap: () => request('bootstrap'),
  authAdmin: (pin) => request('auth/admin', { method: 'POST', body: JSON.stringify({ pin }) }),
  authFingerprint: (employeeId, template) => request('auth/fingerprint', { method: 'POST', body: JSON.stringify({ employeeId, template }) }),
  addEmployee: (emp) => request('employees', { method: 'POST', body: JSON.stringify(emp) }),
  updateEmployee: (id, updates) => request(`employees/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteEmployee: (id) => request(`employees/${id}`, { method: 'DELETE' }),
  resetPassword: (id, password) => request(`employees/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  clock: (employeeId, type, template) => request('clock', { method: 'POST', body: JSON.stringify({ employeeId, type, template }) }),
  applyLeave: (data) => request('leave/apply', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveStatus: (requestId, status) => request('leave/status', { method: 'POST', body: JSON.stringify({ requestId, status }) }),
  addSickDay: (employeeId, date) => request('leave/sick', { method: 'POST', body: JSON.stringify({ employeeId, date }) }),
  adjustLeaveBalance: (data) => request('leave/adjust', { method: 'POST', body: JSON.stringify(data) }),
  updateLeavePolicy: (policy) => request('leave/policy', { method: 'PUT', body: JSON.stringify(policy) }),
  addShift: (shift) => request('shifts', { method: 'POST', body: JSON.stringify(shift) }),
  updateShift: (id, shift) => request(`shifts/${id}`, { method: 'PUT', body: JSON.stringify(shift) }),
  deleteShift: (id) => request(`shifts/${id}`, { method: 'DELETE' }),
  addHoliday: (holiday) => request('holidays', { method: 'POST', body: JSON.stringify(holiday) }),
  deleteHoliday: (id) => request(`holidays/${id}`, { method: 'DELETE' }),
  assignShift: (employeeId, assignment) => request('shift-assignments', { method: 'POST', body: JSON.stringify({ employeeId, assignment }) }),
  updateSettings: (settings) => request('settings', { method: 'PUT', body: JSON.stringify(settings) }),
  updateRosterCell: (data) => request('roster/cell', { method: 'POST', body: JSON.stringify(data) }),
  importRoster: (data) => request('roster/import', { method: 'POST', body: JSON.stringify(data) }),
  clearNotifications: (userId) => request('notifications/read', { method: 'POST', body: JSON.stringify({ userId }) }),
  runReminders: () => request('reminders/run', { method: 'POST', body: '{}' }),
};

export function applyBootstrap(setters, data) {
  if (data.employees) setters.setEmployees(data.employees);
  if (data.shifts) setters.setShifts(data.shifts);
  if (data.publicHolidays) setters.setPublicHolidays(data.publicHolidays);
  if (data.shiftAssignments) setters.setShiftAssignments(data.shiftAssignments);
  if (data.leaveBalances) setters.setLeaveBalances(data.leaveBalances);
  if (data.leaveRequests) setters.setLeaveRequests(data.leaveRequests);
  if (data.roster) setters.setRoster(data.roster);
  if (data.clockLogs) setters.setClockLogs(data.clockLogs);
  if (data.clockFeed) setters.setClockFeed(data.clockFeed);
  if (data.notifications) setters.setNotifications(data.notifications);
  if (data.emails) setters.setEmails(data.emails);
  if (data.systemSettings) setters.setSystemSettings(data.systemSettings);
  if (data.leavePolicy) setters.setLeavePolicy(data.leavePolicy);
}
