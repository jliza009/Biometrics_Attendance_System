/**
 * Simulated biometric fingerprint utilities.
 * In production, replace with hardware SDK or WebAuthn integration.
 */

export function generateFingerprintTemplate() {
  const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return {
    id: `FP-${segment()}-${segment()}`,
    template: btoa(`${Date.now()}-${Math.random().toString(36)}`),
    enrolledAt: new Date().toISOString(),
  };
}

export function verifyFingerprint(storedTemplate, scannedTemplate) {
  if (!storedTemplate || !scannedTemplate) {
    return { success: false, message: 'No fingerprint enrolled. Contact HR administrator.' };
  }
  if (storedTemplate === scannedTemplate || storedTemplate.id === scannedTemplate) {
    return { success: true, message: 'Biometric verification successful' };
  }
  if (typeof storedTemplate === 'string' && storedTemplate === scannedTemplate) {
    return { success: true, message: 'Biometric verification successful' };
  }
  if (storedTemplate.template && scannedTemplate === storedTemplate.template) {
    return { success: true, message: 'Biometric verification successful' };
  }
  if (storedTemplate.id && scannedTemplate === storedTemplate.id) {
    return { success: true, message: 'Biometric verification successful' };
  }
  return { success: false, message: 'Fingerprint does not match registered template' };
}

export function simulateScan(storedFingerprint) {
  if (!storedFingerprint) return null;
  if (typeof storedFingerprint === 'string') return storedFingerprint;
  return storedFingerprint.template || storedFingerprint.id;
}

export function findEmployeeByFingerprint(employees, scannedValue) {
  return employees.find(emp => {
    if (!emp.fingerprint) return false;
    if (typeof emp.fingerprint === 'string') return emp.fingerprint === scannedValue;
    return emp.fingerprint.id === scannedValue || emp.fingerprint.template === scannedValue;
  });
}
