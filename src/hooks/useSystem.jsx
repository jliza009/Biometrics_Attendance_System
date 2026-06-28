import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import {
  defaultShifts,
  defaultPublicHolidays,
  defaultLeavePolicy,
  defaultSystemSettings,
  defaultDepartments,
  generateRosterRow,
  buildScheduleFromShift,
  loadFromStorage,
} from '../data/mockData';
import { verifyFingerprint, simulateScan } from '../utils/biometrics';
import { api, applyBootstrap } from '../api/client';
import {
  todayStr,
  parseTimeToMinutes,
  getCurrentTimeStr,
  getShiftForEmployee,
  isScheduledToWorkToday,
  getEmployeeAttendanceStatus,
} from '../utils/attendance';

const SystemContext = createContext();

function rosterKey(year, month) {
  return `${year}-${month}`;
}

function getTodayParts() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function SystemProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem('hr-role') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('hr-user');
    return stored ? JSON.parse(stored) : null;
  });

  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [apiError, setApiError] = useState(null);

  // ── All critical state is hydrated from localStorage on mount ──────────────
  const _ls = loadFromStorage();
  const [employees,        setEmployees]        = useState(_ls.employees);
  const [roster,           setRoster]           = useState(_ls.roster);
  const [leaveRequests,    setLeaveRequests]    = useState(_ls.leaveRequests);
  const [leaveBalances,    setLeaveBalances]    = useState(_ls.leaveBalances);
  const [leavePolicy,      setLeavePolicy]      = useState(_ls.leavePolicy);
  const [clockLogs,        setClockLogs]        = useState(_ls.clockLogs);
  const [clockFeed,        setClockFeed]        = useState(_ls.clockFeed);
  const [shifts,           setShifts]           = useState(_ls.shifts);
  const [publicHolidays,   setPublicHolidays]   = useState(_ls.publicHolidays);
  const [shiftAssignments, setShiftAssignments] = useState(_ls.shiftAssignments);
  const [systemSettings,   setSystemSettings]   = useState(_ls.systemSettings);
  const [departments,      setDepartments]      = useState(_ls.departments);
  const [notifications,    setNotifications]    = useState([]);
  const [emails,           setEmails]           = useState([]);

  // ── Persist critical state to localStorage whenever it changes ─────────────
  useEffect(() => { localStorage.setItem('hr-employees',        JSON.stringify(employees));        }, [employees]);
  useEffect(() => { localStorage.setItem('hr-shifts',           JSON.stringify(shifts));           }, [shifts]);
  useEffect(() => { localStorage.setItem('hr-shiftAssignments', JSON.stringify(shiftAssignments)); }, [shiftAssignments]);
  useEffect(() => { localStorage.setItem('hr-departments',      JSON.stringify(departments));      }, [departments]);
  useEffect(() => { localStorage.setItem('hr-leaveBalances',    JSON.stringify(leaveBalances));    }, [leaveBalances]);
  useEffect(() => { localStorage.setItem('hr-leaveRequests',    JSON.stringify(leaveRequests));    }, [leaveRequests]);
  useEffect(() => { localStorage.setItem('hr-clockLogs',        JSON.stringify(clockLogs));        }, [clockLogs]);
  useEffect(() => { localStorage.setItem('hr-clockFeed',        JSON.stringify(clockFeed));        }, [clockFeed]);
  useEffect(() => { localStorage.setItem('hr-publicHolidays',   JSON.stringify(publicHolidays));   }, [publicHolidays]);
  useEffect(() => { localStorage.setItem('hr-roster',           JSON.stringify(roster));           }, [roster]);
  useEffect(() => { localStorage.setItem('hr-systemSettings',   JSON.stringify(systemSettings));   }, [systemSettings]);
  useEffect(() => { localStorage.setItem('hr-leavePolicy',      JSON.stringify(leavePolicy));      }, [leavePolicy]);

  const setters = {
    setEmployees, setRoster, setLeaveRequests, setLeaveBalances, setLeavePolicy,
    setClockLogs, setClockFeed, setShifts, setPublicHolidays, setShiftAssignments,
    setSystemSettings, setNotifications, setEmails,
  };

  const syncBootstrap = useCallback((data) => {
    if (data?.bootstrap) applyBootstrap(setters, data.bootstrap);
    else if (data?.employees) applyBootstrap(setters, data);
  }, []);

  const refreshFromApi = useCallback(async () => {
    const data = await api.bootstrap();
    applyBootstrap(setters, data);
    return data;
  }, []);

  useEffect(() => {
    api.bootstrap()
      .then(data => {
        applyBootstrap(setters, data);
        setApiConnected(true);
        setApiError(null);
      })
      .catch(err => {
        setApiConnected(false);
        setApiError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const remindersSentRef = useRef({});

  useEffect(() => {
    if (role) localStorage.setItem('hr-role', role);
    else localStorage.removeItem('hr-role');
  }, [role]);

  useEffect(() => {
    if (currentUser) localStorage.setItem('hr-user', JSON.stringify(currentUser));
    else localStorage.removeItem('hr-user');
  }, [currentUser]);


  const sendEmailNotification = useCallback((to, subject, body) => {
    const newEmail = {
      id: Date.now() + Math.random(),
      to,
      subject,
      body,
      sentAt: new Date().toLocaleString(),
    };
    setEmails(prev => [newEmail, ...prev]);
  }, []);

  const addSystemNotification = useCallback((userId, message, type) => {
    setNotifications(prev => [{
      id: Date.now() + Math.random(),
      userId,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false,
    }, ...prev]);
  }, []);

  const login = (selectedRole, userObject) => {
    setRole(selectedRole);
    setCurrentUser(userObject);
  };

  const logout = () => {
    setRole(null);
    setCurrentUser(null);
  };

  const verifyAdminPin = async (pin) => {
    if (!apiConnected) return pin === systemSettings.adminPin;
    try {
      const res = await api.authAdmin(pin);
      return res.success;
    } catch {
      return false;
    }
  };

  const getEmployeeStatus = useCallback((empId) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return null;
    return getEmployeeAttendanceStatus(emp, {
      clockLogs,
      leaveRequests,
      roster,
      shiftAssignments,
      shifts,
      publicHolidays,
    });
  }, [employees, clockLogs, leaveRequests, roster, shiftAssignments, shifts, publicHolidays]);

  const addEmployee = async (emp) => {
    if (apiConnected) {
      try {
        const res = await api.addEmployee(emp);
        await refreshFromApi();
        return res;
      } catch (e) {
        return { success: false, message: e.message };
      }
    }

    const newEmp = {
      ...emp,
      id: employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1,
      status: emp.status || 'active',
      startDate: emp.startDate || todayStr(),
    };

    setEmployees(prev => [...prev, newEmp]);

    // Leave balances
    const defaults = leavePolicy.defaults;
    setLeaveBalances(prev => [...prev, {
      employeeId: newEmp.id,
      annual:    { allocated: defaults.annual,    used: 0 },
      sick:      { allocated: defaults.sick,      used: 0 },
      emergency: { allocated: defaults.emergency, used: 0 },
      maternity: { allocated: defaults.maternity, used: 0 },
    }]);

    // Build initial roster based on shift's workingDays
    const shift = shifts.find(s => s.name === newEmp.shift);
    const schedule = shift ? buildScheduleFromShift(shift) : { 1: null, 2: null, 3: null, 4: null, 5: null };

    const { year, month } = getTodayParts();
    const daysInMonth = new Date(year, month, 0).getDate();
    const rosterRow = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      const isHoliday = publicHolidays.some(h =>
        h.date === `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}` ||
        (h.recurring && h.date.slice(5) === `${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
      );
      if (isHoliday) { rosterRow[d] = 'PUBLIC_HOLIDAY'; continue; }
      rosterRow[d] = schedule[dow] ? 'WORKING' : 'DAY_OFF';
    }

    setRoster(prev => ({
      ...prev,
      [rosterKey(year, month)]: {
        ...(prev[rosterKey(year, month)] || {}),
        [newEmp.id]: rosterRow,
      },
    }));

    if (shift) {
      setShiftAssignments(prev => ({
        ...prev,
        [newEmp.id]: { shiftName: newEmp.shift, shiftId: shift.id, schedule },
      }));
    }

    addSystemNotification('admin', `New employee registered: ${newEmp.name}`, 'employee');
    sendEmailNotification(
      newEmp.email,
      'Welcome to the Company Portal',
      `Hi ${newEmp.name},\n\nYour HR Portal account has been created.\n\nLogin: ${newEmp.email}\nPassword: ${newEmp.password || '(set by HR)'}\n\nPlease change your password after first login.\n\nBest,\nHR Administration`
    );

    return { success: true, employee: newEmp };
  };

  // ── Reset password ──────────────────────────────────────────
  const resetPassword = async (empId, newPassword) => {
    if (apiConnected) {
      await api.resetPassword(empId, newPassword);
      await refreshFromApi();
    } else {
      setEmployees(prev => prev.map(e => e.id === empId ? { ...e, password: newPassword } : e));
    }
    // Update currentUser session if it's the same person
    if (currentUser?.id === empId) setCurrentUser(u => ({ ...u, password: newPassword }));
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      sendEmailNotification(emp.email, 'Password Reset', `Hi ${emp.name},\n\nYour HR Portal password has been reset.\n\nNew password: ${newPassword}\n\nPlease log in and change your password.\n\nBest,\nHR Administration`);
      addSystemNotification(empId, 'Your login password has been reset.', 'system');
    }
  };

  const deleteEmployee = async (empId) => {
    if (apiConnected) {
      const res = await api.deleteEmployee(empId);
      if (res.success) {
        await refreshFromApi();
        return true;
      }
      return false;
    }
    setEmployees(prev => prev.filter(e => e.id !== empId));
    return true;
  };

  // ── Reset fingerprint (admin action) ───────────────────────────────────────
  const resetFingerprint = (empId) => {
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, fingerprint: null } : e));
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      addSystemNotification(empId, 'Your fingerprint has been cleared. Please re-enroll with HR.', 'system');
      sendEmailNotification(emp.email, 'Fingerprint Reset', `Hi ${emp.name},\n\nYour enrolled fingerprint has been reset. Please visit HR to re-enroll your fingerprint.\n\nBest,\nHR Administration`);
    }
  };

  // ── Add department ─────────────────────────────────────────────────────────
  const addDepartment = (name) => {
    const trimmed = name.trim();
    if (!trimmed || departments.includes(trimmed)) return false;
    setDepartments(prev => [...prev, trimmed]);
    return true;
  };

  const updateEmployee = async (empId, updates) => {
    if (apiConnected) {
      try {
        const res = await api.updateEmployee(empId, updates);
        await refreshFromApi();
        return res;
      } catch (err) {
        return { success: false, message: err.message };
      }
    }

    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, ...updates } : e));
    if (updates.shift) {
      const shift = shifts.find(s => s.name === updates.shift);
      const schedule = shift ? buildScheduleFromShift(shift) : undefined;
      setShiftAssignments(prev => ({
        ...prev,
        [empId]: {
          ...(prev[empId] || {}),
          shiftName: updates.shift,
          shiftId: shift?.id,
          // Only replace schedule if not already customised
          schedule: prev[empId]?.schedule || schedule || {},
        },
      }));
    }
    return { success: true };
  };

  const updateLeavePolicy = async (policy) => {
    if (apiConnected) { const res = await api.updateLeavePolicy(policy); syncBootstrap(res); return; }
    setLeavePolicy(policy);
    if (policy.defaults) {
      setLeaveBalances(prev => prev.map(bal => {
        const next = { ...bal };
        Object.keys(policy.defaults).forEach(type => {
          if (next[type]) {
            next[type] = { ...next[type], allocated: policy.defaults[type] };
          }
        });
        return next;
      }));
    }
  };

  const adjustLeaveBalance = async (empId, leaveType, days, action) => {
    if (apiConnected) {
      const res = await api.adjustLeaveBalance({ employeeId: empId, leaveType, days, action });
      syncBootstrap(res);
      return;
    }
    const key = leaveType.toLowerCase();
    setLeaveBalances(prev => prev.map(bal => {
      if (bal.employeeId !== empId || !bal[key]) return bal;
      if (action === 'add') {
        return { ...bal, [key]: { ...bal[key], allocated: bal[key].allocated + days } };
      }
      if (action === 'deduct') {
        return { ...bal, [key]: { ...bal[key], used: Math.min(bal[key].allocated, bal[key].used + days) } };
      }
      return bal;
    }));
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      addSystemNotification(empId, `HR adjusted your ${leaveType} leave balance (${action} ${days} day(s))`, 'leave');
      sendEmailNotification(
        emp.email,
        'Leave Balance Updated',
        `Hi ${emp.name},\n\nYour ${leaveType} leave balance has been updated by HR (${action === 'add' ? 'added' : 'deducted'} ${days} day(s)).\n\nBest,\nHR Department`
      );
    }
  };

  const applyLeave = async (empId, leaveData) => {
    if (apiConnected) {
      const res = await api.applyLeave({ employeeId: empId, ...leaveData });
      syncBootstrap(res);
      return;
    }
    const emp = employees.find(e => e.id === empId);
    const newRequest = {
      id: Date.now(),
      employeeId: empId,
      employeeName: emp ? emp.name : 'Unknown',
      department: emp ? emp.department : 'General',
      type: leaveData.type,
      from: leaveData.from,
      to: leaveData.to,
      days: parseInt(leaveData.days, 10) || 1,
      reason: leaveData.reason,
      status: 'pending',
    };

    setLeaveRequests(prev => [newRequest, ...prev]);
    addSystemNotification('admin', `${newRequest.employeeName} applied for ${newRequest.type} Leave (${newRequest.days} days)`, 'leave');

    if (systemSettings.leaveApprovalAlert) {
      sendEmailNotification(
        'hr-admin@company.com',
        `Leave Request: ${newRequest.employeeName}`,
        `A new leave request is pending approval.\n\nEmployee: ${newRequest.employeeName}\nType: ${newRequest.type}\nDuration: ${newRequest.from} to ${newRequest.to} (${newRequest.days} days)\nReason: ${newRequest.reason}`
      );
    }
  };

  const updateRosterForLeave = (empId, fromStr, toStr, rosterType) => {
    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);
    setRoster(prev => {
      const next = { ...prev };
      const cursor = new Date(fromDate);
      while (cursor <= toDate) {
        const y = cursor.getFullYear();
        const m = cursor.getMonth() + 1;
        const d = cursor.getDate();
        const key = rosterKey(y, m);
        next[key] = {
          ...(next[key] || {}),
          [empId]: {
            ...(next[key]?.[empId] || generateRosterRow(empId, y, m, shiftAssignments[empId]?.schedule)),
            [d]: rosterType,
          },
        };
        cursor.setDate(cursor.getDate() + 1);
      }
      return next;
    });
  };

  const updateLeaveStatus = async (requestId, status) => {
    if (apiConnected) {
      const res = await api.updateLeaveStatus(requestId, status);
      syncBootstrap(res);
      return;
    }
    let leaveReq = null;

    setLeaveRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        leaveReq = { ...req, status };
        return leaveReq;
      }
      return req;
    }));

    if (!leaveReq) return;

    const emp = employees.find(e => e.id === leaveReq.employeeId);
    addSystemNotification(leaveReq.employeeId, `Your leave request for ${leaveReq.from} to ${leaveReq.to} has been ${status}`, 'leave');

    if (emp && systemSettings.leaveApprovalAlert) {
      sendEmailNotification(
        emp.email,
        `Leave Request ${status}`,
        `Hi ${emp.name},\n\nYour request for ${leaveReq.type} Leave from ${leaveReq.from} to ${leaveReq.to} has been ${status.toLowerCase()}.\n\nBest,\nHR Department`
      );
    }

    if (status === 'approved') {
      const typeMap = { Annual: 'ANNUAL', Sick: 'SICK', Emergency: 'EMERGENCY', Maternity: 'MATERNITY' };
      const rosterType = typeMap[leaveReq.type] || 'ANNUAL';
      const key = leaveReq.type.toLowerCase();

      setLeaveBalances(prev => prev.map(bal => {
        if (bal.employeeId === leaveReq.employeeId && bal[key]) {
          return {
            ...bal,
            [key]: { ...bal[key], used: Math.min(bal[key].allocated, bal[key].used + leaveReq.days) },
          };
        }
        return bal;
      }));

      updateRosterForLeave(leaveReq.employeeId, leaveReq.from, leaveReq.to, rosterType);
    }
  };

  const addSickDay = async (empId, dateString) => {
    if (apiConnected) {
      const res = await api.addSickDay(empId, dateString);
      syncBootstrap(res);
      return;
    }
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const newRequest = {
      id: Date.now(),
      employeeId: empId,
      employeeName: emp.name,
      department: emp.department,
      type: 'Sick',
      from: dateString,
      to: dateString,
      days: 1,
      reason: 'Logged directly by Administrator',
      status: 'approved',
    };

    setLeaveRequests(prev => [newRequest, ...prev]);
    setLeaveBalances(prev => prev.map(bal => {
      if (bal.employeeId === empId) {
        return { ...bal, sick: { ...bal.sick, used: Math.min(bal.sick.allocated, bal.sick.used + 1) } };
      }
      return bal;
    }));

    updateRosterForLeave(empId, dateString, dateString, 'SICK');
    addSystemNotification(empId, `Administrator registered a Sick Day for you on ${dateString}`, 'leave');
    sendEmailNotification(emp.email, 'Sick Leave Registered', `Hi ${emp.name},\n\nA Sick Day has been logged on your behalf for ${dateString}.\n\nBest,\nHR Department`);
  };

  const updateRosterCell = async (empId, day, type, year, month) => {
    if (apiConnected) {
      const res = await api.updateRosterCell({ employeeId: empId, day, type, year: year || getTodayParts().year, month: month || getTodayParts().month });
      syncBootstrap(res);
      return;
    }
    const y = year || getTodayParts().year;
    const m = month || getTodayParts().month;
    const key = rosterKey(y, m);
    setRoster(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [empId]: {
          ...(prev[key]?.[empId] || generateRosterRow(empId, y, m, shiftAssignments[empId]?.schedule)),
          [day]: type,
        },
      },
    }));
  };

  const importRoster = async (parsedData, year, month) => {
    const y = year || getTodayParts().year;
    const m = month || getTodayParts().month;
    if (apiConnected) {
      const res = await api.importRoster({ year: y, month: m, rows: parsedData });
      syncBootstrap(res);
      return;
    }
    const key = rosterKey(y, m);

    setRoster(prev => {
      const nextRoster = { ...prev, [key]: { ...(prev[key] || {}) } };
      parsedData.forEach(row => {
        const empId = parseInt(row.employeeId, 10);
        if (empId && employees.some(e => e.id === empId)) {
          nextRoster[key][empId] = {
            ...(nextRoster[key][empId] || generateRosterRow(empId, y, m, shiftAssignments[empId]?.schedule)),
            ...row.days,
          };
        }
      });
      return nextRoster;
    });

    addSystemNotification('admin', 'Roster imported successfully', 'roster');
    employees.forEach(emp => {
      addSystemNotification(emp.id, `Roster for ${m}/${y} has been updated`, 'roster');
      sendEmailNotification(emp.email, 'Roster Updated', `Hi ${emp.name},\n\nYour roster schedule has been updated. Please review it in the employee portal.\n\nBest,\nOperations`);
    });
  };

  // Shift management
  const addShift = async (shift) => {
    if (apiConnected) { const res = await api.addShift(shift); syncBootstrap(res); return res; }
    const newShift = { ...shift, id: shifts.length > 0 ? Math.max(...shifts.map(s => s.id)) + 1 : 1, grace: parseInt(shift.grace, 10) || systemSettings.gracePeriodMinutes };
    setShifts(prev => [...prev, newShift]);
    return newShift;
  };

  const updateShift = async (id, updates) => {
    if (apiConnected) { const res = await api.updateShift(id, updates); syncBootstrap(res); return; }
    const updatedShift = shifts.find(s => s.id === id);
    const merged = updatedShift ? { ...updatedShift, ...updates, grace: parseInt(updates.grace ?? updatedShift.grace, 10) } : null;
    setShifts(prev => prev.map(s => s.id === id ? (merged || s) : s));

    // If workingDays changed, rebuild roster for all employees on this shift
    if (merged && updates.workingDays) {
      const affectedEmpIds = Object.entries(shiftAssignments)
        .filter(([, a]) => a.shiftId === id || a.shiftName === merged.name)
        .map(([empId]) => Number(empId));

      if (affectedEmpIds.length > 0) {
        const { year: cy, month: cm } = getTodayParts();
        const months = [
          { year: cy, month: cm },
          { year: cm + 1 > 12 ? cy + 1 : cy, month: cm + 1 > 12 ? 1 : cm + 1 },
        ];
        setRoster(prev => {
          const next = { ...prev };
          months.forEach(({ year, month }) => {
            const key = rosterKey(year, month);
            const daysInMonth = new Date(year, month, 0).getDate();
            affectedEmpIds.forEach(empId => {
              const existing = next[key]?.[empId] || {};
              const rebuilt = {};
              for (let d = 1; d <= daysInMonth; d++) {
                if (existing[d] && existing[d] !== 'WORKING' && existing[d] !== 'DAY_OFF') {
                  rebuilt[d] = existing[d]; continue;
                }
                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isHoliday = publicHolidays.some(h =>
                  h.date === dateStr || (h.recurring && h.date.slice(5) === dateStr.slice(5))
                );
                if (isHoliday) { rebuilt[d] = 'PUBLIC_HOLIDAY'; continue; }
                const dow = new Date(year, month - 1, d).getDay();
                rebuilt[d] = (merged.workingDays || []).includes(dow) ? 'WORKING' : 'DAY_OFF';
              }
              next[key] = { ...(next[key] || {}), [empId]: rebuilt };
            });
          });
          return next;
        });
        // Update the shiftAssignment schedule for affected employees
        setShiftAssignments(prev => {
          const next = { ...prev };
          affectedEmpIds.forEach(empId => {
            if (next[empId]) {
              next[empId] = { ...next[empId], schedule: buildScheduleFromShift(merged) };
            }
          });
          return next;
        });
      }
    }
  };

  const deleteShift = async (id) => {
    if (apiConnected) { const res = await api.deleteShift(id); syncBootstrap(res); return; }
    setShifts(prev => prev.filter(s => s.id !== id));
  };

  const addPublicHoliday = async (holiday) => {
    if (apiConnected) { const res = await api.addHoliday(holiday); syncBootstrap(res); return res; }
    const newHol = { ...holiday, id: publicHolidays.length > 0 ? Math.max(...publicHolidays.map(h => h.id)) + 1 : 1 };
    setPublicHolidays(prev => [...prev, newHol]);
  };

  const deletePublicHoliday = async (id) => {
    if (apiConnected) { const res = await api.deleteHoliday(id); syncBootstrap(res); return; }
    setPublicHolidays(prev => prev.filter(h => h.id !== id));
  };

  const assignEmployeeShift = async (empId, assignment) => {
    if (apiConnected) { const res = await api.assignShift(empId, assignment); syncBootstrap(res); return; }
    setShiftAssignments(prev => ({ ...prev, [empId]: assignment }));
    const emp = employees.find(e => e.id === empId);
    if (emp && assignment.shiftName) {
      updateEmployee(empId, { shift: assignment.shiftName });
    }

    // ── Rebuild roster for current + next 2 months to reflect new schedule ──
    const { year: cy, month: cm } = getTodayParts();
    const monthsToRebuild = [
      { year: cy, month: cm },
      { month: cm + 1 > 12 ? 1 : cm + 1, year: cm + 1 > 12 ? cy + 1 : cy },
      { month: cm + 2 > 12 ? (cm + 2) - 12 : cm + 2, year: cm + 2 > 12 ? cy + 1 : cy },
    ];

    setRoster(prev => {
      const next = { ...prev };
      monthsToRebuild.forEach(({ year, month }) => {
        const key = rosterKey(year, month);
        const daysInMonth = new Date(year, month, 0).getDate();
        const existing = next[key]?.[empId] || {};
        const rebuilt = {};

        for (let d = 1; d <= daysInMonth; d++) {
          // Preserve manual overrides (leave types, sick days, etc.)
          if (existing[d] && existing[d] !== 'WORKING' && existing[d] !== 'DAY_OFF') {
            rebuilt[d] = existing[d];
            continue;
          }

          const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          // Check public holiday first
          const isHoliday = publicHolidays.some(h =>
            h.date === dateStr || (h.recurring && h.date.slice(5) === dateStr.slice(5))
          );
          if (isHoliday) { rebuilt[d] = 'PUBLIC_HOLIDAY'; continue; }

          // Use the weekly schedule: 0=Sun,1=Mon,...,6=Sat
          const dow = new Date(year, month - 1, d).getDay();
          if (assignment.schedule) {
            rebuilt[d] = assignment.schedule[dow] ? 'WORKING' : 'DAY_OFF';
          } else {
            // No per-day schedule — default weekends off
            rebuilt[d] = (dow === 0 || dow === 6) ? 'DAY_OFF' : 'WORKING';
          }
        }

        next[key] = { ...(next[key] || {}), [empId]: rebuilt };
      });
      return next;
    });
  };

  const updateSystemSettings = async (updates) => {
    if (apiConnected) {
      const res = await api.updateSettings({ ...systemSettings, ...updates });
      syncBootstrap(res);
      return;
    }
    setSystemSettings(prev => ({ ...prev, ...updates }));
  };

  const clockInOrOut = useCallback(async (empId, type, scannedFingerprint) => {
    if (apiConnected) {
      try {
        const template = typeof scannedFingerprint === 'object'
          ? (scannedFingerprint.template || scannedFingerprint.id)
          : scannedFingerprint;
        const res = await api.clock(empId, type, template);
        await refreshFromApi();
        return res;
      } catch (e) {
        return { success: false, message: e.message };
      }
    }
    const emp = employees.find(e => e.id === empId);
    if (!emp) return { success: false, message: 'Employee not found' };
    if (emp.status !== 'active') return { success: false, message: 'Employee account is inactive' };

    const fpCheck = verifyFingerprint(emp.fingerprint, scannedFingerprint);
    if (!fpCheck.success) return fpCheck;

    const today = todayStr();
    const timeString = getCurrentTimeStr();
    const shift = getShiftForEmployee(emp, shifts, shiftAssignments);

    if (!shift) {
      return { success: false, message: 'No shift assigned. Contact HR administrator.' };
    }

    const schedule = isScheduledToWorkToday(emp, roster, shiftAssignments, publicHolidays);
    if (!schedule.working && type === 'in') {
      return { success: false, message: `Not scheduled to work today (${schedule.reason || 'off day'})` };
    }

    const grace = shift.grace ?? systemSettings.gracePeriodMinutes ?? 10;
    const todayLogs = clockLogs.filter(l => l.employeeId === empId && l.date === today);
    const openLog = todayLogs.find(l => l.actualIn && !l.actualOut);
    const completedToday = todayLogs.some(l => l.actualIn && l.actualOut);

    if (type === 'in') {
      if (openLog) {
        return { success: false, message: 'Already clocked in. Please clock out first.' };
      }
      if (completedToday) {
        return { success: false, message: 'You have already completed clock-in and clock-out for today.' };
      }

      const nowMins = parseTimeToMinutes(timeString);
      const expectedMins = parseTimeToMinutes(shift.start);
      const diffMins = nowMins - expectedMins;
      const isLate = diffMins > grace;
      const status = isLate ? 'late' : 'on_time';

      const newLog = {
        id: Date.now(),
        employeeId: empId,
        employeeName: emp.name,
        department: emp.department,
        shift: shift.name,
        expectedIn: shift.start,
        actualIn: timeString,
        expectedOut: shift.end,
        actualOut: null,
        totalHours: null,
        status,
        location: shift.location || 'Biometric Scanner',
        date: today,
      };

      setClockLogs(prev => [newLog, ...prev]);
      setClockFeed(prev => [{ id: Date.now(), name: emp.name, time: timeString, type: 'in', status }, ...prev].slice(0, 50));

      if (isLate) {
        addSystemNotification('admin', `Late Clock-In: ${emp.name} at ${timeString} (${diffMins} mins late)`, 'clock');
        sendEmailNotification(emp.email, 'Late Attendance Alert', `Hi ${emp.name},\n\nLate clock-in recorded at ${timeString} for your ${shift.name} shift.\n\nBest,\nHR Systems`);
      } else {
        addSystemNotification('admin', `${emp.name} clocked in on time at ${timeString}`, 'clock');
      }

      return { success: true, message: `Successfully clocked in at ${timeString}`, status };
    }

    // Clock out
    if (!openLog) {
      if (completedToday) {
        return { success: false, message: 'Already clocked out for today.' };
      }
      return { success: false, message: 'No active clock-in found. Please clock in first.' };
    }

    const [inH, inM] = openLog.actualIn.split(':').map(Number);
    const [outH, outM] = timeString.split(':').map(Number);
    let totalMins = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMins < 0) totalMins += 24 * 60;
    const totalHours = parseFloat((totalMins / 60).toFixed(1));

    const expOutMins = parseTimeToMinutes(shift.end);
    const outMins = outH * 60 + outM;
    const isEarly = outMins < expOutMins - grace;
    const status = isEarly ? 'early_departure' : openLog.status;

    setClockLogs(prev => prev.map(log => {
      if (log.id === openLog.id) {
        return { ...log, actualOut: timeString, totalHours, status };
      }
      return log;
    }));

    setClockFeed(prev => [{ id: Date.now(), name: emp.name, time: timeString, type: 'out', status }, ...prev].slice(0, 50));
    addSystemNotification('admin', `${emp.name} clocked out at ${timeString}`, 'clock');

    if (isEarly) {
      sendEmailNotification(emp.email, 'Early Departure Recorded', `Hi ${emp.name},\n\nEarly departure recorded at ${timeString}. Expected end: ${shift.end}.\n\nBest,\nHR Systems`);
    }

    return { success: true, message: `Successfully clocked out at ${timeString}`, status };
  }, [employees, shifts, shiftAssignments, roster, publicHolidays, clockLogs, systemSettings, addSystemNotification, sendEmailNotification, apiConnected, refreshFromApi]);

  const authenticateWithFingerprint = useCallback((scannedFingerprint) => {
    const emp = employees.find(e => {
      if (!e.fingerprint || e.status !== 'active') return false;
      return verifyFingerprint(e.fingerprint, scannedFingerprint).success;
    });
    if (!emp) return { success: false, message: 'Fingerprint not recognized. Contact HR.' };
    return { success: true, employee: emp };
  }, [employees]);

  useEffect(() => {
    if (!apiConnected) return undefined;
    const interval = setInterval(() => api.runReminders().then(syncBootstrap).catch(() => {}), 60000);
    api.runReminders().then(syncBootstrap).catch(() => {});
    return () => clearInterval(interval);
  }, [apiConnected, syncBootstrap]);

  // Grace period reminder scheduler (local fallback)
  useEffect(() => {
    if (apiConnected) return undefined;
    const checkReminders = () => {
      const today = todayStr();
      const nowMins = parseTimeToMinutes(getCurrentTimeStr());

      employees.filter(e => e.status === 'active').forEach(emp => {
        const schedule = isScheduledToWorkToday(emp, roster, shiftAssignments, publicHolidays);
        if (!schedule.working) return;

        const shift = getShiftForEmployee(emp, shifts, shiftAssignments);
        if (!shift) return;

        const grace = shift.grace ?? systemSettings.gracePeriodMinutes ?? 10;
        const todayLogs = clockLogs.filter(l => l.employeeId === emp.id && l.date === today);
        const openLog = todayLogs.find(l => l.actualIn && !l.actualOut);
        const hasClockedIn = todayLogs.some(l => l.actualIn);
        const hasClockedOut = todayLogs.some(l => l.actualOut);

        const inKey = `${emp.id}-in-${today}`;
        const outKey = `${emp.id}-out-${today}`;
        const startMins = parseTimeToMinutes(shift.start);
        const endMins = parseTimeToMinutes(shift.end);

        if (systemSettings.missedClockInReminder && !hasClockedIn && nowMins > startMins + grace) {
          if (!remindersSentRef.current[inKey]) {
            remindersSentRef.current[inKey] = true;
            const body = (systemSettings.reminderEmailTemplate || defaultSystemSettings.reminderEmailTemplate)
              .replace('{employee_name}', emp.name)
              .replace('{shift_time}', shift.start)
              .replace('{date}', today);
            sendEmailNotification(emp.email, 'Clock-In Reminder', body);
            addSystemNotification(emp.id, `Reminder: Please clock in for your ${shift.name} shift`, 'clock');
          }
        }

        if (systemSettings.missedClockOutReminder && openLog && !hasClockedOut && nowMins > endMins + grace) {
          if (!remindersSentRef.current[outKey]) {
            remindersSentRef.current[outKey] = true;
            const body = (systemSettings.clockOutReminderTemplate || defaultSystemSettings.clockOutReminderTemplate)
              .replace('{employee_name}', emp.name)
              .replace('{shift_time}', shift.end)
              .replace('{date}', today);
            sendEmailNotification(emp.email, 'Clock-Out Reminder', body);
            addSystemNotification(emp.id, `Reminder: Please clock out — shift ended at ${shift.end}`, 'clock');
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000);
    checkReminders();
    return () => clearInterval(interval);
  }, [apiConnected, employees, shifts, shiftAssignments, roster, publicHolidays, clockLogs, systemSettings, sendEmailNotification, addSystemNotification]);

  const clearNotifications = async (userId) => {
    if (apiConnected) { const res = await api.clearNotifications(userId); syncBootstrap(res); return; }
    setNotifications(prev => prev.map(n => (n.userId === userId ? { ...n, read: true } : n)));
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const resetToFreshData = () => {
    if (!window.confirm('Clear all data and start fresh? This cannot be undone.')) return;
    localStorage.clear();
    window.location.reload();
  };

  return (
    <SystemContext.Provider value={{
      role,
      currentUser,
      employees,
      departments,
      roster,
      leaveRequests,
      leaveBalances,
      leavePolicy,
      clockLogs,
      clockFeed,
      shifts,
      publicHolidays,
      shiftAssignments,
      systemSettings,
      notifications,
      emails,
      login,
      logout,
      verifyAdminPin,
      addEmployee,
      updateEmployee,
      assignEmployeeShift,
      resetPassword,
      resetFingerprint,
      deleteEmployee,
      addDepartment,
      applyLeave,
      updateLeaveStatus,
      addSickDay,
      updateRosterCell,
      importRoster,
      clockInOrOut,
      authenticateWithFingerprint,
      simulateScan: (fp) => simulateScan(fp),
      getEmployeeStatus,
      addShift,
      updateShift,
      deleteShift,
      addPublicHoliday,
      deletePublicHoliday,
      assignEmployeeShift,
      updateSystemSettings,
      updateLeavePolicy,
      adjustLeaveBalance,
      clearNotifications,
      deleteNotification,
      sendEmailNotification,
      resetToFreshData,
      loading,
      apiConnected,
      apiError,
      refreshFromApi,
    }}>
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  return useContext(SystemContext);
}
