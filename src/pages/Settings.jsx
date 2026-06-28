import { useState } from 'react';
import { Save, Bell, Mail, Clock, Eye } from 'lucide-react';
import { useSystem } from '../hooks/useSystem';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <Icon size={14} className="text-primary-600 dark:text-primary-400" />
        <h2 className="section-heading text-xs font-bold uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Toggle({ id, label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{label}</p>
        {description && <p className="text-[10px] text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button id={id} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`flex-shrink-0 relative inline-flex h-4 w-7 items-center rounded-full ${checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function Settings() {
  const { emails, systemSettings, updateSystemSettings, resetToFreshData } = useSystem();
  const [saved, setSaved] = useState(false);
  const [activeEmail, setActiveEmail] = useState(null);

  const [local, setLocal] = useState({ ...systemSettings });
  const set = (k, v) => setLocal(s => ({ ...s, [k]: v }));

  const handleSave = () => {
    updateSystemSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl text-xs">
      {saved && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg text-green-600 text-xs">
          Settings saved successfully.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-6">
          <Section title="SMTP Email (PHPMailer)" icon={Mail}>
            <div className="space-y-3">
              <p className="text-[10px] text-gray-400">Configure real email delivery via SMTP. Credentials are saved to MySQL.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">SMTP Host</label>
                  <input className="input w-full" value={local.smtpHost || ''} onChange={e => set('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className="label">SMTP Port</label>
                  <input type="number" className="input w-full" value={local.smtpPort || 587} onChange={e => set('smtpPort', parseInt(e.target.value, 10))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">SMTP Username</label>
                  <input className="input w-full" value={local.smtpUser || ''} onChange={e => set('smtpUser', e.target.value)} />
                </div>
                <div>
                  <label className="label">SMTP Password</label>
                  <input type="password" className="input w-full" value={local.smtpPass || ''} onChange={e => set('smtpPass', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From Email</label>
                  <input className="input w-full" value={local.smtpFromEmail || ''} onChange={e => set('smtpFromEmail', e.target.value)} />
                </div>
                <div>
                  <label className="label">From Name</label>
                  <input className="input w-full" value={local.smtpFromName || ''} onChange={e => set('smtpFromName', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Encryption</label>
                <select className="input w-32" value={local.smtpEncryption || 'tls'} onChange={e => set('smtpEncryption', e.target.value)}>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                </select>
              </div>
            </div>
          </Section>

          <Section title="Grace Period & Attendance" icon={Clock}>
            <div className="space-y-4">
              <div>
                <label className="label">Global Grace Period (minutes)</label>
                <p className="text-[10px] text-gray-400 mb-2">
                  Employees can clock in up to this many minutes after shift start without being marked late.
                  Email reminders are sent after this grace period if no clock-in is recorded.
                </p>
                <input
                  type="number"
                  min={0}
                  max={60}
                  className="input w-32"
                  value={local.gracePeriodMinutes}
                  onChange={e => set('gracePeriodMinutes', parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div>
                <label className="label">Admin Passcode</label>
                <input
                  type="password"
                  className="input w-full"
                  value={local.adminPin}
                  onChange={e => set('adminPin', e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section title="Notification Config" icon={Bell}>
            <Toggle id="toggle-missed-clockin" label="Missed clock-in email reminder"
              description={`Email employee if no clock-in after shift start + ${local.gracePeriodMinutes} min grace period.`}
              checked={local.missedClockInReminder} onChange={v => set('missedClockInReminder', v)} />
            <Toggle id="toggle-missed-clockout" label="Clock-out reminders"
              description="Send email if employee has not clocked out after shift end + grace period."
              checked={local.missedClockOutReminder} onChange={v => set('missedClockOutReminder', v)} />
            <Toggle id="toggle-escalate" label="Late check-in escalation"
              checked={local.escalateToManager} onChange={v => set('escalateToManager', v)} />
            <Toggle id="toggle-digest" label="Daily attendance digest"
              checked={local.emailDigest} onChange={v => set('emailDigest', v)} />
            <Toggle id="toggle-leave-alert" label="Leave application emails"
              checked={local.leaveApprovalAlert} onChange={v => set('leaveApprovalAlert', v)} />
          </Section>

          <Section title="Reminder Email Templates" icon={Mail}>
            <div className="space-y-3">
              <div>
                <label className="label">Clock-In Reminder</label>
                <textarea className="input w-full resize-none font-mono text-[11px]" rows={4}
                  value={local.reminderEmailTemplate} onChange={e => set('reminderEmailTemplate', e.target.value)} />
              </div>
              <div>
                <label className="label">Clock-Out Reminder</label>
                <textarea className="input w-full resize-none font-mono text-[11px]" rows={4}
                  value={local.clockOutReminderTemplate} onChange={e => set('clockOutReminderTemplate', e.target.value)} />
              </div>
              <p className="text-[10px] text-gray-400">Placeholders: {'{employee_name}'}, {'{shift_time}'}, {'{date}'}</p>
            </div>
          </Section>

          <div className="flex justify-between items-center">
            <button className="btn-primary" onClick={handleSave}><Save size={13} /> Save Configuration</button>
            <button className="btn-danger text-[10px]" onClick={resetToFreshData}>Reset All Data</button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <Section title="Email Outbox" icon={Mail}>
            <div className="max-h-[500px] overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl divide-y">
              {emails.length === 0 ? (
                <div className="py-12 text-center text-gray-400">No emails sent yet.</div>
              ) : (
                emails.map(mail => (
                  <div key={mail.id} onClick={() => setActiveEmail(mail)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 ${activeEmail?.id === mail.id ? 'bg-primary-50/20' : ''}`}>
                    <div className="flex justify-between">
                      <span className="font-semibold truncate">To: {mail.to}</span>
                      <span className="text-[9px] text-gray-400">{mail.sentAt}</span>
                    </div>
                    <p className="font-bold text-primary-600 mt-1">{mail.subject}</p>
                  </div>
                ))
              )}
            </div>
            {activeEmail && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-950/20 border rounded-xl text-[10px] font-mono relative">
                <button onClick={() => setActiveEmail(null)} className="absolute right-3 top-3"><Eye size={12} /></button>
                <div className="whitespace-pre-line">{activeEmail.body}</div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
